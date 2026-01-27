import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
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
}
