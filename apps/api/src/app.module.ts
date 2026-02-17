import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from './lib/auth.js';
import { UsersModule } from './users/users.module.js';
import { ListingsModule } from './listings/listings.module.js';
import { InvitesModule } from './invites/invites.module.js';
import { PhotosModule } from './photos/photos.module.js';
import { TasksModule } from './tasks/tasks.module.js';
import { AppService } from './app.service.js';
import { AppController } from './app.controller.js';

@Module({
  imports: [
    BullModule.forRoot({
      connection: { url: process.env.REDIS_URL },
    }),
    ScheduleModule.forRoot(),
    AuthModule.forRoot({ auth }),
    UsersModule,
    ListingsModule,
    InvitesModule,
    PhotosModule,
    TasksModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
