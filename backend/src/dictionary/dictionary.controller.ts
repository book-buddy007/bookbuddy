import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { DictionaryService } from './dictionary.service';
import { InBookService } from './in-book.service';
import { BookAccessService } from '../common/book-access.service';
import { BetterAuthGuard } from '../guards/better-auth.guard';
import { TenantResolverGuard } from '../guards/tenant-resolver.guard';
import { getTenantId } from '../common/tenant-context';

@Controller('dictionary')
@UseGuards(BetterAuthGuard, TenantResolverGuard)
export class DictionaryController {
  constructor(
    private readonly dictionaryService: DictionaryService,
    private readonly inBook: InBookService,
    private readonly bookAccess: BookAccessService,
  ) {}

  @Get('lookup')
  async lookup(@Query('word') word: string) {
    if (!word) return null;
    return this.dictionaryService.lookup(word);
  }

  /**
   * What the book itself says about a term: the sentence that defines it, or where it is used, with the page.
   * Separate from `lookup` so the student sees it as soon as it is ready, whatever the outside dictionaries
   * are doing. The caller must be allowed to read the book, like every other book-scoped read.
   */
  @Get('in-book')
  async inBookDefinition(@Req() req: any, @Query('bookId') bookId: string, @Query('term') term: string) {
    if (!bookId || !term) return { found: false };
    await this.bookAccess.assertCanRead(req.user.id, bookId);
    const result = await this.inBook.find(bookId, term);
    return result ? { found: true, ...result } : { found: false };
  }

  @Get('define')
  async define(@Query('word') word: string) {
    if (!word) return null;
    return this.dictionaryService.defineWord(word);
  }

  @Get('wiki')
  async getWiki(@Query('q') query: string) {
    if (!query) return null;
    return this.dictionaryService.getWikipediaExtract(query);
  }

  @Post('vocabulary')
  async saveVocabulary(@Req() req: any, @Body() body: any) {
    const userId = req.user.id;
    const tenantId = getTenantId(req);

    if (!body.word) throw new Error('Word is required');
    return this.dictionaryService.saveVocabulary(userId, tenantId, body);
  }

  @Get('vocabulary')
  async getVocabulary(@Req() req: any, @Query('bookId') bookId?: string) {
    const userId = req.user.id;
    return this.dictionaryService.getVocabulary(userId, bookId);
  }
}
