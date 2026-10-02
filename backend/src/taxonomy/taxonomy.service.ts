import { GoneException, Injectable, NotFoundException } from '@nestjs/common';

/**
 * Legacy category/tag endpoints. Categories and tags were removed in schema v2
 * (catalog taxonomy now lives in BookTaxonomyService). Reads return empty lists
 * so older clients keep rendering; writes answer 410 Gone instead of pretending
 * to succeed.
 */
@Injectable()
export class TaxonomyService {
  // ── CATEGORIES ──────────────────────────────────────────────────────────

  listCategories(_type?: string, _parentId?: string): Promise<never[]> {
    return Promise.resolve([]);
  }

  getCategory(_id: string): Promise<never> {
    return Promise.reject(
      new NotFoundException('Categories are no longer supported'),
    );
  }

  createCategory(_dto: unknown): Promise<never> {
    return Promise.reject(removed('Categories'));
  }

  updateCategory(_id: string, _dto: unknown): Promise<never> {
    return Promise.reject(removed('Categories'));
  }

  deleteCategory(_id: string): Promise<never> {
    return Promise.reject(removed('Categories'));
  }

  // ── TAGS ────────────────────────────────────────────────────────────────

  listTags(_search?: string): Promise<never[]> {
    return Promise.resolve([]);
  }

  getTag(_id: string): Promise<never> {
    return Promise.reject(
      new NotFoundException('Tags are no longer supported'),
    );
  }

  createTag(_dto: unknown): Promise<never> {
    return Promise.reject(removed('Tags'));
  }

  updateTag(_id: string, _dto: unknown): Promise<never> {
    return Promise.reject(removed('Tags'));
  }

  deleteTag(_id: string): Promise<never> {
    return Promise.reject(removed('Tags'));
  }
}

function removed(what: string) {
  return new GoneException(`${what} were removed from the catalog`);
}
