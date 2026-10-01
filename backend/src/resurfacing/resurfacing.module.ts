import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { ResurfacingService } from './resurfacing.service';
import { ResurfacingController } from './resurfacing.controller';

@Module({
  imports: [NotificationsModule],
  controllers: [ResurfacingController],
  providers: [ResurfacingService],
})
export class ResurfacingModule {}
