import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from './lib/auth.js';
import { UsersModule } from './users/users.module.js';
import { ListingsModule } from './listings/listings.module.js';
import { InvitesModule } from './invites/invites.module.js';
import { PhotosModule } from './photos/photos.module.js';
import { AppService } from './app.service.js';
import { AppController } from './app.controller.js';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    AuthModule.forRoot({ auth }),
    UsersModule,
    ListingsModule,
    InvitesModule,
    PhotosModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
