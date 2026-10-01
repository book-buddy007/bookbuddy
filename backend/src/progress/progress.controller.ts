import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ProgressService } from './progress.service';
import { BetterAuthGuard } from '../guards/better-auth.guard';

@Controller('progress')
@UseGuards(BetterAuthGuard)
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Get('streak')
  async getStreak(@Req() req: any) {
    return this.progressService.getStreak(req.user.id);
  }

  @Post('streak')
  async updateStreak(@Req() req: any, @Body() body: { minutesRead: number }) {
    return this.progressService.updateStreak(
      req.user.id,
      body.minutesRead || 0,
    );
  }
}
