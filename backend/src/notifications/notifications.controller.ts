import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BetterAuthGuard } from '../guards/better-auth.guard';
import {
  NotificationsService,
  RegisterDeviceTokenDto,
  SendPushDto,
} from './notifications.service';

@Controller('notifications')
@UseGuards(BetterAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.notificationsService.getUserNotifications(req.user.id);
  }

  /**
   * There was previously no way to mark a notification read anywhere in the
   * API, so `isRead` was written by nothing and the bell's badge could only
   * grow for the life of the account.
   */
  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  markRead(@Req() req: any, @Param('id') id: string) {
    return this.notificationsService.markRead(req.user.id, id);
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  markAllRead(@Req() req: any) {
    return this.notificationsService.markAllRead(req.user.id);
  }

  @Post('device-token')
  @HttpCode(HttpStatus.OK)
  registerDeviceToken(@Req() req: any, @Body() dto: RegisterDeviceTokenDto) {
    return this.notificationsService.registerDeviceToken(req.user.id, dto);
  }

  @Delete('device-token/:token')
  @HttpCode(HttpStatus.OK)
  removeDeviceToken(@Req() req: any, @Param('token') token: string) {
    return this.notificationsService.removeDeviceToken(req.user.id, token);
  }

  @Post('push-test')
  @HttpCode(HttpStatus.OK)
  sendTestPush(@Req() req: any, @Body() body: { title?: string; body?: string }) {
    return this.notificationsService.sendPushToUser({
      userId: req.user.id,
      title: body.title || 'Book Buddy by VPD Notification',
      body: body.body || 'Test push notification delivered successfully.',
    });
  }
}
