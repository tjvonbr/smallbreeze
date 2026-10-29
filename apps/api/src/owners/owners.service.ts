import { createHash, randomBytes } from 'crypto';
import { Injectable } from '@nestjs/common';
import { prisma } from '../lib/prisma.js';

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface InviteOwnerData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
}

export interface AcceptInviteData {
  notifyByEmail: boolean;
  notifyBySms: boolean;
  phone?: string | null;
}

export type InviteLookup =
  | { status: 'valid'; invite: NonNullable<Awaited<ReturnType<OwnersService['findInviteByToken']>>> }
  | { status: 'not_found' | 'expired' | 'revoked' | 'accepted' };

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

/** Normalizes to E.164. Assumes US for bare 10-digit numbers. Returns null if unusable. */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (trimmed.startsWith('+')) {
    return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  }
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
}

@Injectable()
export class OwnersService {
  async getTeamIdForUser(userId: string): Promise<string | null> {
    const membership = await prisma.teamMember.findFirst({
      where: { userId },
      select: { teamId: true },
      orderBy: { createdAt: 'asc' },
    });

    return membership?.teamId ?? null;
  }

  async findListingForUser(listingId: string, userId: string) {
    const memberships = await prisma.teamMember.findMany({
      where: { userId },
      select: { teamId: true },
    });

    return prisma.listing.findFirst({
      where: {
        id: listingId,
        teamId: { in: memberships.map((m) => m.teamId) },
      },
      include: { team: true },
    });
  }

  /**
   * Creates (or reuses, by email) the owner for the listing's team, attaches
   * them to the listing, and issues a fresh invite. Any earlier pending invites
   * for the owner are revoked so only the latest link works.
   */
  async inviteOwnerToListing(listingId: string, teamId: string, data: InviteOwnerData) {
    const email = data.email.toLowerCase().trim();
    const phone = normalizePhone(data.phone);

    const token = randomBytes(32).toString('base64url');

    const owner = await prisma.$transaction(async (tx) => {
      const owner = await tx.owner.upsert({
        where: { teamId_email: { teamId, email } },
        create: {
          teamId,
          email,
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          phone,
        },
        update: {
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          ...(phone ? { phone } : {}),
        },
      });

      await tx.listing.update({
        where: { id: listingId },
        data: { ownerId: owner.id },
      });

      await tx.ownerInvite.updateMany({
        where: { ownerId: owner.id, acceptedAt: null, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      await tx.ownerInvite.create({
        data: {
          ownerId: owner.id,
          tokenHash: hashToken(token),
          expiresAt: new Date(Date.now() + INVITE_TTL_MS),
        },
      });

      return owner;
    });

    return { owner, token };
  }

  findInviteByToken(token: string) {
    return prisma.ownerInvite.findUnique({
      where: { tokenHash: hashToken(token) },
      include: {
        owner: {
          include: {
            team: { select: { name: true } },
            listings: { select: { id: true, nickname: true } },
          },
        },
      },
    });
  }

  async lookupInvite(token: string): Promise<InviteLookup> {
    const invite = await this.findInviteByToken(token);

    if (!invite) return { status: 'not_found' };
    if (invite.revokedAt) return { status: 'revoked' };
    if (invite.acceptedAt) return { status: 'accepted' };
    if (invite.expiresAt < new Date()) return { status: 'expired' };

    return { status: 'valid', invite };
  }

  async acceptInvite(inviteId: string, ownerId: string, data: AcceptInviteData) {
    const phone = normalizePhone(data.phone);
    const notifyBySms = data.notifyBySms && !!(phone ?? (await this.getOwnerPhone(ownerId)));
    const now = new Date();

    return prisma.$transaction(async (tx) => {
      await tx.ownerInvite.update({
        where: { id: inviteId },
        data: { acceptedAt: now },
      });

      return tx.owner.update({
        where: { id: ownerId },
        data: {
          notifyByEmail: data.notifyByEmail,
          notifyBySms,
          // Consent is recorded only when the owner opts in themselves here.
          smsConsentAt: notifyBySms ? now : null,
          ...(phone ? { phone } : {}),
        },
      });
    });
  }

  private async getOwnerPhone(ownerId: string) {
    const owner = await prisma.owner.findUnique({
      where: { id: ownerId },
      select: { phone: true },
    });
    return owner?.phone ?? null;
  }
}
