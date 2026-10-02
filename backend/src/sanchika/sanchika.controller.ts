import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SanchikaService } from './sanchika.service';
import { BetterAuthGuard } from '../guards/better-auth.guard';

/**
 * Read-only bridge to DigiClassroom's Sanchika notes.
 *
 * Note the shape of the query string: `bookId` and `limit` and nothing else.
 * There is deliberately no `subject`, `email` or `userId` parameter — the
 * service derives the caller's DCP identity from the session behind
 * `BetterAuthGuard`, so there is no value a client can change to read another
 * person's notebook.
 */
@Controller('sanchika')
@UseGuards(BetterAuthGuard)
export class SanchikaController {
  constructor(private readonly service: SanchikaService) {}

  @Get('notes')
  async listNotes(
    @Req() req: any,
    @Query('bookId') bookId?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Number.parseInt(limit, 10) : undefined;

    try {
      const result = await this.service.listNotes(req.user.id, {
        bookId: bookId?.trim() || undefined,
        limit: Number.isFinite(parsedLimit) ? parsedLimit : undefined,
      });
      return result;
    } catch {
      // The service already logged the cause. The panel needs to distinguish
      // "the bridge is down" from "you have no notes", and 503 is the
      // difference — an empty 200 would quietly look like an empty notebook.
      throw new ServiceUnavailableException(
        'Sanchika notes are temporarily unavailable',
      );
    }
  }
}
