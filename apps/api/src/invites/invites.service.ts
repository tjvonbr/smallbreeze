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

  async getInvitesForTeam(teamId: string) {
    return prisma.invite.findMany({
      where: { teamId, acceptedAt: null },
      orderBy: { createdAt: 'desc' },
    });
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

  async getInvite(inviteId: string) {
    return prisma.invite.findUnique({
      where: { id: inviteId },
    });
  }

  async deleteInvite(inviteId: string) {
    return prisma.invite.delete({
      where: { id: inviteId },
    });
  }
}
