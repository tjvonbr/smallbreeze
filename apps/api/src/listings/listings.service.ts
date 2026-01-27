import { Injectable } from '@nestjs/common';
import { prisma } from '../lib/prisma.js';
import { parseCalendarUrl, getNextCheckIn, CalendarEvent } from '../lib/ics-parser.js';

export type { CalendarEvent };

interface UpdateListingData {
  nickname?: string;
  streetAddress?: string;
  streetAddress2?: string | null;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  wifiNetwork?: string | null;
  wifiPassword?: string | null;
  accessNotes?: string | null;
}

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

  async update(listingId: string, userId: string, data: UpdateListingData) {
    // First verify the user has access to this listing via team membership
    const teamMemberships = await prisma.teamMember.findMany({
      where: { userId },
      select: { teamId: true },
    });

    const teamIds = teamMemberships.map((tm: { teamId: string }) => tm.teamId);

    // Check if the listing exists and belongs to a team the user is a member of
    const existingListing = await prisma.listing.findFirst({
      where: {
        id: listingId,
        teamId: { in: teamIds },
      },
    });

    if (!existingListing) {
      return null;
    }

    // Update the listing
    const updatedListing = await prisma.listing.update({
      where: { id: listingId },
      data,
      include: {
        calendarLinks: true,
      },
    });

    // Calculate next check-in
    let nextCheckIn: Date | null = null;

    for (const calendarLink of updatedListing.calendarLinks) {
      const events = await parseCalendarUrl(calendarLink.url);
      const checkIn = getNextCheckIn(events);

      if (checkIn && (!nextCheckIn || checkIn < nextCheckIn)) {
        nextCheckIn = checkIn;
      }
    }

    return {
      ...updatedListing,
      nextCheckIn: nextCheckIn?.toISOString() ?? null,
    };
  }

  async getReservations(listingId: string, userId: string) {
    // Verify user has access to this listing
    const teamMemberships = await prisma.teamMember.findMany({
      where: { userId },
      select: { teamId: true },
    });

    const teamIds = teamMemberships.map((tm: { teamId: string }) => tm.teamId);

    const listing = await prisma.listing.findFirst({
      where: {
        id: listingId,
        teamId: { in: teamIds },
      },
      include: {
        calendarLinks: true,
      },
    });

    if (!listing) {
      return null;
    }

    // Fetch all events from all calendar links
    const allEvents: CalendarEvent[] = [];

    for (const calendarLink of listing.calendarLinks) {
      const events = await parseCalendarUrl(calendarLink.url);
      allEvents.push(...events);
    }

    // Sort by start date and return serializable format
    return allEvents
      .sort((a, b) => a.start.getTime() - b.start.getTime())
      .map((event) => ({
        id: event.id,
        summary: event.summary,
        description: event.description,
        start: event.start.toISOString(),
        end: event.end.toISOString(),
        location: event.location,
        allDay: event.allDay,
      }));
  }
}
