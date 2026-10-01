import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AnnotationsService } from './annotations.service';
import { BetterAuthGuard } from '../guards/better-auth.guard';
import { TenantResolverGuard } from '../guards/tenant-resolver.guard';
import { getTenantId } from '../common/tenant-context';

@Controller('annotations')
@UseGuards(BetterAuthGuard, TenantResolverGuard)
export class AnnotationsController {
  constructor(private readonly annotationsService: AnnotationsService) {}

  @Get('book/:bookId')
  async getAnnotations(@Req() req: any, @Param('bookId') bookId: string) {
    const userId = req.user.id;
    const tenantId = getTenantId(req);

    return this.annotationsService.getPersonalAndSharedAnnotations(
      tenantId,
      userId,
      bookId,
    );
  }

  @Post()
  async upsertAnnotation(@Req() req: any, @Body() body: any) {
    const userId = req.user.id;
    const tenantId = getTenantId(req);

    return this.annotationsService.upsertAnnotation(userId, tenantId, body);
  }

  @Delete(':id')
  async deleteAnnotation(@Req() req: any, @Param('id') annotationId: string) {
    const userId = req.user.id;
    return this.annotationsService.deleteAnnotation(userId, annotationId);
  }
}
