import { BadRequestException, Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { BetterAuthGuard } from '../guards/better-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { NotificationPreferences, UserPreferencesService } from './user-preferences.service';
import { isAnswerLanguage } from '../common/language/answer-language';

const READER_ROLES = ['super-admin', 'admin', 'librarian', 'teacher', 'student'];
const NOTIFICATION_KEYS: (keyof NotificationPreferences)[] = ['studyReminders', 'push'];

/**
 * Self-scoped preference read/write. Identity comes from the session
 * (`req.user.id`), never a body/param, so it can't be pointed at another user —
 * same posture as VartaActivityController on the sibling `students/me` route.
 */
@UseGuards(BetterAuthGuard, RolesGuard)
@Controller('students/me/preferences')
export class UserPreferencesController {
  constructor(private preferences: UserPreferencesService) {}

  @Get()
  @Roles(...READER_ROLES)
  async get(@Req() req: any) {
    const [answerLanguage, notifications] = await Promise.all([
      this.preferences.getAnswerLanguage(req.user.id),
      this.preferences.getNotificationPreferences(req.user.id),
    ]);
    return { answerLanguage, notifications };
  }

  /** Partial update: send `answerLanguage`, `notifications`, or both. */
  @Patch()
  @Roles(...READER_ROLES)
  async patch(
    @Body('answerLanguage') answerLanguage: unknown,
    @Body('notifications') notifications: unknown,
    @Req() req: any,
  ) {
    if (answerLanguage === undefined && notifications === undefined) {
      throw new BadRequestException('Nothing to update');
    }
    if (answerLanguage !== undefined && !isAnswerLanguage(answerLanguage)) {
      throw new BadRequestException('answerLanguage must be one of: en, hi');
    }

    let notificationPatch: Partial<NotificationPreferences> | undefined;
    if (notifications !== undefined) {
      if (!notifications || typeof notifications !== 'object' || Array.isArray(notifications)) {
        throw new BadRequestException('notifications must be an object');
      }
      notificationPatch = {};
      for (const [k, v] of Object.entries(notifications as Record<string, unknown>)) {
        if (!NOTIFICATION_KEYS.includes(k as keyof NotificationPreferences) || typeof v !== 'boolean') {
          throw new BadRequestException(`notifications.${k} must be one of ${NOTIFICATION_KEYS.join(', ')} with a true/false value`);
        }
        notificationPatch[k as keyof NotificationPreferences] = v;
      }
    }

    const userId = req.user.id;
    // Sequential, not parallel: both are read-modify-writes of the same metadata bucket.
    const lang = answerLanguage !== undefined
      ? await this.preferences.setAnswerLanguage(userId, answerLanguage as any)
      : await this.preferences.getAnswerLanguage(userId);
    const notif = notificationPatch
      ? await this.preferences.setNotificationPreferences(userId, notificationPatch)
      : await this.preferences.getNotificationPreferences(userId);
    return { answerLanguage: lang, notifications: notif };
  }
}
