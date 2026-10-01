import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Req,
  UseGuards,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { BetterAuthGuard } from '../guards/better-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AiFeatureGuard } from '../ai-entitlement/ai-feature.guard';
import { AiFeatureGate } from '../ai-entitlement/ai-feature.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { TextAdaptationService } from './text-adaptation.service';

const SYSTEM_TENANT = '__SYSTEM__';
const READER_ROLES = ['super-admin', 'admin', 'librarian', 'teacher', 'student'];

@UseGuards(BetterAuthGuard, RolesGuard, AiFeatureGuard)
@Controller('books')
export class TextAdaptationController {
  constructor(
    private prisma: PrismaService,
    private textAdaptation: TextAdaptationService,
  ) {}

  // Same object-level authorization as GraphController/QuizController/
  // BookChatController — duplicated rather than shared across modules for
  // the same three-line-check reason noted there.
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

  // Self-authenticating (no studentId param) — the flags depend on the
  // caller's own mastery vector, same reasoning as quiz.controller.ts's
  // students/me/mastery: an arbitrary student id would let one user read
  // another's mastery-derived data.
  @Get(':bookId/chapters/:chapterTitle/adaptive-flags')
  @Roles(...READER_ROLES)
  async getAdaptiveFlags(
    @Param('bookId') bookId: string,
    @Param('chapterTitle') chapterTitle: string,
    @Req() req: any,
  ) {
    await this.authorizeBookAccess(bookId, req);
    return this.textAdaptation.getAdaptiveFlags(bookId, decodeURIComponent(chapterTitle), req.user.id);
  }

  @Post(':bookId/paragraphs/:paragraphId/simplify')
  @Roles(...READER_ROLES)
  @AiFeatureGate('simplify')
  async simplify(
    @Param('bookId') bookId: string,
    @Param('paragraphId') paragraphId: string,
    @Body() body: { targetLevel?: string },
    @Req() req: any,
  ) {
    await this.authorizeBookAccess(bookId, req);
    if (!body?.targetLevel?.trim()) {
      throw new BadRequestException('"targetLevel" is required.');
    }
    return this.textAdaptation.simplify(bookId, paragraphId, body.targetLevel.trim());
  }
}
