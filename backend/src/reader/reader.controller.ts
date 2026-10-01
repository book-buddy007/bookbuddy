import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ReaderService } from './reader.service';
import { BetterAuthGuard } from '../guards/better-auth.guard';
import { TenantResolverGuard } from '../guards/tenant-resolver.guard';
import { getTenantId } from '../common/tenant-context';

@Controller('reader')
@UseGuards(BetterAuthGuard, TenantResolverGuard)
export class ReaderController {
  constructor(private readonly readerService: ReaderService) {}

  @Patch('sync')
  async syncProgress(@Req() req: any, @Body() syncData: any) {
    const userId = req.user.id;
    const tenantId = getTenantId(req);
    const { bookId, ...data } = syncData;

    if (!bookId) {
      throw new Error('bookId is required');
    }

    return this.readerService.syncProgress(userId, tenantId, bookId, data);
  }

  @Get('sync/:bookId')
  async getProgress(@Req() req: any, @Param('bookId') bookId: string) {
    const userId = req.user.id;
    const progress = await this.readerService.getProgress(userId, bookId);

    return progress || { message: 'No progress found' };
  }

  @Post('books/:bookId/pages')
  async ingestPages(
    @Req() req: any,
    @Param('bookId') bookId: string,
    @Body() body: { pages: { pageIndex: number; content: string }[] },
  ) {
    const tenantId = getTenantId(req);
    if (!body.pages || !Array.isArray(body.pages)) {
      throw new Error('pages array is required');
    }
    return this.readerService.ingestPages(tenantId, bookId, body.pages);
  }

  @Get('books/:bookId/search')
  async searchPages(
    @Req() req: any,
    @Param('bookId') bookId: string,
    @Query('q') query: string,
  ) {
    const tenantId = getTenantId(req);
    if (!query) {
      return [];
    }
    return this.readerService.searchPages(tenantId, bookId, query);
  }
}
