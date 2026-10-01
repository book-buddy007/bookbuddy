import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
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
}
