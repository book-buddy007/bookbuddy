import { Controller, Post, Get, Body, UseGuards, Req, Res, Header } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { ExportService } from './export.service';
import { BetterAuthGuard } from '../guards/better-auth.guard';

@Controller('export')
@UseGuards(BetterAuthGuard)
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Post('notes')
  async exportNotes(
    @Req() req: any,
    @Body() body: { bookId: string; bookTitle: string; annotations: any[] },
  ) {
    return this.exportService.generateMarkdownStudyNotes(
      req.user.id,
      body.bookId,
      body.bookTitle,
      body.annotations,
    );
  }

  /** The signed-in user's own data as a JSON download. Heavy query, so rate-limited. */
  @Get('me')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Header('Cache-Control', 'no-store')
  async exportMine(@Req() req: any, @Res() res: Response) {
    const data = await this.exportService.exportUserData(req.user.id);
    const date = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="book-buddy-data-${date}.json"`);
    res.send(JSON.stringify(data, null, 2));
  }
}
