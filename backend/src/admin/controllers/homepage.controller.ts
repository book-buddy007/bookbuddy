import {
  Controller,
  Post,
  Put,
  Get,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { SuperAdminService } from '../services/super-admin.service';
import { BetterAuthGuard } from '../../guards/better-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';

@Controller('api/super-admin/homepage')
@UseGuards(BetterAuthGuard, RolesGuard)
@Roles('super-admin')
export class HomepageController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @Put('sections/order')
  async updateSectionsOrder(@Body() config: any) {
    const tenantId = config.tenantId;
    if (tenantId) {
      await this.superAdminService.updateTenantBrandingPartial(tenantId, {
        sectionsOrder: config.order,
      });
    }
    return { success: true };
  }

  @Put('gallery')
  @UseInterceptors(FilesInterceptor('files'))
  async updateGallery(@UploadedFiles() files: any[], @Body() body: any) {
    const tenantId = body.tenantId;
    const urls = files
      ? files.map((f) => `/uploads/webp/${f.originalname}`)
      : [];

    // In a real app we would compress to WebP here
    if (tenantId && urls.length > 0) {
      await this.superAdminService.updateTenantBrandingPartial(tenantId, {
        gallery: urls,
      });
    }

    return { urls, success: true };
  }

  @Post('publish')
  async publishHomepage(@Body() config: any) {
    const tenantId = config.tenantId;
    const version = config.version || `v-${Date.now()}`;

    if (tenantId) {
      await this.superAdminService.publishTenantBranding(tenantId, version);
    }

    return {
      publishedAt: new Date().toISOString(),
      version,
      success: true,
    };
  }

  @Get('last-published')
  async getLastPublished() {
    // In a real multi-tenant system this would use tenantId from query or headers.
    // For now we can just return a generic response or fetch the first tenant's published state.
    const published = await this.superAdminService.getAnyPublishedBranding();
    return published || {};
  }
}
