import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { Session } from '@thallesp/nestjs-better-auth';
import { InvitesService } from './invites.service.js';
import { getResend } from '../lib/resend.js';
import TeamInviteEmail from '../lib/emails/team-invite.js';

interface CreateInviteDto {
  email: string;
}

interface SessionUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  name?: string;
}

@Controller('api/invites')
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @Get()
  async findAll(@Session() session: { user?: SessionUser } | null) {
    if (!session?.user?.id) {
      throw new UnauthorizedException('Authentication required');
    }

    const teamId = await this.invitesService.getTeamIdForUser(session.user.id);

    if (!teamId) {
      throw new BadRequestException('No team found for user');
    }

    const invites = await this.invitesService.getInvitesForTeam(teamId);

    return { invites };
  }

  @Post()
  async create(
    @Body() createInviteDto: CreateInviteDto,
    @Session() session: { user?: SessionUser } | null,
  ) {
    if (!session?.user?.id) {
      throw new UnauthorizedException('Authentication required');
    }

    const { email } = createInviteDto;

    if (!email || !email.trim()) {
      throw new BadRequestException('Email is required');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      throw new BadRequestException('Invalid email format');
    }

    const teamId = await this.invitesService.getTeamIdForUser(session.user.id);

    if (!teamId) {
      throw new BadRequestException('No team found for user');
    }

    const team = await this.invitesService.getTeam(teamId);

    if (!team) {
      throw new BadRequestException('Team not found');
    }

    const invite = await this.invitesService.createInvite(
      email.toLowerCase().trim(),
      teamId,
    );

    // Send invite email
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/sign-up?email=${encodeURIComponent(email)}&inviteId=${invite.id}`;

    const firstName = session.user.firstName || session.user.name?.split(' ')[0] || 'A team member';
    const lastName = session.user.lastName || session.user.name?.split(' ').slice(1).join(' ') || '';

    const resend = getResend();
    if (resend) {
      try {
        await resend.emails.send({
          from: `${process.env.EMAIL_SENDER_NAME} <${process.env.EMAIL_SENDER_ADDRESS}>`,
          to: email.toLowerCase().trim(),
          subject: `Join ${firstName} on smallbreeze!`,
          react: TeamInviteEmail({
            invitedByFirstName: firstName,
            invitedByLastName: lastName,
            invitedByEmail: session.user.email,
            teamName: team.name,
            inviteLink,
            appStoreUrl: process.env.APP_STORE_URL,
            playStoreUrl: process.env.PLAY_STORE_URL,
          }),
        });
      } catch (err) {
        console.error('Failed to send invite email:', err);
        // Don't fail the request if email fails - invite was still created
      }
    } else {
      console.warn('RESEND_API_KEY missing; invite email not sent. Invite still created.', { inviteId: invite.id });
    }

    return {
      invite,
      team: {
        id: team.id,
        name: team.name,
      },
    };
  }

  @Post(':id/resend')
  async resend(
    @Param('id') id: string,
    @Session() session: { user?: SessionUser } | null,
  ) {
    if (!session?.user?.id) {
      throw new UnauthorizedException('Authentication required');
    }

    const invite = await this.invitesService.getInvite(id);

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    // Verify user has access to this invite's team
    const teamId = await this.invitesService.getTeamIdForUser(session.user.id);

    if (!teamId || teamId !== invite.teamId) {
      throw new UnauthorizedException('You do not have permission to resend this invite');
    }

    const team = await this.invitesService.getTeam(teamId);

    if (!team) {
      throw new BadRequestException('Team not found');
    }

    // Send invite email
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/sign-up?email=${encodeURIComponent(invite.email)}&inviteId=${invite.id}`;

    const firstName = session.user.firstName || session.user.name?.split(' ')[0] || 'A team member';
    const lastName = session.user.lastName || session.user.name?.split(' ').slice(1).join(' ') || '';

    const resend = getResend();
    if (resend) {
      try {
        await resend.emails.send({
          from: `${process.env.EMAIL_SENDER_NAME} <${process.env.EMAIL_SENDER_ADDRESS}>`,
          to: invite.email,
          subject: `Join ${firstName} on smallbreeze!`,
          react: TeamInviteEmail({
            invitedByFirstName: firstName,
            invitedByLastName: lastName,
            invitedByEmail: session.user.email,
            teamName: team.name,
            inviteLink,
            appStoreUrl: process.env.APP_STORE_URL,
            playStoreUrl: process.env.PLAY_STORE_URL,
          }),
        });
      } catch (err) {
        console.error('Failed to resend invite email:', err);
        throw new BadRequestException('Failed to send email');
      }
    } else {
      throw new BadRequestException('Email service not configured');
    }

    return { success: true };
  }

  @Delete(':id')
  async delete(
    @Param('id') id: string,
    @Session() session: { user?: SessionUser } | null,
  ) {
    if (!session?.user?.id) {
      throw new UnauthorizedException('Authentication required');
    }

    const invite = await this.invitesService.getInvite(id);

    if (!invite) {
      throw new NotFoundException('Invite not found');
    }

    // Verify user has access to this invite's team
    const teamId = await this.invitesService.getTeamIdForUser(session.user.id);

    if (!teamId || teamId !== invite.teamId) {
      throw new UnauthorizedException('You do not have permission to delete this invite');
    }

    await this.invitesService.deleteInvite(id);

    return { success: true };
  }
}
