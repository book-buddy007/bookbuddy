import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { BetterAuthGuard } from '../guards/better-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { VartaActivityService } from './varta-activity.service';

const READER_ROLES = ['super-admin', 'admin', 'librarian', 'teacher', 'student'];

@UseGuards(BetterAuthGuard, RolesGuard)
@Controller('students/me')
export class VartaActivityController {
  constructor(private activity: VartaActivityService) {}

  /**
   * The signed-in student's own Varta activity — always self-scoped (identity
   * from the session, never a userId parameter), so it can't be pointed at
   * another student. `bookId` narrows it to one book; omitted ⇒ all books.
   */
  @Get('varta-activity')
  @Roles(...READER_ROLES)
  async getVartaActivity(@Query('bookId') bookId: string | undefined, @Req() req: any) {
    return this.activity.getActivity(req.user.id, bookId?.trim() || undefined);
  }
}
