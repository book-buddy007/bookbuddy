import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { FlashcardsService } from './flashcards.service';
import { BetterAuthGuard } from '../guards/better-auth.guard';
import { TenantResolverGuard } from '../guards/tenant-resolver.guard';
import { getTenantId } from '../common/tenant-context';

@Controller('flashcards')
@UseGuards(BetterAuthGuard, TenantResolverGuard)
export class FlashcardsController {
  constructor(private readonly flashcardsService: FlashcardsService) {}

  @Post('decks')
  async createDeck(@Req() req: any, @Body() body: any) {
    const userId = req.user.id;
    const tenantId = getTenantId(req);
    return this.flashcardsService.createDeck(userId, tenantId, body);
  }

  @Get('decks')
  async getDecks(@Req() req: any) {
    return this.flashcardsService.getDecks(req.user.id);
  }

  @Post('cards')
  async createCard(@Req() req: any, @Body() body: any) {
    return this.flashcardsService.createCard(req.user.id, body);
  }

  @Get('decks/:deckId/review')
  async getCardsForReview(@Req() req: any, @Param('deckId') deckId: string) {
    return this.flashcardsService.getCardsForReview(req.user.id, deckId);
  }

  @Post('cards/:cardId/review')
  async submitReview(
    @Req() req: any,
    @Param('cardId') cardId: string,
    @Body() body: { quality: number },
  ) {
    if (body.quality === undefined || body.quality < 0 || body.quality > 5) {
      throw new Error('Quality must be between 0 and 5');
    }
    return this.flashcardsService.submitReview(
      req.user.id,
      cardId,
      body.quality,
    );
  }
}
