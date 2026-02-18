import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { Session } from '@thallesp/nestjs-better-auth';
import { ListingsService } from './listings.service.js';

interface CreateListingDto {
  nickname: string;
  streetAddress: string;
  streetAddress2?: string | null;
  city: string;
  state: string;
  zip: string;
  country: string;
}

interface UpdateListingDto {
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
  defaultCheckInTime?: string;
  defaultCheckOutTime?: string;
}

@Controller('api/listings')
export class ListingsController {
  constructor(private readonly listingsService: ListingsService) {}

  @Get()
  async findAll(@Session() session: { user?: { id: string } } | null) {
    if (!session?.user?.id) {
      throw new UnauthorizedException('Authentication required');
    }

    const listings = await this.listingsService.findAllForUser(session.user.id);

    return { listings };
  }

  @Post()
  async create(
    @Body() createListingDto: CreateListingDto,
    @Session() session: { user?: { id: string } } | null,
  ) {
    if (!session?.user?.id) {
      throw new UnauthorizedException('Authentication required');
    }

    const listing = await this.listingsService.create(
      session.user.id,
      createListingDto,
    );

    if (!listing) {
      throw new BadRequestException('Failed to create listing. Make sure you belong to a team.');
    }

    return { listing };
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateListingDto: UpdateListingDto,
    @Session() session: { user?: { id: string } } | null,
  ) {
    if (!session?.user?.id) {
      throw new UnauthorizedException('Authentication required');
    }

    const listing = await this.listingsService.update(
      id,
      session.user.id,
      updateListingDto,
    );

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    return { listing };
  }

  @Get(':id/reservations')
  async getReservations(
    @Param('id') id: string,
    @Session() session: { user?: { id: string } } | null,
  ) {
    if (!session?.user?.id) {
      throw new UnauthorizedException('Authentication required');
    }

    const reservations = await this.listingsService.getReservations(
      id,
      session.user.id,
    );

    if (!reservations) {
      throw new NotFoundException('Listing not found');
    }

    return { reservations };
  }

  @Post(':id/geocode')
  async geocode(
    @Param('id') id: string,
    @Session() session: { user?: { id: string } } | null,
  ) {
    if (!session?.user?.id) {
      throw new UnauthorizedException('Authentication required');
    }

    const result = await this.listingsService.geocodeListing(
      id,
      session.user.id,
    );

    if (!result) {
      throw new NotFoundException('Listing not found');
    }

    if (!result.geocoded) {
      throw new BadRequestException(result.error || 'Geocoding failed');
    }

    return { listing: result.listing };
  }

  @Post(':id/calendar-links')
  async addCalendarLink(
    @Param('id') id: string,
    @Body() body: { url: string },
    @Session() session: { user?: { id: string } } | null,
  ) {
    if (!session?.user?.id) {
      throw new UnauthorizedException('Authentication required');
    }

    if (!body.url) {
      throw new BadRequestException('URL is required');
    }

    const result = await this.listingsService.addCalendarLink(
      id,
      session.user.id,
      body.url,
    );

    if (!result) {
      throw new NotFoundException('Listing not found');
    }

    return result;
  }

  @Delete(':id/calendar-links/:linkId')
  async deleteCalendarLink(
    @Param('id') id: string,
    @Param('linkId') linkId: string,
    @Session() session: { user?: { id: string } } | null,
  ) {
    if (!session?.user?.id) {
      throw new UnauthorizedException('Authentication required');
    }

    const listing = await this.listingsService.deleteCalendarLink(
      id,
      linkId,
      session.user.id,
    );

    if (!listing) {
      throw new NotFoundException('Listing or calendar link not found');
    }

    return { listing };
  }
}
