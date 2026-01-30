import { Injectable } from '@nestjs/common';
import { prisma } from '../lib/prisma.js';
import { parseCalendarUrl, getNextCheckIn, CalendarEvent } from '../lib/ics-parser.js';
import { geocodeAddress, isGeocodingEnabled } from '../lib/geocoding.js';

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

const ADDRESS_FIELDS = ['streetAddress', 'city', 'state', 'zip', 'country'] as const;

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
}
