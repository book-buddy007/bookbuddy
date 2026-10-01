import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TaxonomyService } from './taxonomy.service';
import { BetterAuthGuard } from '../guards/better-auth.guard';

// ── DTOs ──────────────────────────────────────────────────────────────────

class CreateCategoryDto {
  name: string;
  slug?: string;
  description?: string;
  parentId?: string;
  type?: 'GENRE' | 'SUBJECT' | 'LEVEL' | 'EXAM';
}

class CreateTagDto {
  name: string;
  slug?: string;
}

// ── CONTROLLER ────────────────────────────────────────────────────────────

@Controller('taxonomy')
@UseGuards(BetterAuthGuard)
export class TaxonomyController {
  constructor(private readonly taxonomyService: TaxonomyService) {}

  // ── CATEGORIES ──────────────────────────────────────────────────────────

  @Get('categories')
  async listCategories(
    @Query('type') type?: string,
    @Query('parentId') parentId?: string,
  ) {
    return this.taxonomyService.listCategories(type, parentId);
  }

  @Get('categories/:id')
  async getCategory(@Param('id') id: string) {
    return this.taxonomyService.getCategory(id);
  }

  @Post('categories')
  @HttpCode(HttpStatus.CREATED)
  async createCategory(@Body() dto: CreateCategoryDto) {
    return this.taxonomyService.createCategory(dto);
  }

  @Put('categories/:id')
  async updateCategory(
    @Param('id') id: string,
    @Body() dto: Partial<CreateCategoryDto>,
  ) {
    return this.taxonomyService.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  async deleteCategory(@Param('id') id: string) {
    return this.taxonomyService.deleteCategory(id);
  }

  // ── TAGS ────────────────────────────────────────────────────────────────

  @Get('tags')
  async listTags(@Query('search') search?: string) {
    return this.taxonomyService.listTags(search);
  }

  @Get('tags/:id')
  async getTag(@Param('id') id: string) {
    return this.taxonomyService.getTag(id);
  }

  @Post('tags')
  @HttpCode(HttpStatus.CREATED)
  async createTag(@Body() dto: CreateTagDto) {
    return this.taxonomyService.createTag(dto);
  }

  @Put('tags/:id')
  async updateTag(@Param('id') id: string, @Body() dto: Partial<CreateTagDto>) {
    return this.taxonomyService.updateTag(id, dto);
  }

  @Delete('tags/:id')
  async deleteTag(@Param('id') id: string) {
    return this.taxonomyService.deleteTag(id);
  }
}
