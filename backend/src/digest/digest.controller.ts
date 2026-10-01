import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Req,
  UseGuards,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { BetterAuthGuard } from '../guards/better-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AiFeatureGuard } from '../ai-entitlement/ai-feature.guard';
import { AiFeatureGate } from '../ai-entitlement/ai-feature.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { DigestService } from './digest.service';

const SYSTEM_TENANT = '__SYSTEM__';
const READER_ROLES = ['super-admin', 'admin', 'librarian', 'teacher', 'student'];

@Controller('books')
@UseGuards(BetterAuthGuard, RolesGuard, AiFeatureGuard)
export class DigestController {
  constructor(
    private prisma: PrismaService,
    private digest: DigestService,
  ) {}

  // Same object-level authorization as GraphController/QuizController/
  // BookChatController/TextAdaptationController/VisualGroundingController —
  // duplicated rather than shared across modules for the same
  // three-line-check reason noted there.
  private async authorizeBookAccess(bookId: string, req: any) {
    const book = await this.prisma.book.findUnique({ where: { id: bookId } });
    if (!book) throw new NotFoundException('Book not found');

    if (book.tenantId && book.tenantId !== SYSTEM_TENANT) {
      const membership = await this.prisma.userTenantMembership.findFirst({
        where: { userId: req.user.id, tenantId: book.tenantId, status: 'ACTIVE' },
        select: { id: true },
      });
      if (!membership) {
        throw new ForbiddenException('You do not have access to this book.');
      }
    }
    return book;
  }

  @Post(':bookId/chapters/:chapterTitle/digest')
  @Roles(...READER_ROLES)
  @AiFeatureGate('recap')
  async generate(
    @Param('bookId') bookId: string,
    @Param('chapterTitle') chapterTitle: string,
    @Query('voicePair') voicePair: string | undefined,
    @Req() req: any,
  ) {
    await this.authorizeBookAccess(bookId, req);
    return this.digest.generateDigest(bookId, decodeURIComponent(chapterTitle), voicePair || 'default');
  }

  @Get(':bookId/chapters/:chapterTitle/digest/status')
  @Roles(...READER_ROLES)
  async status(
    @Param('bookId') bookId: string,
    @Param('chapterTitle') chapterTitle: string,
    @Query('voicePair') voicePair: string | undefined,
    @Req() req: any,
  ) {
    await this.authorizeBookAccess(bookId, req);
    return this.digest.getStatus(bookId, decodeURIComponent(chapterTitle), voicePair || 'default');
  }
}
