import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { SuperAdminService } from '../services/super-admin.service';
import { BetterAuthGuard } from '../../guards/better-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { AuditAction } from '../../common/decorators/audit-action.decorator';
import { CreateInstitutionDto } from '../dto/create-institution.dto';
import { CreateSubscriptionPlanDto } from '../dto/create-subscription-plan.dto';
import { UpdateSubscriptionPlanDto } from '../dto/update-subscription-plan.dto';
import {
  CreatePaymentGatewayDto,
  UpdatePaymentGatewayDto,
} from '../dto/payment-gateway.dto';
import { UpdateTenantSubscriptionDto } from '../dto/tenant-subscription.dto';
import { InstitutionEntity } from '../entities/institution.entity';

@Controller('api/super-admin')
@UseGuards(BetterAuthGuard, RolesGuard)
@Roles('super-admin')
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  // Institution endpoints
  @Get('institutions')
  async getInstitutions() {
    return this.superAdminService.getInstitutions();
  }

  @Get('institutions/:id')
  async getInstitution(@Param('id') id: string) {
    return this.superAdminService.getInstitutionById(id);
  }

  @Post('institutions')
  @AuditAction('CREATE_INSTITUTION', 'tenant')
  async createInstitution(
    @Body() institutionData: CreateInstitutionDto,
  ): Promise<InstitutionEntity> {
    return this.superAdminService.createInstitution(institutionData);
  }

  @Put('institutions/:id')
  async updateInstitution(
    @Param('id') id: string,
    @Body() institutionData: any,
  ) {
    return this.superAdminService.updateInstitution(id, institutionData);
  }

  @Delete('institutions/:id')
  @AuditAction('DELETE_INSTITUTION', 'tenant')
  async deleteInstitution(@Param('id') id: string) {
    return this.superAdminService.deleteInstitution(id);
  }

  // Overview Dashboards
  @Get('overview/stats')
  async getOverviewStats() {
    return this.superAdminService.getOverviewStats();
  }

  // User management endpoints
  @Get('users/stats')
  async getUserStats(@Query('tenantId') tenantId?: string) {
    return this.superAdminService.getUserStats(tenantId);
  }

  @Get('users')
  async getUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.superAdminService.getUsers({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      search,
      role,
      status,
      tenantId,
    });
  }

  @Post('users')
  async createUser(@Body() userData: any) {
    return this.superAdminService.createUser(userData);
  }

  @Put('users/:id/toggle-status')
  async toggleUserStatus(@Param('id') id: string) {
    return this.superAdminService.toggleUserStatus(id);
  }

  @Put('users/:id/assign-tenant-role')
  async assignTenantRole(
    @Param('id') userId: string,
    @Body('tenantId') tenantId: string,
    @Body('role') role: string,
  ) {
    return this.superAdminService.assignTenantRole(userId, tenantId, role);
  }

  @Put('users/:id/assign-collections')
  @AuditAction('ASSIGN_COLLECTIONS', 'user')
  async assignCollections(
    @Param('id') userId: string,
    @Body('tenantId') tenantId: string,
    @Body('collections') collections: string[],
  ) {
    if (!tenantId) throw new BadRequestException('tenantId is required');
    if (!Array.isArray(collections))
      throw new BadRequestException('collections must be an array of strings');
    return this.superAdminService.assignCollections(
      userId,
      tenantId,
      collections,
    );
  }

  // Branding endpoints
  @Get('branding/:institutionId/upload-url')
  @AuditAction('GENERATE_UPLOAD_URL', 'tenant')
  async getBrandingUploadUrl(
    @Param('institutionId') institutionId: string,
    @Query('fileType') fileType: string,
    @Query('contentType') contentType: string,
  ) {
    if (!fileType || !contentType)
      throw new BadRequestException('fileType and contentType are required');
    return this.superAdminService.getBrandingUploadUrl(
      institutionId,
      fileType,
      contentType,
    );
  }

  @Get('branding/:institutionId')
  async getBranding(@Param('institutionId') institutionId: string) {
    return this.superAdminService.getBranding(institutionId);
  }

  @Put('branding/:institutionId')
  async updateBranding(
    @Param('institutionId') institutionId: string,
    @Body() brandingData: any,
  ) {
    return this.superAdminService.updateBranding(institutionId, brandingData);
  }

  @Post('branding/:institutionId/publish')
  async publishBranding(
    @Param('institutionId') institutionId: string,
    @Body('version') version: string,
  ) {
    return this.superAdminService.publishTenantBranding(
      institutionId,
      version || '1.0',
    );
  }

  @Post('branding/:institutionId/revert')
  async revertBranding(@Param('institutionId') institutionId: string) {
    return this.superAdminService.revertTenantBranding(institutionId);
  }

  // Audit log endpoints
  @Get('audit-logs')
  async getAuditLogs(
    @Query('tenantId') tenantId?: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('action') action?: string,
  ) {
    return this.superAdminService.getAuditLogs({
      tenantId,
      userId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      action,
    });
  }

  // ============================================
  // STORAGE ANALYTICS
  // ============================================
  @Get('storage/intelligence')
  async getStorageIntelligence() {
    return this.superAdminService.getStorageIntelligence();
  }

  @Post('storage/purge-trash')
  @AuditAction('PURGE_TRASH', 'storage')
  async purgeTrash(@Body('tenantId') tenantId?: string) {
    return this.superAdminService.purgeTrash(tenantId);
  }

  @Post('storage/notify')
  @AuditAction('NOTIFY_STORAGE_LIMIT', 'storage')
  async notifyInstitution(
    @Body('tenantId') tenantId: string,
    @Body('alertType') alertType: string,
  ) {
    if (!tenantId || !alertType) {
      throw new BadRequestException('tenantId and alertType are required');
    }
    return this.superAdminService.notifyInstitution(tenantId, alertType);
  }
}
