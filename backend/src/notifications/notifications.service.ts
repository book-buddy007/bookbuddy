import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

export interface RegisterDeviceTokenDto {
  deviceToken: string;
  platform: 'ios' | 'android' | 'web';
  deviceName?: string;
}

export interface SendPushDto {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, any>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly expoPushUrl = 'https://exp.host/--/api/v2/push/send';

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Register or update a native device push token for a user.
   */
  async registerDeviceToken(userId: string, dto: RegisterDeviceTokenDto) {
    const { deviceToken, platform, deviceName } = dto;

    const tokenRecord = await this.prisma.deviceToken.upsert({
      where: { deviceToken },
      update: {
        userId,
        platform,
        deviceName,
        isActive: true,
        lastUsedAt: new Date(),
      },
      create: {
        userId,
        deviceToken,
        platform,
        deviceName,
        isActive: true,
      },
    });

    this.logger.log(
      `Registered device push token for user ${userId} (${platform})`,
    );
    return tokenRecord;
  }

  /**
   * De-register a device push token on logout.
   */
  async removeDeviceToken(userId: string, deviceToken: string) {
    await this.prisma.deviceToken.updateMany({
      where: { userId, deviceToken },
      data: { isActive: false },
    });
    return { success: true };
  }

  /**
   * Send a push notification to all active devices of a user via Expo Push API.
   */
  async sendPushToUser(dto: SendPushDto) {
    const { userId, title, body, data } = dto;

    const devices = await this.prisma.deviceToken.findMany({
      where: { userId, isActive: true },
    });

    if (devices.length === 0) {
      this.logger.warn(`No active device tokens found for user ${userId}`);
      return { sentCount: 0 };
    }

    const messages = devices.map((d) => ({
      to: d.deviceToken,
      sound: 'default',
      title,
      body,
      data: data || {},
    }));

    try {
      const response = await axios.post(this.expoPushUrl, messages, {
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
      });

      this.logger.log(
        `Dispatched push notification to ${devices.length} device(s) for user ${userId}`,
      );
      return { sentCount: devices.length, result: response.data };
    } catch (error: any) {
      this.logger.error(
        `Failed to send Expo push notification: ${error?.message}`,
      );
      return { sentCount: 0, error: error?.message };
    }
  }

  /**
   * Get in-app notifications for user.
   */
  async getUserNotifications(userId: string) {
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const unreadCount = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });

    return {
      data: notifications,
      unreadCount,
      userId,
    };
  }

  /**
   * Mark one notification read.
   *
   * `updateMany` rather than `update` is the authorization: scoping the WHERE
   * by userId means a caller cannot flip someone else's row by guessing an id,
   * and a miss returns `{ count: 0 }` instead of throwing on a row that exists
   * but isn't theirs — which would leak that the id is real.
   */
  async markRead(userId: string, notificationId: string) {
    const { count } = await this.prisma.notification.updateMany({
      where: { id: notificationId, userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { updated: count };
  }

  /** Mark every unread notification for this user read. */
  async markAllRead(userId: string) {
    const { count } = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { updated: count };
  }
}
