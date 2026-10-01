import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PersonalLibraryService } from './personal-library.service';
import { BetterAuthGuard } from '../guards/better-auth.guard';
import { TenantResolverGuard } from '../guards/tenant-resolver.guard';
import { getTenantId } from '../common/tenant-context';
import {
  PresignUploadDto,
  ConfirmUploadDto,
  UpdateFileDto,
  SyncProgressDto,
  CreateFolderDto,
  UpdateFolderDto,
  BulkActionDto,
} from './dto/personal-library.dto';

@Controller('personal-library')
@UseGuards(BetterAuthGuard, TenantResolverGuard)
export class PersonalLibraryController {
  constructor(private readonly service: PersonalLibraryService) {}

  // ── FOLDERS ─────────────────────────────────────────────────────────────

  @Post('folders')
  @HttpCode(HttpStatus.CREATED)
  async createFolder(@Req() req: any, @Body() dto: CreateFolderDto) {
    return this.service.createFolder(req.user.id, dto);
  }

  @Patch('folders/:id')
  async updateFolder(
    @Req() req: any,
    @Param('id') folderId: string,
    @Body() dto: UpdateFolderDto,
  ) {
    return this.service.updateFolder(req.user.id, folderId, dto);
  }

  @Delete('folders/:id')
  async deleteFolder(@Req() req: any, @Param('id') folderId: string) {
    return this.service.deleteFolder(req.user.id, folderId);
  }

  // ── BULK ACTIONS ────────────────────────────────────────────────────────

  @Post('bulk')
  @HttpCode(HttpStatus.OK)
  async bulkAction(@Req() req: any, @Body() dto: BulkActionDto) {
    return this.service.bulkAction(req.user.id, dto);
  }

  // ── SEARCH & LISTING ────────────────────────────────────────────────────

  @Get('search')
  async search(@Req() req: any, @Query() query: any) {
    return this.service.search(req.user.id, query);
  }

  @Get('starred')
  async getStarred(@Req() req: any) {
    // Shorthand for get starred items
    return this.service.search(req.user.id, { isStarred: 'true' });
  }

  @Get()
  async listRoot(@Req() req: any, @Query('folderId') folderId?: string) {
    return this.service.getContents(req.user.id, folderId || null);
  }

  // ── QUOTA STATUS ────────────────────────────────────────────────────────

  @Get('quota')
  async getQuota(@Req() req: any) {
    const tenantId = getTenantId(req);
    return this.service.getQuotaStatus(req.user.id, tenantId);
  }

  // ── FILES: UPLOAD ───────────────────────────────────────────────────────

  @Post('presign')
  @HttpCode(HttpStatus.OK)
  async presignUpload(@Req() req: any, @Body() dto: PresignUploadDto) {
    const tenantId = getTenantId(req);
    return this.service.presignUpload(req.user.id, tenantId, dto);
  }

  @Post('confirm')
  @HttpCode(HttpStatus.CREATED)
  async confirmUpload(@Req() req: any, @Body() dto: ConfirmUploadDto) {
    const tenantId = getTenantId(req);
    return this.service.confirmUpload(req.user.id, tenantId, dto);
  }

  // ── FILES: QUERY & UPDATE ───────────────────────────────────────────────

  @Get('files/:id')
  async getFile(@Req() req: any, @Param('id') fileId: string) {
    return this.service.getFile(req.user.id, fileId);
  }

  @Get('files/:id/read-url')
  async getReadUrl(@Req() req: any, @Param('id') fileId: string) {
    return this.service.getReadUrl(req.user.id, fileId);
  }

  @Patch('files/:id')
  async updateFile(
    @Req() req: any,
    @Param('id') fileId: string,
    @Body() dto: UpdateFileDto,
  ) {
    return this.service.updateFile(req.user.id, fileId, dto);
  }

  @Patch('files/:id/progress')
  async syncProgress(
    @Req() req: any,
    @Param('id') fileId: string,
    @Body() dto: SyncProgressDto,
  ) {
    return this.service.syncProgress(req.user.id, fileId, dto);
  }

  @Delete('files/:id')
  async deleteFile(@Req() req: any, @Param('id') fileId: string) {
    return this.service.deleteFile(req.user.id, fileId);
  }
}
