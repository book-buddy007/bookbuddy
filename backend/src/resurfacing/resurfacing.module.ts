import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { UserPreferencesModule } from '../user-preferences/user-preferences.module';
import { ResurfacingService } from './resurfacing.service';
import { ResurfacingController } from './resurfacing.controller';

@Module({
  imports: [NotificationsModule, UserPreferencesModule],
  controllers: [ResurfacingController],
  providers: [ResurfacingService],
})
export class ResurfacingModule {}
