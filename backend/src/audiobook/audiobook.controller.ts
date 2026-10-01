import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AudiobookService } from './audiobook.service';
import { AlignmentService } from './alignment.service';
import { BetterAuthGuard } from '../guards/better-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { BookAccessService } from '../common/book-access.service';

@Controller('audiobooks')
export class AudiobookController {
  constructor(
    private readonly audiobookService: AudiobookService,
    private readonly alignmentService: AlignmentService,
    private readonly bookAccess: BookAccessService,
  ) {}

  /**
   * Was unguarded entirely, which made the full chapter/section tree of any
   * audiobook — including the section ids the presign route takes — readable
   * anonymously. Authenticated and tenant-scoped now, like every other
   * book-scoped read.
   */
  @Get(':bookId/structure')
  @UseGuards(BetterAuthGuard)
  async getStructure(@Param('bookId') bookId: string, @Req() req: any) {
    await this.bookAccess.assertCanRead(req.user.id, bookId);
    return this.audiobookService.getStructure(bookId);
  }

  @Get('sections/:sectionId/presign')
  @UseGuards(BetterAuthGuard)
  async getPresignedUrl(
    @Param('sectionId') sectionId: string,
    @Query('gender') gender: 'MALE' | 'FEMALE',
    @Req() req: any,
  ) {
    return this.audiobookService.getPresignedUrl(
      req.user.id,
      sectionId,
      gender,
    );
  }

  @Get('sections/:sectionId/transcript')
  @UseGuards(BetterAuthGuard)
  async getTranscript(@Param('sectionId') sectionId: string, @Req() req: any) {
    await this.bookAccess.assertCanReadSection(req.user.id, sectionId);
    return this.audiobookService.getTranscript(sectionId);
  }

  // §5 cross-media sync — word-level timestamps for the requested track's
  // audio, generated on first request and cached after (same lazy pattern
  // as the §4 quiz endpoints). See alignment.service.ts's header: this path
  // has not been exercised against real audio in this environment.
  @Get('sections/:sectionId/alignment')
  @UseGuards(BetterAuthGuard)
  async getAlignment(
    @Param('sectionId') sectionId: string,
    @Query('gender') gender: 'MALE' | 'FEMALE' = 'FEMALE',
    @Req() req: any,
  ) {
    await this.bookAccess.assertCanReadSection(req.user.id, sectionId);
    return this.alignmentService.getOrGenerate(sectionId, gender);
  }

  @Put(':bookId/progress')
  @UseGuards(BetterAuthGuard)
  async saveProgress(
    @Req() req: any,
    @Param('bookId') bookId: string,
    @Body() body: any,
  ) {
    return this.audiobookService.saveProgressToRedis(req.user.id, bookId, body);
  }

  // Admin APIs for creation
  @Post(':bookId/chapter')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.LIBRARIAN)
  async createChapter(@Param('bookId') bookId: string, @Body() body: any) {
    return this.audiobookService.createChapter(bookId, body);
  }

  @Post('chapter/:chapterId/section')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.LIBRARIAN)
  async createSection(
    @Param('chapterId') chapterId: string,
    @Body() body: any,
  ) {
    return this.audiobookService.createSection(chapterId, body);
  }

  @Post('section/:sectionId/tracks')
  @UseGuards(BetterAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.LIBRARIAN)
  async saveTracks(@Param('sectionId') sectionId: string, @Body() body: any) {
    return this.audiobookService.saveTracks(sectionId, body);
  }
}
