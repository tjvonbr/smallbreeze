import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { Session } from '@thallesp/nestjs-better-auth';
import { ListingsService, CalendarEvent } from './listings.service.js';

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
}
