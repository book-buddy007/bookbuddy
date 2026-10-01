import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  // Deliberately throws so error tracking can be verified end-to-end. Safe to
  // remove once GlitchTip wiring is confirmed.
  @Get('debug-sentry')
  triggerTestError() {
    throw new Error('GlitchTip test error — book-buddy-backend (safe to ignore)');
  }
}
