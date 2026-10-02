import {
  Controller,
  Post,
  Param,
  Body,
  Req,
  UseGuards,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { BetterAuthGuard } from '../guards/better-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { TierGuard } from '../auth/tier.guard';
import { AiFeatureGuard } from '../ai-entitlement/ai-feature.guard';
import { AiFeatureGate } from '../ai-entitlement/ai-feature.decorator';
import { PrismaService } from '../prisma/prisma.service';
import {
  VisualGroundingService,
  BoundingBox,
} from './visual-grounding.service';

const SYSTEM_TENANT = '__SYSTEM__';
const READER_ROLES = [
  'super-admin',
  'admin',
  'librarian',
  'teacher',
  'student',
];

@Controller('books')
@UseGuards(BetterAuthGuard, RolesGuard, TierGuard, AiFeatureGuard)
export class VisualGroundingController {
  constructor(
    private prisma: PrismaService,
    private visualGrounding: VisualGroundingService,
  ) {}

  // Same object-level authorization as GraphController/QuizController/
  // BookChatController/TextAdaptationController — duplicated rather than
  // shared across modules for the same three-line-check reason noted there.
  private async authorizeBookAccess(bookId: string, req: any) {
    const book = await this.prisma.book.findUnique({ where: { id: bookId } });
    if (!book) throw new NotFoundException('Book not found');

    if (book.tenantId && book.tenantId !== SYSTEM_TENANT) {
      const membership = await this.prisma.userTenantMembership.findFirst({
        where: {
          userId: req.user.id,
          tenantId: book.tenantId,
          status: 'ACTIVE',
        },
        select: { id: true },
      });
      if (!membership) {
        throw new ForbiddenException('You do not have access to this book.');
      }
    }
    return book;
  }

  // Highest infra-cost item in the Reading Intelligence Layer spec (vision-
  // language inference), gated to DIAMOND per the spec's own recommendation
  // — same tier as the Varta AI chat endpoint. Rate-limited independently of
  // Varta's own quota (image inference is a different cost profile).
  @Post(':bookId/pages/:pageNum/visual-query')
  @Roles(...READER_ROLES)
  @AiFeatureGate('visual_grounding')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async visualQuery(
    @Param('bookId') bookId: string,
    @Param('pageNum') pageNum: string,
    @Body()
    body: { image?: string; question?: string; boundingBox?: BoundingBox },
    @Req() req: any,
  ) {
    await this.authorizeBookAccess(bookId, req);
    if (!body?.image) {
      throw new BadRequestException(
        '"image" is required — this endpoint has no server-side page image to resolve.',
      );
    }
    return this.visualGrounding.query(
      body.image,
      body.question ?? '',
      body.boundingBox,
    );
  }
}
