import { Injectable } from '@nestjs/common';
import { prisma } from '../lib/prisma.js';
import { parseCalendarUrl, getNextCheckIn } from '../lib/ics-parser.js';

@Injectable()
export class ListingsService {
  async findAllForUser(userId: string) {
    const teamMemberships = await prisma.teamMember.findMany({
      where: { userId },
      select: { teamId: true },
    });

    const teamIds = teamMemberships.map((tm: { teamId: string }) => tm.teamId);

    const listings = await prisma.listing.findMany({
      where: {
        teamId: { in: teamIds },
      },
      include: {
        calendarLinks: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const listingsWithNextCheckIn = await Promise.all(
      listings.map(async (listing: { calendarLinks: { url: string }[] }) => {
        let nextCheckIn: Date | null = null;

        for (const calendarLink of listing.calendarLinks) {
          const events = await parseCalendarUrl(calendarLink.url);
          const checkIn = getNextCheckIn(events);

          if (checkIn && (!nextCheckIn || checkIn < nextCheckIn)) {
            nextCheckIn = checkIn;
          }
        }

        return {
          ...listing,
          nextCheckIn: nextCheckIn?.toISOString() ?? null,
        };
      })
    );

    return listingsWithNextCheckIn;
  }
}
