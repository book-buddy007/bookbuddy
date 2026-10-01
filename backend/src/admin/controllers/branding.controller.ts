import {
  Controller,
  Post,
  Put,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { SuperAdminService } from '../services/super-admin.service';
import { BetterAuthGuard } from '../../guards/better-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';

@Controller('api/super-admin/branding')
@UseGuards(BetterAuthGuard, RolesGuard)
@Roles('super-admin')
export class BrandingController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @Post('logo')
  @UseInterceptors(FileInterceptor('file'))
  async uploadLogo(@UploadedFile() file: any, @Body() body: any) {
    if (!file) throw new BadRequestException('No file uploaded');

    const tenantId = body.tenantId;
    const mockUrl = `/uploads/${file.originalname}`;

    if (tenantId) {
      await this.superAdminService.updateTenantBrandingPartial(tenantId, {
        logo: mockUrl,
      });
    }

    return { url: mockUrl, success: true };
  }

  @Put('colors')
  async updateColors(@Body() config: any) {
    const tenantId = config.tenantId;
    if (tenantId) {
      await this.superAdminService.updateTenantBrandingPartial(tenantId, {
        colors: config.colors,
      });
    }
    return { success: true };
  }

  @Put('typography')
  async updateTypography(@Body() config: any) {
    const tenantId = config.tenantId;
    if (tenantId) {
      await this.superAdminService.updateTenantBrandingPartial(tenantId, {
        typography: config.typography,
      });
    }
    return { success: true };
  }
}
