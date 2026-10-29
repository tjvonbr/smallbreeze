import { Module } from '@nestjs/common';
import { ListingOwnerController, OwnerInvitesController } from './owners.controller.js';
import { OwnersService } from './owners.service.js';

@Module({
  controllers: [ListingOwnerController, OwnerInvitesController],
  providers: [OwnersService],
})
export class OwnersModule {}
