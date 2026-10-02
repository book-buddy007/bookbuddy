import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../aws/s3.service';
import { LoggerService } from '../logger/logger.service';
import {
  PresignUploadDto,
  ConfirmUploadDto,
  UpdateFileDto,
  SyncProgressDto,
  CreateFolderDto,
  UpdateFolderDto,
  BulkActionDto,
} from './dto/personal-library.dto';

const DEFAULT_QUOTA = {
  maxStorageBytes: 1 * 1024 * 1024 * 1024,
  maxFileCount: 30,
  maxSingleFileBytes: 100 * 1024 * 1024,
};

interface QuotaConfig {
  maxStorageBytes: number;
  maxFileCount: number;
  maxSingleFileBytes: number;
}

@Injectable()
export class PersonalLibraryService {
  constructor(
    private prisma: PrismaService,
    private s3Service: S3Service,
    private logger: LoggerService,
  ) {
    this.logger.setContext('PersonalLibraryService');
  }

  // ── QUOTA ─────────────────────────────────────────────────────────────────

  private async getQuota(tenantId: string | null): Promise<QuotaConfig> {
    if (!tenantId) return DEFAULT_QUOTA;

    try {
      const settings = await this.prisma.tenantSettings.findUnique({
        where: { tenantId },
        select: { personalLibraryQuota: true },
      });

      if (
        settings?.personalLibraryQuota &&
        typeof settings.personalLibraryQuota === 'object'
      ) {
        const q = settings.personalLibraryQuota as any;
        return {
          maxStorageBytes: q.maxStorageBytes ?? DEFAULT_QUOTA.maxStorageBytes,
          maxFileCount: q.maxFileCount ?? DEFAULT_QUOTA.maxFileCount,
          maxSingleFileBytes:
            q.maxSingleFileBytes ?? DEFAULT_QUOTA.maxSingleFileBytes,
        };
      }
    } catch (err) {
      this.logger.warn(
        `Failed to load tenant quota for ${tenantId}, using defaults`,
      );
    }

    return DEFAULT_QUOTA;
  }

  async getQuotaStatus(userId: string, tenantId: string | null) {
    const quota = await this.getQuota(tenantId);

    const agg = await this.prisma.personalFile.aggregate({
      where: { userId, deletedAt: null },
      _count: { id: true },
      _sum: { fileSize: true },
    });

    const usedBytes = agg._sum.fileSize ?? 0;
    const usedCount = agg._count.id ?? 0;

    return {
      usedBytes,
      usedCount,
      maxStorageBytes: quota.maxStorageBytes,
      maxFileCount: quota.maxFileCount,
      maxSingleFileBytes: quota.maxSingleFileBytes,
      remainingBytes: Math.max(0, quota.maxStorageBytes - usedBytes),
      remainingFiles: Math.max(0, quota.maxFileCount - usedCount),
    };
  }

  // ── FOLDERS ───────────────────────────────────────────────────────────────

  async createFolder(userId: string, dto: CreateFolderDto) {
    if (dto.parentId) {
      const parent = await this.prisma.personalFolder.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent || parent.userId !== userId)
        throw new NotFoundException('Parent folder not found');
    }

    return this.prisma.personalFolder.create({
      data: {
        userId,
        name: dto.name,
        parentId: dto.parentId || null,
        color: dto.color,
        isStarred: dto.isStarred || false,
      },
    });
  }

  async updateFolder(userId: string, folderId: string, dto: UpdateFolderDto) {
    const folder = await this.prisma.personalFolder.findUnique({
      where: { id: folderId },
    });
    if (!folder || folder.userId !== userId || folder.deletedAt) {
      throw new NotFoundException('Folder not found');
    }

    if (dto.parentId) {
      const parent = await this.prisma.personalFolder.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent || parent.userId !== userId || parent.deletedAt)
        throw new NotFoundException('Parent folder not found');
      // Prevent cyclic dependency could be done here
    }

    return this.prisma.personalFolder.update({
      where: { id: folder.id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.parentId !== undefined && { parentId: dto.parentId }),
        ...(dto.color !== undefined && { color: dto.color }),
        ...(dto.isStarred !== undefined && { isStarred: dto.isStarred }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    });
  }

  async deleteFolder(userId: string, folderId: string) {
    const folder = await this.prisma.personalFolder.findUnique({
      where: { id: folderId },
    });
    if (!folder || folder.userId !== userId || folder.deletedAt) {
      throw new NotFoundException('Folder not found');
    }

    // Soft delete folder and all descendants.
    // In Prisma, recursive soft delete is complex in a single query unless using raw SQL.
    // We will recursively collect IDs to update.
    const allFolderIds = await this.getAllDescendantFolderIds(folderId);

    await this.prisma.$transaction([
      this.prisma.personalFolder.updateMany({
        where: { id: { in: allFolderIds } },
        data: { deletedAt: new Date() },
      }),
      this.prisma.personalFile.updateMany({
        where: { folderId: { in: allFolderIds } },
        data: { deletedAt: new Date() },
      }),
    ]);

    return { success: true, message: 'Folder and contents recycled' };
  }

  private async getAllDescendantFolderIds(
    rootFolderId: string,
  ): Promise<string[]> {
    const ids = [rootFolderId];
    // Simple iterative bfs to grab all children
    let currentLevel = [rootFolderId];
    while (currentLevel.length > 0) {
      const children = await this.prisma.personalFolder.findMany({
        where: { parentId: { in: currentLevel }, deletedAt: null },
        select: { id: true },
      });
      currentLevel = children.map((c) => c.id);
      ids.push(...currentLevel);
    }
    return ids;
  }

  // ── FILES UPLOAD ──────────────────────────────────────────────────────────

  async presignUpload(
    userId: string,
    tenantId: string | null,
    dto: PresignUploadDto,
  ) {
    const quota = await this.getQuotaStatus(userId, tenantId);

    if (dto.fileSize > quota.maxSingleFileBytes) {
      throw new BadRequestException('File too large.');
    }
    if (quota.usedCount >= quota.maxFileCount) {
      throw new BadRequestException('File limit reached.');
    }
    if (quota.usedBytes + dto.fileSize > quota.maxStorageBytes) {
      throw new BadRequestException('Storage limit exceeded.');
    }

    const storageKey = this.s3Service.buildPersonalFileKey(
      userId,
      dto.filename,
    );

    const result = await this.s3Service.getPresignedUploadUrl({
      key: storageKey,
      mimeType: dto.mimeType,
      format: 'personal',
      expiresInSeconds: 600,
    });

    this.logger.log(
      `Presigned upload URL generated for user ${userId}: ${storageKey}`,
    );

    return {
      uploadUrl: result.uploadUrl,
      fields: result.fields,
      storageKey,
      maxBytes: quota.maxSingleFileBytes,
    };
  }

  async confirmUpload(
    userId: string,
    tenantId: string | null,
    dto: ConfirmUploadDto,
  ) {
    if (!dto.storageKey.startsWith(`personal/${userId}/`)) {
      throw new ForbiddenException('Storage key does not belong to this user');
    }

    const existing = await this.prisma.personalFile.findFirst({
      where: { storageKey: dto.storageKey },
    });

    if (existing) {
      throw new BadRequestException('This file has already been confirmed');
    }

    const quota = await this.getQuota(tenantId);

    return await this.prisma.$transaction(async (tx) => {
      const agg = await tx.personalFile.aggregate({
        where: { userId, deletedAt: null },
        _count: { id: true },
        _sum: { fileSize: true },
      });

      if ((agg._count.id ?? 0) >= quota.maxFileCount) {
        await this.s3Service.deleteFile(dto.storageKey);
        throw new BadRequestException('File limit exceeded.');
      }

      if ((agg._sum.fileSize ?? 0) + dto.fileSize > quota.maxStorageBytes) {
        await this.s3Service.deleteFile(dto.storageKey);
        throw new BadRequestException('Storage limit exceeded.');
      }

      const file = await tx.personalFile.create({
        data: {
          userId,
          title: dto.title,
          author: dto.author,
          format: dto.format,
          mimeType: dto.mimeType,
          fileSize: dto.fileSize,
          storageKey: dto.storageKey,
          folderId: dto.folderId || null,
        },
      });

      this.logger.log(`Personal file confirmed: ${file.id} for user ${userId}`);
      return file;
    });
  }

  // ── LISTING & SEARCH ──────────────────────────────────────────────────────

  async getContents(userId: string, folderId: string | null) {
    const [folders, files] = await Promise.all([
      this.prisma.personalFolder.findMany({
        where: { userId, parentId: folderId, deletedAt: null },
        orderBy: [{ sortOrder: 'desc' }, { name: 'asc' }],
      }),
      this.prisma.personalFile.findMany({
        where: { userId, folderId: folderId, deletedAt: null },
        orderBy: [{ sortOrder: 'desc' }, { title: 'asc' }],
        include: {
          readingProgress: {
            select: {
              currentPage: true,
              percentComplete: true,
              lastReadAt: true,
            },
          },
        },
      }),
    ]);

    let parentFolder: any = null;
    const breadcrumb: any[] = [];
    if (folderId) {
      parentFolder = await this.prisma.personalFolder.findUnique({
        where: { id: folderId },
      });
      let current = parentFolder;
      while (current) {
        breadcrumb.unshift({ id: current.id, name: current.name });
        if (current.parentId) {
          current = await this.prisma.personalFolder.findUnique({
            where: { id: current.parentId },
          });
        } else {
          current = null;
        }
      }
    }

    return {
      folder: parentFolder,
      breadcrumb,
      folders,
      files,
    };
  }

  async search(userId: string, query: any) {
    const { q, isStarred, tags } = query;
    const fileWhere: any = { userId, deletedAt: null };
    const folderWhere: any = { userId, deletedAt: null };

    if (q) {
      fileWhere.OR = [{ title: { contains: q } }, { author: { contains: q } }];
      folderWhere.name = { contains: q };
    }

    if (isStarred === 'true') {
      fileWhere.isStarred = true;
      folderWhere.isStarred = true;
    }

    // Rough tags matching handling array JSON in MySQL natively is tricky without JSON_CONTAINS if doing raw.
    // For Prisma JSON, we can sometimes do equals, or we just filter in memory if strictly required.
    // Since tags are saved as JSON arrays, we fetch and filter below.

    let files = await this.prisma.personalFile.findMany({
      where: fileWhere,
      orderBy: { updatedAt: 'desc' },
      include: {
        readingProgress: {
          select: {
            currentPage: true,
            percentComplete: true,
            lastReadAt: true,
          },
        },
      },
    });

    const folders = await this.prisma.personalFolder.findMany({
      where: folderWhere,
      orderBy: { updatedAt: 'desc' },
    });

    if (tags) {
      // client passes comma separated list
      const tagList = tags.split(',').map((t) => t.trim().toLowerCase());
      files = files.filter((f) => {
        try {
          const fTags = (f.tags as string[]) || [];
          return tagList.some((t) =>
            fTags.map((ft) => ft.toLowerCase()).includes(t),
          );
        } catch {
          return false;
        }
      });
    }

    return { files, folders };
  }

  // ── UPDATE FILE ───────────────────────────────────────────────────────────

  async getFile(userId: string, fileId: string) {
    const file = await this.prisma.personalFile.findUnique({
      where: { id: fileId },
      include: { readingProgress: true },
    });

    if (!file || file.deletedAt) throw new NotFoundException('File not found');
    if (file.userId !== userId) throw new ForbiddenException('Forbidden');

    return file;
  }

  async getReadUrl(userId: string, fileId: string) {
    const file = await this.getFile(userId, fileId);

    const url = await this.s3Service.getPresignedDownloadUrl({
      key: file.storageKey,
      expiresInSeconds: 3600,
    });

    await this.prisma.personalFile.update({
      where: { id: fileId },
      data: { lastReadAt: new Date() },
    });

    return {
      url,
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      format: file.format,
    };
  }

  async updateFile(userId: string, fileId: string, dto: UpdateFileDto) {
    const file = await this.getFile(userId, fileId);

    if (dto.folderId) {
      const parent = await this.prisma.personalFolder.findUnique({
        where: { id: dto.folderId },
      });
      if (!parent || parent.userId !== userId)
        throw new NotFoundException('Target folder not found');
    }

    return this.prisma.personalFile.update({
      where: { id: file.id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.author !== undefined && { author: dto.author }),
        ...(dto.folderId !== undefined && { folderId: dto.folderId }),
        ...(dto.isStarred !== undefined && { isStarred: dto.isStarred }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.color !== undefined && { color: dto.color }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
      },
    });
  }

  async syncProgress(userId: string, fileId: string, dto: SyncProgressDto) {
    await this.getFile(userId, fileId); // ownership check

    const progress = await this.prisma.personalReadingProgress.upsert({
      where: { personalFileId: fileId },
      update: {
        currentPage: dto.currentPage,
        percentComplete: dto.percentComplete,
        timeSpentSeconds:
          dto.timeSpentSeconds != null
            ? { increment: dto.timeSpentSeconds }
            : undefined,
        totalPagesRead:
          dto.totalPagesRead != null
            ? { increment: dto.totalPagesRead }
            : undefined,
        lastReadAt: new Date(),
        bookmarks: dto.bookmarks ?? undefined,
        readerSettings: dto.readerSettings ?? undefined,
      },
      create: {
        personalFileId: fileId,
        userId,
        currentPage: dto.currentPage,
        percentComplete: dto.percentComplete,
        timeSpentSeconds: dto.timeSpentSeconds ?? 0,
        totalPagesRead: dto.totalPagesRead ?? 0,
        bookmarks: dto.bookmarks ?? [],
        readerSettings: dto.readerSettings ?? {},
      },
    });

    await this.prisma.personalFile.update({
      where: { id: fileId },
      data: { progress: dto.percentComplete / 100, lastReadAt: new Date() },
    });

    return progress;
  }

  // ── DELETE / BULK ACTIONS ─────────────────────────────────────────────────

  async deleteFile(userId: string, fileId: string) {
    const file = await this.getFile(userId, fileId);

    // Soft delete
    await this.prisma.personalFile.update({
      where: { id: file.id },
      data: { deletedAt: new Date() },
    });

    // For pure recycling we leave it in S3. A cleanup CRON would permanently drop R2 later.

    return { success: true, deletedId: file.id };
  }

  async bulkAction(userId: string, dto: BulkActionDto) {
    const fileIds = dto.fileIds || [];
    const folderIds = dto.folderIds || [];

    const fileWhere = { id: { in: fileIds }, userId };
    const folderWhere = { id: { in: folderIds }, userId };

    switch (dto.action) {
      case 'move':
        if (dto.targetFolderId) {
          const target = await this.prisma.personalFolder.findUnique({
            where: { id: dto.targetFolderId },
          });
          if (!target || target.userId !== userId)
            throw new NotFoundException('Target folder not found');
        }
        if (fileIds.length > 0) {
          await this.prisma.personalFile.updateMany({
            where: fileWhere,
            data: { folderId: dto.targetFolderId || null },
          });
        }
        if (folderIds.length > 0) {
          await this.prisma.personalFolder.updateMany({
            where: folderWhere,
            data: { parentId: dto.targetFolderId || null },
          });
        }
        break;

      case 'star':
        if (fileIds.length > 0)
          await this.prisma.personalFile.updateMany({
            where: fileWhere,
            data: { isStarred: true },
          });
        if (folderIds.length > 0)
          await this.prisma.personalFolder.updateMany({
            where: folderWhere,
            data: { isStarred: true },
          });
        break;

      case 'unstar':
        if (fileIds.length > 0)
          await this.prisma.personalFile.updateMany({
            where: fileWhere,
            data: { isStarred: false },
          });
        if (folderIds.length > 0)
          await this.prisma.personalFolder.updateMany({
            where: folderWhere,
            data: { isStarred: false },
          });
        break;

      case 'delete': {
        const now = new Date();
        if (fileIds.length > 0)
          await this.prisma.personalFile.updateMany({
            where: fileWhere,
            data: { deletedAt: now },
          });

        // Complex tree deletion for folders needed in generic cases, but for this simple loop logic is sufficient locally:
        for (const fid of folderIds) {
          await this.deleteFolder(userId, fid).catch(() => null);
        }
        break;
      }

      case 'update-tags':
        // Prisma updateMany cannot append JSON natively easily. We would have to update individually
        if (fileIds.length > 0) {
          const files = await this.prisma.personalFile.findMany({
            where: fileWhere,
          });
          for (const f of files) {
            let curTags = (f.tags as string[]) || [];
            if (dto.tagsToAdd) {
              curTags = [...new Set([...curTags, ...dto.tagsToAdd])];
            }
            if (dto.tagsToRemove) {
              curTags = curTags.filter((t) => !dto.tagsToRemove!.includes(t));
            }
            await this.prisma.personalFile.update({
              where: { id: f.id },
              data: { tags: curTags },
            });
          }
        }
        break;
    }

    return { success: true };
  }
}
