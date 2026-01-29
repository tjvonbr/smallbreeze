import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { Session } from '@thallesp/nestjs-better-auth';
import { InvitesService } from './invites.service.js';

interface CreateInviteDto {
  email: string;
}

@Controller('api/invites')
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @Post()
  async create(
    @Body() createInviteDto: CreateInviteDto,
    @Session() session: { user?: { id: string; email: string } } | null,
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

    return {
      invite,
      team: {
        id: team.id,
        name: team.name,
      },
    };
  }
}
