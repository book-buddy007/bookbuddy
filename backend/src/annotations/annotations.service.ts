import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnnotationsService {
  constructor(private prisma: PrismaService) {}

  /**
   * A reader's own annotations, plus any a classmate has shared.
   *
   * The two halves are scoped differently, and conflating them was a bug:
   *
   *   - Personal notes match on `userId` alone. They belong to the reader, not
   *     to an institution, so joining or leaving one must not make their own
   *     highlights disappear.
   *   - Shared notes are the only tenant-scoped part, because "shared" means
   *     shared *with my institution*. When the reader has no tenant there are
   *     no classmates, so the clause is omitted entirely — previously a null
   *     tenant matched every other independent reader's shared annotations,
   *     which exposed strangers' notes to each other.
   */
  async getPersonalAndSharedAnnotations(
    tenantId: string | null,
    userId: string,
    bookId: string,
  ) {
    const scopes: Prisma.AnnotationWhereInput[] = [{ userId }];

    if (tenantId) {
      scopes.push({ shared: true, tenantId });
    }

    return this.prisma.annotation.findMany({
      where: {
        bookId,
        OR: scopes,
      },
      include: {
        user: {
          select: { name: true, id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async upsertAnnotation(userId: string, tenantId: string | null, data: any) {
    return this.prisma.annotation.upsert({
      where: {
        id: data.id || 'new-annotation-id-placeholder',
      },
      update: {
        content: data.content,
        color: data.color,
        shared: data.isShared, // map from frontend model
        // Ink strokes live here, not in `position` — every pointerup on an
        // existing stroke (drawing more, or erasing) calls updateAnnotation
        // with a new `data.strokes` array. This was previously dropped
        // entirely, so freehand drawings vanished the moment the reader
        // re-synced from the backend (see syncAnnotationsWithBackend).
        data: data.data,
      },
      create: {
        id: data.id, // Usually supplied by the frontend for sync
        userId,
        tenantId,
        bookId: data.bookId,
        type: data.type,
        content: data.content,
        position: data.position, // position info including pageIndex
        data: data.data, // arbitrary per-type payload — ink strokes, etc.
        color: data.color,
        shared: data.isShared || false,
      },
    });
  }

  async deleteAnnotation(userId: string, annotationId: string) {
    // Find first to verify ownership
    const existing = await this.prisma.annotation.findUnique({
      where: { id: annotationId },
    });
    if (!existing) throw new NotFoundException('Annotation not found');
    if (existing.userId !== userId) throw new Error('Unauthorized');

    return this.prisma.annotation.delete({
      where: { id: annotationId },
    });
  }
}
