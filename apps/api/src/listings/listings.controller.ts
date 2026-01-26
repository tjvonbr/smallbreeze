import { Controller, Get, UnauthorizedException } from '@nestjs/common';
import { Session } from '@thallesp/nestjs-better-auth';
import { ListingsService } from './listings.service.js';

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
}
