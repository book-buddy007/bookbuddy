import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { LibraryService } from './library.service';
import { BetterAuthGuard } from '../guards/better-auth.guard';
import { TenantResolverGuard } from '../guards/tenant-resolver.guard';
import { getTenantId } from '../common/tenant-context';

@Controller('library')
@UseGuards(BetterAuthGuard, TenantResolverGuard)
export class LibraryController {
  constructor(private readonly libraryService: LibraryService) {}

  @Get('borrowed')
  async getBorrowedBooks(@Req() req: any) {
    const tenantId = getTenantId(req) ?? undefined;
    const userId = req.user.id;
    return this.libraryService.getBorrowedBooks(tenantId, userId);
  }

  @Get('history')
  async getBorrowHistory(@Req() req: any) {
    const tenantId = getTenantId(req) ?? undefined;
    const userId = req.user.id;
    return this.libraryService.getBorrowHistory(tenantId, userId);
  }

  @Get('saved')
  async getSavedBooks(@Req() req: any) {
    const tenantId = getTenantId(req) ?? undefined;
    const userId = req.user.id;
    return this.libraryService.getSavedBooks(tenantId, userId);
  }
}
