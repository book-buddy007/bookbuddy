import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Request, Response } from 'express';
import { BetterAuthGuard } from '../guards/better-auth.guard';
import { TenantAdminService } from './tenant-admin.service';

type SessionUser = { id: string; role: UserRole };

/**
 * Dashboard numbers, overdue handling, analytics and borrowing policies for one institution.
 * Authorisation is by admin membership in the tenant in the path (see TenantAdminService).
 */
@ApiTags('tenant-admin')
@Controller('tenant-admin')
@UseGuards(BetterAuthGuard)
export class TenantAdminController {
  constructor(private readonly service: TenantAdminService) {}

  @Get(':tenantId/overview')
  overview(@Req() req: Request, @Param('tenantId') tenantId: string) {
    return this.service.overview(req.user as SessionUser, tenantId);
  }

  @Get(':tenantId/overdue')
  overdue(@Req() req: Request, @Param('tenantId') tenantId: string) {
    return this.service.overdue(req.user as SessionUser, tenantId);
  }

  @Post(':tenantId/overdue/remind')
  @HttpCode(HttpStatus.OK)
  remind(
    @Req() req: Request,
    @Param('tenantId') tenantId: string,
    @Body('loanIds') loanIds: unknown,
  ) {
    return this.service.sendReminders(req.user as SessionUser, tenantId, loanIds);
  }

  @Get(':tenantId/analytics')
  analytics(
    @Req() req: Request,
    @Param('tenantId') tenantId: string,
    @Query('range') range?: string,
  ) {
    return this.service.analytics(req.user as SessionUser, tenantId, range);
  }

  @Get(':tenantId/reports/:type')
  async report(
    @Req() req: Request,
    @Res() res: Response,
    @Param('tenantId') tenantId: string,
    @Param('type') type: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const { filename, csv } = await this.service.report(req.user as SessionUser, tenantId, type, from, to);
    res
      .status(HttpStatus.OK)
      .set({
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
      })
      .send(csv);
  }

  @Get(':tenantId/policies')
  getPolicies(@Req() req: Request, @Param('tenantId') tenantId: string) {
    return this.service.getPolicies(req.user as SessionUser, tenantId);
  }

  @Put(':tenantId/policies')
  @HttpCode(HttpStatus.OK)
  updatePolicies(
    @Req() req: Request,
    @Param('tenantId') tenantId: string,
    @Body() body: unknown,
  ) {
    return this.service.updatePolicies(req.user as SessionUser, tenantId, body);
  }
}
