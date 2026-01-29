import { Module } from '@nestjs/common';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from './lib/auth.js';
import { UsersModule } from './users/users.module.js';
import { ListingsModule } from './listings/listings.module.js';
import { InvitesModule } from './invites/invites.module.js';
import { AppService } from './app.service.js';
import { AppController } from './app.controller.js';

@Module({
  imports: [
    AuthModule.forRoot({ auth }),
    UsersModule,
    ListingsModule,
    InvitesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
