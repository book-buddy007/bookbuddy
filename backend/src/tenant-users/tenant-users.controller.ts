import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { BetterAuthGuard } from '../guards/better-auth.guard';
import { TenantUsersService } from './tenant-users.service';

type SessionUser = { id: string; role: UserRole };

/**
 * An institution's members, for that institution's admins. Authorisation is by
 * membership in the tenant named in the path (see TenantUsersService), so there
 * is no global role check here: being an admin elsewhere confers nothing.
 */
@ApiTags('tenant-users')
@Controller('tenant-users')
@UseGuards(BetterAuthGuard)
export class TenantUsersController {
  constructor(private readonly tenantUsersService: TenantUsersService) {}

  @Get(':tenantId')
  async list(
    @Req() req: Request,
    @Param('tenantId') tenantId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
  ) {
    return this.tenantUsersService.list(req.user as SessionUser, tenantId, {
      page: page ? parseInt(page, 10) || 1 : undefined,
      limit: limit ? parseInt(limit, 10) || 20 : undefined,
      search,
      role,
      status,
    });
  }

  @Put(':tenantId/:userId/status')
  @HttpCode(HttpStatus.OK)
  async setStatus(
    @Req() req: Request,
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
    @Body('status') status: string,
  ) {
    return this.tenantUsersService.setStatus(req.user as SessionUser, tenantId, userId, status);
  }

  @Put(':tenantId/:userId/role')
  @HttpCode(HttpStatus.OK)
  async setRole(
    @Req() req: Request,
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
    @Body('role') role: string,
  ) {
    return this.tenantUsersService.setRole(req.user as SessionUser, tenantId, userId, role);
  }

  @Delete(':tenantId/:userId')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Req() req: Request,
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
  ) {
    return this.tenantUsersService.remove(req.user as SessionUser, tenantId, userId);
  }
}
