import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { OtpService } from './otp.service';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { BetterAuthGuard } from '../guards/better-auth.guard';
import { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { OtpType } from '@prisma/client';

@Controller('user/verify')
export class OtpController {
  constructor(private readonly otpService: OtpService) {}

  @Post('send-otp')
  @UseGuards(BetterAuthGuard)
  // BB-004: was `{ default: { limit: 3, ttl: 600000 } }`, which — with the
  // throttler keyed on an unresolvable req.ip — was 3 sends per 10 minutes across
  // the WHOLE PLATFORM. Now per-IP and per-account, independently.
  @Throttle({
    default: { limit: 15, ttl: 600000 }, // per client IP (a school NAT is one IP)
    account: { limit: 3, ttl: 600000 },  // per user: the real anti-mail-bomb limit
  })
  async sendOtp(@Req() req: Request, @Body() sendOtpDto: SendOtpDto) {
    const user = req.user as { id: string };

    // Map DTO enum to Prisma enum
    const type = sendOtpDto.type === 'EMAIL' ? OtpType.EMAIL : OtpType.PHONE;

    return this.otpService.sendOtp(user.id, type);
  }

  @Post('check-otp')
  @UseGuards(BetterAuthGuard)
  // BB-004: brute-force protection belongs on the ACCOUNT, not the IP — an
  // attacker rotates IPs, a legitimate user does not. The per-IP budget stays
  // generous so shared-NAT users are not collateral.
  @Throttle({
    default: { limit: 60, ttl: 60000 }, // per client IP
    account: { limit: 10, ttl: 60000 }, // per user: guessing budget
  })
  async verifyOtp(@Req() req: Request, @Body() verifyOtpDto: VerifyOtpDto) {
    const user = req.user as { id: string };

    // Map DTO enum to Prisma enum
    const type = verifyOtpDto.type === 'EMAIL' ? OtpType.EMAIL : OtpType.PHONE;

    return this.otpService.verifyOtp(user.id, type, verifyOtpDto.otp);
  }

  @Post('send-link')
  @UseGuards(BetterAuthGuard)
  // BB-004: see sendOtp.
  @Throttle({
    default: { limit: 15, ttl: 600000 },
    account: { limit: 3, ttl: 600000 },
  })
  async sendLink(@Req() req: Request) {
    const user = req.user as { id: string };
    return this.otpService.sendVerificationLink(user.id);
  }

  @Post('check-link')
  // BB-004: unauthenticated and carries no account identifier, so
  // getTargetAccountKey() returns null and the account bucket falls back to the
  // IP suffix by design — never to a shared constant. Per-IP is the only
  // meaningful key here; raised from 10 because it was previously global.
  @Throttle({ default: { limit: 30, ttl: 300000 } })
  async checkLink(@Body() body: { token: string }) {
    if (!body?.token) {
      throw new BadRequestException('Verification link is required');
    }
    return this.otpService.verifyLink(body.token);
  }
}
