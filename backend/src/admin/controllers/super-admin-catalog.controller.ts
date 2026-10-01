import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SuperAdminCatalogService } from '../services/super-admin-catalog.service';
import { BookTaxonomyService } from '../services/book-taxonomy.service';
import { UpdateBookDto } from '../dto/update-book.dto';
import {
  CreateChapterDto,
  UpdateChapterDto,
  CreateSectionDto,
  UpdateSectionDto,
  ReorderStructureDto,
} from '../dto/audiobook-builder.dto';
import { BetterAuthGuard } from '../../guards/better-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Controller('api/super-admin/catalog')
@UseGuards(BetterAuthGuard, RolesGuard)
@Roles('super-admin')
export class SuperAdminCatalogController {
  constructor(
    private readonly catalogService: SuperAdminCatalogService,
    private readonly bookTaxonomyService: BookTaxonomyService,
    @InjectQueue('book-graph-extraction') private readonly graphQueue: Queue,
  ) {}

  // ── SHARED CURRICULUM TAXONOMY (cross-repo, Vidyaverse-hosted) ───────────────
  // Distinct from /categories below (general reading genre) — this is the
  // board/class/subject/degree/exam classification used to scope RAG retrieval.
  @Get('taxonomy/tree')
  async getTaxonomyTree(@Query('domain') domain: string) {
    return this.bookTaxonomyService.getTree(domain);
  }

  @Get('books/:id/taxonomy')
  async getBookTaxonomy(@Param('id') id: string) {
    return this.bookTaxonomyService.getBookTaxonomy(id);
  }

  @Put('books/:id/taxonomy')
  async setBookTaxonomy(
    @Param('id') id: string,
    @Body() body: { links: Array<{ nodeId: string; isPrimary?: boolean }> },
  ) {
    return this.bookTaxonomyService.setBookTaxonomy(id, body.links ?? []);
  }

  // ── STATS ──────────────────────────────────────────────────────────────────
  @Get('stats')
  async getCatalogStats() {
    return this.catalogService.getCatalogStats();
  }

  // ── APPROVAL QUEUE ─────────────────────────────────────────────────────────
  @Get('approval-queue')
  async getApprovalQueue(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.catalogService.getApprovalQueue(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Put('approval-queue/:id/approve')
  async approveBook(
    @Param('id') id: string,
    @Body('tier') tier: string,
    @Req() req: any,
  ) {
    return this.catalogService.approveBook(id, tier || 'FREE', req.user.id);
  }

  @Put('approval-queue/:id/reject')
  async rejectBook(
    @Param('id') id: string,
    @Body('note') note: string,
    @Req() req: any,
  ) {
    return this.catalogService.rejectBook(id, note || '', req.user.id);
  }

  // ── PUBLISHER MANAGEMENT ───────────────────────────────────────────────────
  @Get('publishers')
  async getPublishers() {
    return this.catalogService.getPublisherTenants();
  }

  @Patch('tenants/:id/publisher')
  async togglePublisher(@Param('id') id: string) {
    return this.catalogService.togglePublisher(id);
  }

  // ── BOOK CRUD ──────────────────────────────────────────────────────────────
  @Get('books')
  async getBooks(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('accessTier') accessTier?: string,
    @Query('catalogScope') catalogScope?: string,
    @Query('tenantId') tenantId?: string,
    @Query('globalPublishStatus') globalPublishStatus?: string,
  ) {
    return this.catalogService.findAllBooks({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      search,
      accessTier,
      catalogScope,
      tenantId,
      globalPublishStatus,
    });
  }

  @Get('books/:id')
  async getBook(@Param('id') id: string) {
    return this.catalogService.findBookById(id);
  }

  @Post('books')
  async createBook(@Body() body: any, @Req() req: any) {
    return this.catalogService.createGlobalBook(body, req.user.id);
  }

  @Put('books/:id')
  async updateBook(@Param('id') id: string, @Body() dto: UpdateBookDto) {
    return this.catalogService.updateBook(id, dto);
  }

  // A "delete" moves the book to the Bin (soft delete) — recoverable, and
  // nothing in storage/index/graph is touched until an explicit purge.
  @Delete('books/:id')
  async deleteBook(@Param('id') id: string, @Req() req: any) {
    return this.catalogService.deleteBook(id, req.user?.id);
  }

  // The Bin: soft-deleted books awaiting restore or permanent deletion.
  @Get('bin')
  async getBin(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.catalogService.findBinnedBooks({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      search,
    });
  }

  @Post('books/:id/restore')
  async restoreBook(@Param('id') id: string) {
    return this.catalogService.restoreBook(id);
  }

  // Permanent, irreversible: flushes R2 files, shared embeddings and the whole
  // graph for this book only, then deletes it. Allowed only from the Bin.
  @Delete('books/:id/purge')
  async purgeBook(@Param('id') id: string) {
    return this.catalogService.purgeBook(id);
  }

  // One-shot graph backfill for the pre-Stage-2 catalogue (books ingested before
  // maps were auto-generated). Enqueues a chapter-wise build per book; dedup by
  // jobId so a repeat click doesn't pile up duplicate work. force=true rebuilds
  // every ingested book's graph.
  @Post('books/backfill-graphs')
  async backfillGraphs(@Query('force') force?: string) {
    const ids = await this.catalogService.listBookIdsNeedingGraph(force === 'true');
    await Promise.all(
      ids.map((bookId) =>
        this.graphQueue.add(
          'extract-graph',
          { bookId },
          { jobId: `graph-backfill-${bookId}`, removeOnComplete: true, removeOnFail: true },
        ),
      ),
    );
    return { queued: ids.length, bookIds: ids };
  }

  @Patch('books/:id/tier')
  async changeTier(@Param('id') id: string, @Body('tier') tier: string) {
    return this.catalogService.changeTier(id, tier);
  }

  @Patch('books/:id/scope')
  async changeScope(@Param('id') id: string, @Body('scope') scope: string) {
    return this.catalogService.toggleScope(id, scope);
  }

  // ── CATEGORIES ─────────────────────────────────────────────────────────────
  @Get('categories')
  async getCategories(@Query('type') type?: string) {
    return this.catalogService.getCategories(type);
  }

  @Post('categories')
  async createCategory(
    @Body() body: { name: string; type?: string; parentId?: string },
  ) {
    return this.catalogService.createCategory(body);
  }

  // ── FILE UPLOAD (presigned URL flow) ────────────────────────────────────────
  @Get('books/:id/cover-upload-url')
  async getCoverUploadUrl(
    @Param('id') bookId: string,
    @Query('side') side: string,
    @Query('filename') filename: string,
    @Query('mimeType') mimeType: string,
  ) {
    return this.catalogService.getCoverUploadUrl(
      bookId,
      side as 'front' | 'back',
      filename,
      mimeType,
    );
  }

  @Get('books/:id/sample-upload-url')
  async getSampleUploadUrl(
    @Param('id') bookId: string,
    @Query('filename') filename: string,
    @Query('mimeType') mimeType: string,
  ) {
    return this.catalogService.getSampleUploadUrl(bookId, filename, mimeType);
  }

  // Backwards compatibility for main file upload
  @Post('books/:id/upload-url')
  async getUploadUrl(
    @Param('id') bookId: string,
    @Body() body: { format: string; filename: string; mimeType: string },
  ) {
    return this.catalogService.getBookUploadUrl(
      bookId,
      body.format,
      body.filename,
      body.mimeType,
    );
  }

  @Post('books/:id/confirm-upload')
  async confirmUpload(
    @Param('id') bookId: string,
    @Body()
    body: {
      format: string;
      fileUrl: string;
      fileSize: number;
      mimeType: string;
      s3Key: string;
      partIndex?: number;
    },
  ) {
    return this.catalogService.confirmBookUpload(bookId, body);
  }

  // Delete ONE format file (this PDF, this chapter's markdown) — the row and the
  // object in storage. Distinct from DELETE books/:id, which removes the book.
  @Delete('books/:id/formats/:formatId')
  async deleteBookFormat(
    @Param('id') bookId: string,
    @Param('formatId') formatId: string,
  ) {
    return this.catalogService.deleteBookFormat(bookId, formatId);
  }

  // ── AUDIOBOOK STRUCTURE ────────────────────────────────────────────────────
  @Get('books/:id/audiobook-structure')
  getAudiobookStructure(@Param('id') id: string) {
    return this.catalogService.getAudiobookStructure(id);
  }

  @Post('books/:id/chapters')
  createChapter(@Param('id') bookId: string, @Body() dto: CreateChapterDto) {
    return this.catalogService.createChapter(bookId, dto);
  }

  @Patch('books/:id/chapters/:chapterId')
  updateChapter(
    @Param('id') bookId: string,
    @Param('chapterId') chapterId: string,
    @Body() dto: UpdateChapterDto,
  ) {
    return this.catalogService.updateChapter(bookId, chapterId, dto);
  }

  @Delete('books/:id/chapters/:chapterId')
  deleteChapter(
    @Param('id') bookId: string,
    @Param('chapterId') chapterId: string,
  ) {
    return this.catalogService.deleteChapter(bookId, chapterId);
  }

  @Post('books/:id/chapters/:chapterId/sections')
  createSection(
    @Param('id') bookId: string,
    @Param('chapterId') chapterId: string,
    @Body() dto: CreateSectionDto,
  ) {
    return this.catalogService.createSection(bookId, chapterId, dto);
  }

  @Patch('books/:id/chapters/:chapterId/sections/:sectionId')
  updateSection(
    @Param('id') bookId: string,
    @Param('chapterId') chapterId: string,
    @Param('sectionId') sectionId: string,
    @Body() dto: UpdateSectionDto,
  ) {
    return this.catalogService.updateSection(bookId, chapterId, sectionId, dto);
  }

  @Delete('books/:id/chapters/:chapterId/sections/:sectionId')
  deleteSection(
    @Param('id') bookId: string,
    @Param('chapterId') chapterId: string,
    @Param('sectionId') sectionId: string,
  ) {
    return this.catalogService.deleteSection(bookId, chapterId, sectionId);
  }

  @Post('books/:id/sections/:sectionId/upload-url')
  getAudioUploadUrl(
    @Param('id') bookId: string,
    @Param('sectionId') sectionId: string,
    @Body()
    body: { gender: 'MALE' | 'FEMALE'; filename: string; mimeType: string },
  ) {
    return this.catalogService.getAudioUploadUrl(
      bookId,
      sectionId,
      body.gender,
      body.filename,
      body.mimeType,
    );
  }

  @Post('books/:id/sections/:sectionId/tracks')
  saveAudioTracks(
    @Param('id') bookId: string,
    @Param('sectionId') sectionId: string,
    @Body()
    body: {
      gender: 'MALE' | 'FEMALE';
      fileUrl: string;
      durationSeconds: number;
      fileSizeBytes?: number;
    },
  ) {
    return this.catalogService.saveAudioTracks(bookId, sectionId, body);
  }

  @Put('books/:id/audiobook-structure/reorder')
  reorderStructure(
    @Param('id') bookId: string,
    @Body() dto: ReorderStructureDto,
  ) {
    return this.catalogService.reorderStructure(bookId, dto);
  }
}
