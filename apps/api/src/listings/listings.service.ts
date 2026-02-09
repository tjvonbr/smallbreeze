import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Cron } from '@nestjs/schedule';
import { Queue } from 'bullmq';
import { prisma } from '../lib/prisma.js';
import { parseCalendarUrl } from '../lib/ics-parser.js';
import { geocodeAddress, isGeocodingEnabled } from '../lib/geocoding.js';
import type { NewReservationJobData } from './new-reservation.processor.js';

interface CreateListingData {
  nickname: string;
  streetAddress: string;
  streetAddress2?: string | null;
  city: string;
  state: string;
  zip: string;
  country: string;
}

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

const ADDRESS_FIELDS = ['streetAddress', 'city', 'state', 'zip', 'country'] as const;

@Injectable()
export class ListingsService {
  private readonly logger = new Logger(ListingsService.name);

  constructor(
    @InjectQueue('new-reservation')
    private readonly newReservationQueue: Queue<NewReservationJobData>,
  ) {}

  @Cron('*/15 * * * *')
  async syncAllReservations() {
    const calendarLinks = await prisma.calendarLink.findMany({
      select: { id: true, listingId: true, url: true },
    });

    for (const link of calendarLinks) {
      try {
        await this.syncReservationsForLink(link.id, link.listingId, link.url);
      } catch (error) {
        this.logger.error(`Failed to sync calendar link ${link.id}`, error);
      }
    }
  }

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
      listings.map(async (listing) => {
        const nextCheckIn = await this.getNextCheckInFromDb(listing.id);
        return {
          ...listing,
          nextCheckIn,
        };
      })
    );

    return listingsWithNextCheckIn;
  }

  async create(userId: string, data: CreateListingData) {
    // Get the user's first team
    let teamMembership = await prisma.teamMember.findFirst({
      where: { userId },
      select: { teamId: true },
    });

    // If user doesn't have a team, create one
    if (!teamMembership) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });

      if (!user) {
        return null;
      }

      // Create a new team for the user
      const team = await prisma.team.create({
        data: {
          name: `${user.firstName}'s Team`,
          memberships: {
            create: {
              userId,
              role: 'ADMIN',
            },
          },
        },
      });

      teamMembership = { teamId: team.id };
    }

    // Create the listing
    const listing = await prisma.listing.create({
      data: {
        nickname: data.nickname,
        streetAddress: data.streetAddress,
        streetAddress2: data.streetAddress2 || null,
        city: data.city,
        state: data.state,
        zip: data.zip,
        country: data.country,
        teamId: teamMembership.teamId,
      },
      include: {
        calendarLinks: true,
      },
    });

    return {
      ...listing,
      nextCheckIn: null,
    };
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

    // Check if any address fields are being updated
    const addressFieldsChanged = ADDRESS_FIELDS.some(
      (field) => data[field] !== undefined && data[field] !== existingListing[field]
    );

    // Prepare update data
    let updateData: UpdateListingData & { latitude?: number | null; longitude?: number | null } = { ...data };

    // If address changed and geocoding is enabled, update coordinates
    if (addressFieldsChanged && isGeocodingEnabled()) {
      const address = {
        streetAddress: data.streetAddress ?? existingListing.streetAddress,
        city: data.city ?? existingListing.city,
        state: data.state ?? existingListing.state,
        zip: data.zip ?? existingListing.zip,
        country: data.country ?? existingListing.country,
      };

      const result = await geocodeAddress(
        address.streetAddress,
        address.city,
        address.state,
        address.zip,
        address.country
      );

      if (result.coordinates) {
        updateData.latitude = result.coordinates.latitude;
        updateData.longitude = result.coordinates.longitude;
      } else if (result.error) {
        console.warn(`Geocoding failed for listing ${listingId}: ${result.error}`);
      }
    }

    // Update the listing
    const updatedListing = await prisma.listing.update({
      where: { id: listingId },
      data: updateData,
      include: {
        calendarLinks: true,
      },
    });

    const nextCheckIn = await this.getNextCheckInFromDb(listingId);

    return {
      ...updatedListing,
      nextCheckIn,
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
    });

    if (!listing) {
      return null;
    }

    const reservations = await prisma.reservation.findMany({
      where: { listingId, cancelledAt: null },
      orderBy: { startDate: 'asc' },
    });

    return reservations.map((r) => ({
      id: r.id,
      summary: r.summary,
      description: r.description,
      start: r.startDate.toISOString(),
      end: r.endDate.toISOString(),
      location: r.location,
      allDay: r.allDay,
    }));
  }

  /**
   * Geocode a listing's address and update its coordinates.
   * Useful for backfilling existing listings once geocoding is configured.
   */
  async geocodeListing(listingId: string, userId: string) {
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
    });

    if (!listing) {
      return null;
    }

    if (!isGeocodingEnabled()) {
      return { listing, geocoded: false, error: 'Geocoding not configured' };
    }

    const result = await geocodeAddress(
      listing.streetAddress,
      listing.city,
      listing.state,
      listing.zip,
      listing.country
    );

    if (!result.coordinates) {
      return { listing, geocoded: false, error: result.error };
    }

    const updatedListing = await prisma.listing.update({
      where: { id: listingId },
      data: {
        latitude: result.coordinates.latitude,
        longitude: result.coordinates.longitude,
      },
    });

    return { listing: updatedListing, geocoded: true };
  }

  async addCalendarLink(listingId: string, userId: string, url: string) {
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
    });

    if (!listing) {
      return null;
    }

    const calendarLink = await prisma.calendarLink.create({
      data: {
        url,
        listingId,
      },
    });

    // Sync reservations from the new calendar link
    await this.syncReservationsForLink(calendarLink.id, listingId, url);

    // Return the updated listing with all calendar links
    const updatedListing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { calendarLinks: true },
    });

    const nextCheckIn = await this.getNextCheckInFromDb(listingId);

    return {
      calendarLink,
      listing: {
        ...updatedListing!,
        nextCheckIn,
      },
    };
  }

  async deleteCalendarLink(listingId: string, linkId: string, userId: string) {
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
    });

    if (!listing) {
      return null;
    }

    // Verify the link belongs to this listing
    const link = await prisma.calendarLink.findFirst({
      where: { id: linkId, listingId },
    });

    if (!link) {
      return null;
    }

    await prisma.calendarLink.delete({
      where: { id: linkId },
    });

    // Return the updated listing
    const updatedListing = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { calendarLinks: true },
    });

    const nextCheckIn = await this.getNextCheckInFromDb(listingId);

    return {
      ...updatedListing!,
      nextCheckIn,
    };
  }

  private async syncReservationsForLink(calendarLinkId: string, listingId: string, url: string) {
    const events = await parseCalendarUrl(url);

    // Fetch existing icalUids for this calendar link to detect new reservations
    const existingReservations = await prisma.reservation.findMany({
      where: { calendarLinkId },
      select: { icalUid: true },
    });
    const existingUids = new Set(existingReservations.map((r) => r.icalUid));

    const newReservations: NewReservationJobData[] = [];
    const icalUids: string[] = [];
    for (const event of events) {
      icalUids.push(event.id);
      const isNew = !existingUids.has(event.id);

      const reservation = await prisma.reservation.upsert({
        where: { calendarLinkId_icalUid: { calendarLinkId, icalUid: event.id } },
        create: {
          listingId,
          calendarLinkId,
          icalUid: event.id,
          summary: event.summary,
          description: event.description,
          startDate: event.start,
          endDate: event.end,
          location: event.location,
          allDay: event.allDay,
        },
        update: {
          summary: event.summary,
          description: event.description,
          startDate: event.start,
          endDate: event.end,
          location: event.location,
          allDay: event.allDay,
        },
      });

      if (isNew) {
        newReservations.push({
          reservationId: reservation.id,
          listingId,
          calendarLinkId,
          icalUid: event.id,
          summary: event.summary ?? null,
          startDate: event.start.toISOString(),
          endDate: event.end.toISOString(),
        });
      }
    }

    // Enqueue jobs for new reservations
    for (const data of newReservations) {
      await this.newReservationQueue.add('new-reservation', data);
    }

    // Soft-delete reservations from this link that are no longer in the feed
    await prisma.reservation.updateMany({
      where: { calendarLinkId, icalUid: { notIn: icalUids }, cancelledAt: null },
      data: { cancelledAt: new Date() },
    });

    // Restore any previously cancelled reservations that reappeared in the feed
    await prisma.reservation.updateMany({
      where: { calendarLinkId, icalUid: { in: icalUids }, cancelledAt: { not: null } },
      data: { cancelledAt: null },
    });
  }

  private async getNextCheckInFromDb(listingId: string): Promise<string | null> {
    const next = await prisma.reservation.findFirst({
      where: { listingId, cancelledAt: null, startDate: { gt: new Date() } },
      orderBy: { startDate: 'asc' },
      select: { startDate: true },
    });
    return next?.startDate.toISOString() ?? null;
  }
}
