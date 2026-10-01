import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { BetterAuthGuard } from '../guards/better-auth.guard';
import { TenantResolverGuard } from '../guards/tenant-resolver.guard';
import { getTenantId } from '../common/tenant-context';

@Controller('analytics')
@UseGuards(BetterAuthGuard, TenantResolverGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  async getOverview(@Req() req: any) {
    const tenantId = getTenantId(req) ?? undefined;
    const userId = req.user.id;
    return this.analyticsService.getOverview(tenantId, userId);
  }

  @Get('history')
  async getHistory(@Req() req: any, @Query('days') days?: string) {
    const tenantId = getTenantId(req) ?? undefined;
    const userId = req.user.id;
    return this.analyticsService.getHistory(
      tenantId,
      userId,
      days ? parseInt(days, 10) : 7,
    );
  }

  @Get('goals')
  async getGoals(@Req() req: any) {
    const tenantId = getTenantId(req) ?? undefined;
    const userId = req.user.id;
    return this.analyticsService.getGoals(tenantId, userId);
  }
}
