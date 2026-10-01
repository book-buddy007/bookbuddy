import { BadRequestException, Body, Controller, Get, Patch, Req, UseGuards } from '@nestjs/common';
import { BetterAuthGuard } from '../guards/better-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserPreferencesService } from './user-preferences.service';
import { isAnswerLanguage } from '../common/language/answer-language';

const READER_ROLES = ['super-admin', 'admin', 'librarian', 'teacher', 'student'];

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
    return { answerLanguage: await this.preferences.getAnswerLanguage(req.user.id) };
  }

  @Patch()
  @Roles(...READER_ROLES)
  async patch(@Body('answerLanguage') answerLanguage: unknown, @Req() req: any) {
    if (!isAnswerLanguage(answerLanguage)) {
      throw new BadRequestException('answerLanguage must be one of: en, hi');
    }
    return { answerLanguage: await this.preferences.setAnswerLanguage(req.user.id, answerLanguage) };
  }
}
