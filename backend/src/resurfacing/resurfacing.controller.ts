import { Controller, Get, Post, Param, Req, UseGuards } from '@nestjs/common';
import { BetterAuthGuard } from '../guards/better-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ResurfacingService } from './resurfacing.service';

const READER_ROLES = [
  'super-admin',
  'admin',
  'librarian',
  'teacher',
  'student',
];

// Self-authenticating (`students/me/...`, not `students/:id/...`) — same
// pattern as quiz.controller.ts's `students/me/mastery`. An arbitrary `:id`
// param would let any logged-in user read another student's resurfacing
// queue by guessing/enumerating ids.
@Controller('students/me/resurfacing-queue')
@UseGuards(BetterAuthGuard, RolesGuard)
export class ResurfacingController {
  constructor(private resurfacing: ResurfacingService) {}

  @Get()
  @Roles(...READER_ROLES)
  getQueue(@Req() req: any) {
    return this.resurfacing.getQueue(req.user.id);
  }

  @Post(':eventId/actioned')
  @Roles(...READER_ROLES)
  markActioned(@Param('eventId') eventId: string, @Req() req: any) {
    return this.resurfacing.markActioned(req.user.id, eventId);
  }
}
