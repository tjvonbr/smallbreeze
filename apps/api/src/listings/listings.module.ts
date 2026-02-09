import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ListingsService } from './listings.service.js';
import { ListingsController } from './listings.controller.js';
import { NewReservationProcessor } from './new-reservation.processor.js';

@Module({
  imports: [BullModule.registerQueue({ name: 'new-reservation' })],
  controllers: [ListingsController],
  providers: [ListingsService, NewReservationProcessor],
})
export class ListingsModule {}
