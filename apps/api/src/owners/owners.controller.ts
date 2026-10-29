import {
  BadRequestException,
  Body,
  Controller,
  Get,
  GoneException,
  NotFoundException,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { AllowAnonymous, Session } from '@thallesp/nestjs-better-auth';
import { OwnersService, normalizePhone } from './owners.service.js';
import { getResend } from '../lib/resend.js';
import OwnerInviteEmail from '../lib/emails/owner-invite.js';

interface InviteOwnerDto {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
}

interface AcceptInviteDto {
  notifyByEmail: boolean;
  notifyBySms: boolean;
  phone?: string | null;
}

interface SessionUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  name?: string;
}

@Controller('api/listings/:listingId/owner')
export class ListingOwnerController {
  constructor(private readonly ownersService: OwnersService) {}

  @Post()
  async invite(
    @Param('listingId') listingId: string,
    @Body() dto: InviteOwnerDto,
    @Session() session: { user?: SessionUser } | null,
  ) {
    if (!session?.user?.id) {
      throw new UnauthorizedException('Authentication required');
    }

    const firstName = dto.firstName?.trim();
    const lastName = dto.lastName?.trim();
    const email = dto.email?.trim();

    if (!firstName || !lastName || !email) {
      throw new BadRequestException('First name, last name, and email are required');
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('Invalid email format');
    }

    if (dto.phone?.trim() && !normalizePhone(dto.phone)) {
      throw new BadRequestException('Invalid phone number');
    }

    const listing = await this.ownersService.findListingForUser(listingId, session.user.id);

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    const { owner, token } = await this.ownersService.inviteOwnerToListing(
      listing.id,
      listing.teamId,
      { firstName, lastName, email, phone: dto.phone },
    );

    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/owner-invite/${token}`;
    const invitedByName =
      session.user.firstName || session.user.name?.split(' ')[0] || 'Your property manager';

    const resend = getResend();
    if (resend) {
      try {
        await resend.emails.send({
          from: `${process.env.EMAIL_SENDER_NAME} <${process.env.EMAIL_SENDER_ADDRESS}>`,
          to: owner.email,
          subject: `Stay up to date on ${listing.nickname}`,
          react: OwnerInviteEmail({
            ownerFirstName: owner.firstName,
            invitedByName,
            teamName: listing.team.name,
            listingNickname: listing.nickname,
            inviteLink,
          }),
        });
      } catch (err) {
        console.error('Failed to send owner invite email:', err);
        // Don't fail the request - the owner is attached and the invite can be resent.
      }
    } else {
      console.warn('RESEND_API_KEY missing; owner invite email not sent.', {
        ownerId: owner.id,
        ...(process.env.NODE_ENV !== 'production' && { inviteLink }),
      });
    }

    return { owner };
  }
}

@Controller('api/owner-invites')
export class OwnerInvitesController {
  constructor(private readonly ownersService: OwnersService) {}

  @Get(':token')
  @AllowAnonymous()
  async lookup(@Param('token') token: string) {
    const result = await this.ownersService.lookupInvite(token);

    if (result.status === 'not_found') {
      throw new NotFoundException('Invite not found');
    }

    if (result.status !== 'valid') {
      throw new GoneException({ message: 'Invite is no longer valid', status: result.status });
    }

    const { owner } = result.invite;

    return {
      owner: {
        firstName: owner.firstName,
        email: owner.email,
        hasPhone: !!owner.phone,
      },
      teamName: owner.team.name,
      listings: owner.listings,
    };
  }

  @Post(':token/accept')
  @AllowAnonymous()
  async accept(@Param('token') token: string, @Body() dto: AcceptInviteDto) {
    const result = await this.ownersService.lookupInvite(token);

    if (result.status === 'not_found') {
      throw new NotFoundException('Invite not found');
    }

    if (result.status !== 'valid') {
      throw new GoneException({ message: 'Invite is no longer valid', status: result.status });
    }

    if (dto.phone?.trim() && !normalizePhone(dto.phone)) {
      throw new BadRequestException('Invalid phone number');
    }

    const { invite } = result;
    const hasPhone = !!invite.owner.phone || !!normalizePhone(dto.phone);

    if (dto.notifyBySms && !hasPhone) {
      throw new BadRequestException('A phone number is required for text message updates');
    }

    await this.ownersService.acceptInvite(invite.id, invite.ownerId, {
      notifyByEmail: !!dto.notifyByEmail,
      notifyBySms: !!dto.notifyBySms,
      phone: dto.phone,
    });

    return { success: true };
  }
}
