import { Controller, Get, Param, Post, UseGuards, Req } from '@nestjs/common';
import { AssignmentsService } from './assignments.service';
import { BetterAuthGuard } from '../guards/better-auth.guard';

@Controller('assignments')
@UseGuards(BetterAuthGuard)
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Get('book/:bookId')
  async getAssignmentsForBook(
    @Req() req: any,
    @Param('bookId') bookId: string,
  ) {
    return this.assignmentsService.getAssignmentsForBook(req.user.id, bookId);
  }

  @Post(':assignmentId/complete')
  async markComplete(
    @Req() req: any,
    @Param('assignmentId') assignmentId: string,
  ) {
    return this.assignmentsService.markAssignmentComplete(
      req.user.id,
      assignmentId,
    );
  }
}
