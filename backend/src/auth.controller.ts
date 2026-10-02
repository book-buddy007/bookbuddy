import {
  Controller,
  Post,
  Body,
  ValidationPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/email-verification.dto';
import { GoogleSignInDto } from './dto/google-signin.dto';
import { BetterAuthGuard } from './guards/better-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './auth/roles.decorator';
import { Request } from 'express';
import { Throttle } from '@nestjs/throttler';

@Controller('auth') // Base route for this controller is /auth
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register') // Route: POST /auth/register
  @HttpCode(HttpStatus.CREATED) // Set response status to 201 Created
  async register(@Body(ValidationPipe) registerDto: RegisterDto) {
    // ValidationPipe automatically validates the incoming body against RegisterDto rules
    return this.authService.register(registerDto);
  }

  @Post('login') // Route: POST /auth/login
  @HttpCode(HttpStatus.OK) // Set response status to 200 OK
  async login(@Body(ValidationPipe) loginDto: LoginDto) {
    // ValidationPipe automatically validates the incoming body against LoginDto rules
    return this.authService.login(loginDto);
  }

  @UseGuards(BetterAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request) {
    const user = req.user as { id: string };
    const sessionToken = (req as Request & { sessionToken?: string })
      .sessionToken;

    await this.authService.logout(user.id, { sessionToken });
    return { message: 'Logged out successfully' };
  }

  /** Ends every session on every device — for a suspected compromise. */
  @UseGuards(BetterAuthGuard)
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  async logoutAll(@Req() req: Request) {
    const user = req.user as { id: string };
    await this.authService.logout(user.id, { allDevices: true });
    return { message: 'Signed out on all devices' };
  }

  // Token refresh is handled by Better Auth's session management
  // The old JWT refresh endpoint has been removed

  @UseGuards(BetterAuthGuard)
  @Get('profile')
  getProfile(@Req() req: Request) {
    return req.user;
  }

  @Post('forgot-password') // Route: POST /auth/forgot-password
  @HttpCode(HttpStatus.OK) // Set response status to 200 OK
  async forgotPassword(
    @Body(ValidationPipe) forgotPasswordDto: ForgotPasswordDto,
  ) {
    // ValidationPipe automatically validates the incoming body against ForgotPasswordDto rules
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password') // Route: POST /auth/reset-password
  @HttpCode(HttpStatus.OK) // Set response status to 200 OK
  async resetPassword(
    @Body(ValidationPipe) resetPasswordDto: ResetPasswordDto,
  ) {
    // ValidationPipe automatically validates the incoming body against ResetPasswordDto rules
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Post('verify-email') // Route: POST /auth/verify-email
  @HttpCode(HttpStatus.OK) // Set response status to 200 OK
  async verifyEmail(@Body(ValidationPipe) verifyEmailDto: VerifyEmailDto) {
    // Verify user's email address using the token sent to their email
    return this.authService.verifyEmail(verifyEmailDto.token);
  }

  @UseGuards(BetterAuthGuard) // User must be logged in to resend verification
  @Post('resend-verification') // Route: POST /auth/resend-verification
  @HttpCode(HttpStatus.OK) // Set response status to 200 OK
  async resendVerification(@Req() req: Request) {
    // Resend verification email to the logged-in user
    const user = req.user as { id: string };
    return this.authService.resendVerificationEmail(user.id);
  }

  @Post('resend-verification-public') // Route: POST /auth/resend-verification-public
  // Unauthenticated and it sends mail to whatever address the caller names, so
  // the global 100/60s default is far too loose. Matches the authenticated
  // send-link limit in OtpController.
  // Two independent budgets, because either alone is insufficient:
  //   default — 10 per 10 min per client IP: stops one host mail-bombing many
  //             addresses. Deliberately not 3: this is a recovery-adjacent route
  //             and a shared school NAT must not lock out a whole institution.
  //   account —  3 per 10 min per target address: stops a botnet spread across
  //             many IPs from mail-bombing ONE person.
  //
  // Was `{ default: { limit: 3, ttl: 600000 } }` with this note:
  //   "the throttler keys on req.ip and Express trust proxy is never set, so
  //    behind the reverse proxy every request shares one bucket — this bounds the
  //    endpoint globally, not per-IP. That still closes the mail bomb; it is not
  //    yet per-caller fairness."
  // That reading was too generous. A global bucket on a recovery endpoint is not a
  // weaker limit awaiting an enhancement — it is an inverted control: three
  // unauthenticated requests suspended verification email for EVERY user for ten
  // minutes. Fixed by `trust proxy` in main.ts plus getTracker/generateKey in
  // guards/throttler.guard.ts. See audit finding BB-004.
  @Throttle({
    default: { limit: 10, ttl: 600000 },
    account: { limit: 3, ttl: 600000 },
  })
  @HttpCode(HttpStatus.OK) // Set response status to 200 OK
  async resendVerificationPublic(@Body('email') email: string) {
    // Resend verification email using email address (public endpoint)
    return this.authService.resendVerificationEmailByEmail(email);
  }

  @UseGuards(BetterAuthGuard, RolesGuard) // User must be logged in and have super-admin role
  @Roles('super-admin') // Only super-admins can unlock accounts
  @Post('unlock-account') // Route: POST /auth/unlock-account
  @HttpCode(HttpStatus.OK) // Set response status to 200 OK
  async unlockAccount(@Body('userId') userId: string, @Req() req: Request) {
    // Unlock a user account (admin only)
    const admin = req.user as { id: string };
    return this.authService.unlockAccount(userId, admin.id);
  }

  @Post('google-signin') // Route: POST /auth/google-signin
  @HttpCode(HttpStatus.OK) // Set response status to 200 OK
  async googleSignIn(@Body(ValidationPipe) googleSignInDto: GoogleSignInDto) {
    // Handle Google OAuth sign-in
    return this.authService.googleSignIn(googleSignInDto);
  }
}
