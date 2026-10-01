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
import { BetterAuthGuard } from '../guards/better-auth.guard';
import { TenantResolverGuard } from '../guards/tenant-resolver.guard';
import { getTenantId } from '../common/tenant-context';

@Controller('dictionary')
@UseGuards(BetterAuthGuard, TenantResolverGuard)
export class DictionaryController {
  constructor(private readonly dictionaryService: DictionaryService) {}

  @Get('lookup')
  async lookup(@Query('word') word: string) {
    if (!word) return null;
    return this.dictionaryService.lookup(word);
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
