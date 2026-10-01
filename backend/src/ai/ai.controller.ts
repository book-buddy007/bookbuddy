import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AiService } from './ai.service';
import { BetterAuthGuard } from '../guards/better-auth.guard';

@Controller('ai')
@UseGuards(BetterAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  async chat(
    @Req() req: any,
    @Body()
    body: { systemPrompt: string; userMessage: string; context: string },
  ) {
    return this.aiService.chat(
      body.systemPrompt,
      body.userMessage,
      body.context,
    );
  }
}
