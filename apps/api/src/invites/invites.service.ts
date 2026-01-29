import { Injectable } from '@nestjs/common';
import { prisma } from '../lib/prisma.js';

@Injectable()
export class InvitesService {
  async createInvite(email: string, teamId: string) {
    const invite = await prisma.invite.create({
      data: {
        email,
        teamId,
      },
    });

    return invite;
  }

  async getTeamIdForUser(userId: string): Promise<string | null> {
    const membership = await prisma.teamMember.findFirst({
      where: { userId },
      select: { teamId: true },
      orderBy: { createdAt: 'asc' },
    });

    return membership?.teamId ?? null;
  }

  async getTeam(teamId: string) {
    return prisma.team.findUnique({
      where: { id: teamId },
    });
  }
}
