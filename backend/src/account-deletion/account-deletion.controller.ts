import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AccountDeletionService } from './account-deletion.service';
import { ConfirmAccountDeletionDto, RequestAccountDeletionDto } from './dto/account-deletion.dto';

/**
 * Public (unauthenticated) account deletion: the web form at /delete-account and the
 * confirmation page its emailed link opens. Rate-limited per IP and per email address,
 * like the other public recovery endpoints. Bodies are validated by the global pipe.
 */
@Controller('auth')
export class AccountDeletionController {
  constructor(private readonly deletion: AccountDeletionService) {}

  @Post('request-account-deletion')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 10, ttl: 600_000 }, account: { limit: 3, ttl: 600_000 } })
  async request(@Body() dto: RequestAccountDeletionDto) {
    await this.deletion.request(dto.email, dto.reason);
    // Same answer whether or not the account exists.
    return { ok: true };
  }

  @Post('confirm-account-deletion')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 600_000 } })
  async confirm(@Body() dto: ConfirmAccountDeletionDto) {
    return this.deletion.confirm(dto.token);
  }
}
