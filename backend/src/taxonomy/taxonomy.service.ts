import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TaxonomyService {
  constructor(private prisma: PrismaService) {}

  // ── SLUG HELPER ──────────────────────────────────────────────────────────

  private slugify(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  // ── CATEGORIES (Legacy Stubs) ───────────────────────────────────────────

  async listCategories(type?: string, parentId?: string) {
    return [];
  }

  async getCategory(id: string) {
    throw new NotFoundException('Categories are no longer supported');
  }

  async createCategory(dto: any) {
    throw new Error('Not implemented: Categories were removed in schema v2');
  }

  async updateCategory(id: string, dto: any) {
    throw new Error('Not implemented: Categories were removed in schema v2');
  }

  async deleteCategory(id: string) {
    return { success: true };
  }

  // ── TAGS (Legacy Stubs) ─────────────────────────────────────────────────

  async listTags(search?: string) {
    return [];
  }

  async getTag(id: string) {
    throw new NotFoundException('Tags are no longer supported');
  }

  async createTag(dto: any) {
    throw new Error('Not implemented: Tags were removed in schema v2');
  }

  async updateTag(id: string, dto: any) {
    throw new Error('Not implemented: Tags were removed in schema v2');
  }

  async deleteTag(id: string) {
    return { success: true };
  }
}
