import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  InternalServerErrorException,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { LoggerService } from './logger/logger.service';
import { EmailService } from './email/email.service';
import {
  EmailNotVerifiedException,
  AccountLockedException,
} from './exceptions/auth.exceptions';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
    private readonly emailService: EmailService,
  ) {
    this.logger.setContext('AuthService');
  }

  /**
   * Public self-service sign-up is closed unless PUBLIC_SIGNUP_ENABLED=true, matching the
   * web app (better-auth `disableSignUp`): accounts are created by an administrator or through
   * the identity provider. Staff accounts are never created here.
   */
  private isPublicSignupEnabled(): boolean {
    return this.configService.get<string>('PUBLIC_SIGNUP_ENABLED') === 'true';
  }

  private assertPublicSignupOpen(): void {
    if (!this.isPublicSignupEnabled()) {
      throw new ForbiddenException(
        'Self-service sign-up is closed. Ask your institution administrator to create your account.',
      );
    }
  }

  /**
   * First-time Google sign-in creates an account, so it needs its own switch: it opens with
   * GOOGLE_SIGNUP_ENABLED=true (Google only) or with PUBLIC_SIGNUP_ENABLED=true (everything).
   * POST /auth/register deliberately ignores GOOGLE_SIGNUP_ENABLED.
   */
  private assertGoogleSignupOpen(): void {
    const googleOnly =
      this.configService.get<string>('GOOGLE_SIGNUP_ENABLED') === 'true';
    if (!googleOnly && !this.isPublicSignupEnabled()) {
      throw new ForbiddenException(
        'Self-service sign-up is closed. Ask your institution administrator to create your account.',
      );
    }
  }

  async register(
    registerDto: RegisterDto,
  ): Promise<{ id: string; email: string; name: string | null }> {
    const { email, password, name, role } = registerDto;

    this.assertPublicSignupOpen();

    // Anonymous callers can only ever create a trial student. `role` is accepted by the DTO for
    // older clients but any other value is refused; the old "invitation token" for staff roles was
    // only length-checked, never verified, so it is gone. `subscriptionTier` is likewise ignored:
    // a sign-up cannot grant itself a paid tier.
    if (role && role.toLowerCase() !== 'student') {
      throw new ForbiddenException(
        'Staff accounts are created by an administrator.',
      );
    }

    // Hash the password with 12 salt rounds for enhanced security
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const accountType = 'INDEPENDENT';
    const tier = 'TRIAL';
    const status = 'TRIAL';
    const trialEndsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days trial

    try {
      // Create the user in the database
      const user = await this.prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          role: 'STUDENT',
          accountType: accountType as any,
          subscriptionTier: tier,
          subscriptionStatus: status as any,
          trialEndsAt,
          isActive: true,
          emailVerified: false,
        },
      });

      // Log registration in audit log
      await this.prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'register',
          entityType: 'user',
          entityId: user.id,
          metadata: { accountType, role: user.role },
        },
      });

      // Generate email verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = await bcrypt.hash(verificationToken, 10);
      const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Create verification token in database
      await this.prisma.emailVerificationToken.create({
        data: {
          userId: user.id,
          token: hashedToken,
          expiresAt: tokenExpiresAt,
        },
      });

      // Send verification email (non-blocking)
      this.emailService
        .sendVerificationEmail(
          user.email,
          verificationToken,
          user.name || 'User',
        )
        .catch((error) => {
          this.logger.error(
            `Failed to send verification email to ${user.email}: ${error.message}`,
          );
        });

      // Send welcome email (non-blocking - don't wait for it)
      this.emailService
        .sendWelcomeEmail(user.email, user.name || 'User', user.role)
        .catch((error) => {
          this.logger.error(
            `Failed to send welcome email to ${user.email}: ${error.message}`,
          );
        });

      this.logger.log(
        `User registered successfully: ${user.email}. Verification email sent.`,
      );

      // Return user data excluding the password
      const { password: _, ...result } = user;
      return result;
    } catch (error) {
      // Use the directly imported error type from runtime
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          // Unique constraint failed
          throw new ConflictException('Email already exists');
        }
      }
      this.logger.error(`Registration Error: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Could not register user');
    }
  }

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (user && user.password && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user;
      return result; // Return user object without password if valid
    }
    return null; // Return null if invalid
  }

  async login(loginDto: LoginDto): Promise<{
    sessionToken: string;
    user: any;
  }> {
    const { email, password } = loginDto;

    // First, check if account exists and is locked (before validating password)
    const userRecord = await this.prisma.user.findUnique({ where: { email } });

    if (userRecord) {
      // Check if account is locked
      if (userRecord.lockedUntil && userRecord.lockedUntil > new Date()) {
        this.logger.warn(`Login attempt on locked account: ${email}`);

        // Track failed attempt due to lock
        await this.trackLoginAttempt(
          userRecord.id,
          email,
          false,
          'account_locked',
        );

        throw new AccountLockedException(userRecord.lockedUntil, {
          userId: userRecord.id,
          email: userRecord.email,
          lockedUntil: userRecord.lockedUntil,
          reason: userRecord.lockReason,
        });
      }

      // If lock has expired, clear it
      if (userRecord.lockedUntil && userRecord.lockedUntil <= new Date()) {
        await this.prisma.user.update({
          where: { id: userRecord.id },
          data: {
            lockedUntil: null,
            lockReason: null,
            failedLoginAttempts: 0,
          },
        });
        this.logger.log(`Account lock expired and cleared for: ${email}`);
      }
    }

    const user = await this.validateUser(email, password);

    if (!user) {
      // Track failed login attempt
      if (userRecord) {
        await this.handleFailedLogin(userRecord.id, email);
      }
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.isActive) {
      await this.trackLoginAttempt(user.id, email, false, 'account_inactive');
      throw new UnauthorizedException('Account is inactive');
    }

    // Check if email is verified
    if (!user.emailVerified) {
      this.logger.warn(`Login attempt with unverified email: ${user.email}`);
      await this.trackLoginAttempt(user.id, email, false, 'email_not_verified');
      throw new EmailNotVerifiedException({
        userId: user.id,
        email: user.email,
      });
    }

    // Fetch user's tenant memberships
    const tenantMemberships = await this.prisma.userTenantMembership.findMany({
      where: {
        userId: user.id,
        status: 'ACTIVE',
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            type: true,
            isActive: true,
          },
        },
      },
    });

    // Filter out inactive tenants
    const activeMemberships = tenantMemberships
      .filter((m) => m.tenant.isActive)
      .map((m) => ({
        tenantId: m.tenantId,
        tenantName: m.tenant.name,
        tenantType: m.tenant.type,
        role: m.role,
        status: m.status,
      }));

    // Create a Better Auth session in the database
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await this.prisma.session.create({
      data: {
        id: crypto.randomUUID(),
        token: sessionToken,
        userId: user.id,
        expiresAt,
        ipAddress: null,
        userAgent: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Reset failed login attempts on successful login
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lastLoginAt: new Date(),
      },
    });

    // Track successful login attempt
    await this.trackLoginAttempt(user.id, user.email, true, null);

    // Log login in audit log
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'login',
        entityType: 'user',
        entityId: user.id,
        metadata: {
          email: user.email,
          tenantCount: activeMemberships.length,
        },
      },
    });

    // Return session token and user data
    return {
      sessionToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        accountType: user.accountType,
        subscriptionTier: user.subscriptionTier,
        subscriptionStatus: user.subscriptionStatus,
        trialEndsAt: user.trialEndsAt ? user.trialEndsAt.toISOString() : null,
        subscriptionEndsAt: user.subscriptionEndsAt
          ? user.subscriptionEndsAt.toISOString()
          : null,
        tenantMemberships: activeMemberships,
      },
    };
  }

  /**
   * Sign out.
   *
   * With a `sessionToken` only that session ends, so signing out of the phone
   * leaves the browser signed in. Without one — or when `allDevices` is set —
   * every session is dropped, which is the behaviour you want from an explicit
   * "sign out everywhere" and from a suspected compromise.
   *
   * Refresh tokens are only revoked wholesale, since they are not tied to a
   * particular session record.
   */
  async logout(
    userId: string,
    options: { sessionToken?: string; allDevices?: boolean } = {},
  ): Promise<void> {
    const { sessionToken, allDevices } = options;

    if (sessionToken && !allDevices) {
      await this.prisma.session.deleteMany({
        where: { userId, token: sessionToken },
      });
    } else {
      await this.prisma.session.deleteMany({
        where: { userId },
      });
    }

    // Refresh tokens are session-independent, so they are revoked only when
    // the user is being signed out everywhere.
    if (!sessionToken || allDevices) {
      await this.prisma.refreshToken.updateMany({
        where: {
          userId,
          isRevoked: false,
        },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
        },
      });
    }

    // Log logout in audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'logout',
        entityType: 'user',
        entityId: userId,
        metadata: { revokedAll: true },
      },
    });
  }

  /**
   * Request password reset - generates a reset token and sends email
   * @param forgotPasswordDto - Contains user's email
   * @returns Success message (always returns success for security - don't reveal if email exists)
   */
  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ message: string }> {
    const { email } = forgotPasswordDto;

    try {
      // Find user by email
      const user = await this.prisma.user.findUnique({
        where: { email },
      });

      // SECURITY: Always return success message even if user doesn't exist
      // This prevents email enumeration attacks
      if (!user) {
        this.logger.warn(
          `Password reset requested for non-existent email: ${email}`,
        );
        return {
          message:
            'If an account with that email exists, a password reset link has been sent.',
        };
      }

      // Check if user account is active
      if (!user.isActive) {
        this.logger.warn(
          `Password reset requested for inactive account: ${email}`,
        );
        return {
          message:
            'If an account with that email exists, a password reset link has been sent.',
        };
      }

      // Generate a secure random token (32 bytes = 256 bits)
      const resetToken = crypto.randomBytes(32).toString('hex');

      // Hash the token before storing (same security principle as passwords)
      const hashedToken = await bcrypt.hash(resetToken, 10);

      // Token expires in 1 hour
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      // Invalidate any existing unused reset tokens for this user
      await this.prisma.passwordResetToken.updateMany({
        where: {
          userId: user.id,
          isUsed: false,
        },
        data: {
          isUsed: true,
          usedAt: new Date(),
        },
      });

      // Create new reset token
      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token: hashedToken,
          expiresAt,
        },
      });

      // Send password reset email
      const emailSent = await this.emailService.sendPasswordResetEmail(
        user.email,
        resetToken,
        user.name || 'User',
      );

      if (emailSent) {
        this.logger.log(`Password reset email sent successfully to ${email}`);
      } else {
        this.logger.warn(
          `Failed to send password reset email to ${email}, but token was created`,
        );
      }

      // Log the password reset request in audit log
      await this.prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'password_reset_requested',
          entityType: 'user',
          entityId: user.id,
          metadata: {
            email: user.email,
            emailSent,
          },
        },
      });

      return {
        message:
          'If an account with that email exists, a password reset link has been sent.',
      };
    } catch (error) {
      this.logger.error(`Forgot password error: ${error.message}`, error.stack);
      // Return generic success message even on error (security)
      return {
        message:
          'If an account with that email exists, a password reset link has been sent.',
      };
    }
  }

  /**
   * Reset password using the reset token
   * @param resetPasswordDto - Contains reset token and new password
   * @returns Success message
   */
  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    const { token, password } = resetPasswordDto;

    try {
      // Find all non-used, non-expired tokens
      const resetTokens = await this.prisma.passwordResetToken.findMany({
        where: {
          isUsed: false,
          expiresAt: {
            gt: new Date(),
          },
        },
        include: {
          user: true,
        },
      });

      // Find the matching token by comparing hashes
      let matchingResetToken: (typeof resetTokens)[0] | null = null;
      for (const resetTokenRecord of resetTokens) {
        const isMatch = await bcrypt.compare(token, resetTokenRecord.token);
        if (isMatch) {
          matchingResetToken = resetTokenRecord;
          break;
        }
      }

      if (!matchingResetToken) {
        throw new BadRequestException('Invalid or expired reset token');
      }

      // Check if user account is active
      if (!matchingResetToken.user.isActive) {
        throw new UnauthorizedException('Account is inactive');
      }

      // Hash the new password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Update user's password
      await this.prisma.user.update({
        where: { id: matchingResetToken.userId },
        data: {
          password: hashedPassword,
        },
      });

      // Login goes through better-auth, which checks the credential Account
      // row's password, not User.password above — the two are separate
      // tables. Without this, a reset "succeeds" but the new password never
      // actually works at login. Same bcrypt hash format works for both
      // (better-auth's verify() accepts $2a$/$2b$ regardless of which
      // library produced it), so the hash is reused rather than rehashed.
      const existingCredentialAccount = await this.prisma.account.findFirst({
        where: {
          userId: matchingResetToken.userId,
          providerId: 'credential',
        },
      });

      if (existingCredentialAccount) {
        await this.prisma.account.update({
          where: { id: existingCredentialAccount.id },
          data: { password: hashedPassword },
        });
      } else {
        await this.prisma.account.create({
          data: {
            id: crypto.randomUUID(),
            userId: matchingResetToken.userId,
            accountId: matchingResetToken.userId,
            providerId: 'credential',
            password: hashedPassword,
          },
        });
      }

      // Mark the reset token as used
      await this.prisma.passwordResetToken.update({
        where: { id: matchingResetToken.id },
        data: {
          isUsed: true,
          usedAt: new Date(),
        },
      });

      // Evict every existing session.
      //
      // Resetting a password is what someone does when they believe their
      // account is compromised. Revoking refresh tokens alone left the
      // attacker's active session working, which defeats the point — the
      // session table is what BetterAuthGuard actually checks.
      await this.prisma.session.deleteMany({
        where: { userId: matchingResetToken.userId },
      });

      // Revoke all existing refresh tokens for security
      await this.prisma.refreshToken.updateMany({
        where: {
          userId: matchingResetToken.userId,
          isRevoked: false,
        },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
        },
      });

      // Log the password reset in audit log
      await this.prisma.auditLog.create({
        data: {
          userId: matchingResetToken.userId,
          action: 'password_reset_completed',
          entityType: 'user',
          entityId: matchingResetToken.userId,
          metadata: {
            email: matchingResetToken.user.email,
          },
        },
      });

      this.logger.log(
        `Password reset successful for user: ${matchingResetToken.user.email}`,
      );

      return {
        message:
          'Password has been reset successfully. You can now log in with your new password.',
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error(`Reset password error: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Could not reset password');
    }
  }

  /**
   * Verify user's email address using verification token
   * @param token - Email verification token sent to user's email
   * @returns Success message
   */
  async verifyEmail(token: string): Promise<{ message: string }> {
    try {
      // Find all non-used, non-expired verification tokens
      const verificationTokens =
        await this.prisma.emailVerificationToken.findMany({
          where: {
            isUsed: false,
            expiresAt: {
              gt: new Date(),
            },
          },
          include: {
            user: true,
          },
        });

      // Find the matching token by comparing hashes
      let matchingToken: (typeof verificationTokens)[0] | null = null;
      for (const tokenRecord of verificationTokens) {
        const isMatch = await bcrypt.compare(token, tokenRecord.token);
        if (isMatch) {
          matchingToken = tokenRecord;
          break;
        }
      }

      if (!matchingToken) {
        throw new BadRequestException('Invalid or expired verification token');
      }

      // Check if email is already verified
      if (matchingToken.user.emailVerified) {
        return {
          message: 'Email is already verified. You can log in.',
        };
      }

      // Update user's emailVerified status
      await this.prisma.user.update({
        where: { id: matchingToken.userId },
        data: {
          emailVerified: true,
        },
      });

      // Mark the verification token as used
      await this.prisma.emailVerificationToken.update({
        where: { id: matchingToken.id },
        data: {
          isUsed: true,
          usedAt: new Date(),
        },
      });

      // Log the email verification in audit log
      await this.prisma.auditLog.create({
        data: {
          userId: matchingToken.userId,
          action: 'email_verified',
          entityType: 'user',
          entityId: matchingToken.userId,
          metadata: {
            email: matchingToken.user.email,
          },
        },
      });

      this.logger.log(
        `Email verified successfully for user: ${matchingToken.user.email}`,
      );

      return {
        message: 'Email verified successfully! You can now log in.',
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `Email verification error: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Could not verify email');
    }
  }

  /**
   * Resend email verification token to user (by user ID - requires authentication)
   * @param userId - ID of the user requesting resend
   * @returns Success message
   */
  async resendVerificationEmail(userId: string): Promise<{ message: string }> {
    try {
      // Find user by ID
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      return this.sendVerificationEmailToUser(user);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error(
        `Resend verification email error: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Could not resend verification email',
      );
    }
  }

  /**
   * Resend email verification token to user (by email - public endpoint)
   * @param email - Email address of the user
   * @returns Success message
   */
  async resendVerificationEmailByEmail(
    email: string,
  ): Promise<{ message: string }> {
    try {
      // Find user by email
      const user = await this.prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
      });

      if (!user) {
        // Don't reveal if user exists or not for security
        return {
          message:
            'If an account exists with this email, a verification link has been sent.',
        };
      }

      return this.sendVerificationEmailToUser(user);
    } catch (error) {
      this.logger.error(
        `Resend verification email by email error: ${error.message}`,
        error.stack,
      );
      // Return generic message to avoid revealing user existence
      return {
        message:
          'If an account exists with this email, a verification link has been sent.',
      };
    }
  }

  /**
   * Helper method to send verification email to a user
   * @param user - User object
   * @returns Success message
   */
  private async sendVerificationEmailToUser(
    user: any,
  ): Promise<{ message: string }> {
    // Check if email is already verified
    if (user.emailVerified) {
      return {
        message: 'Email is already verified.',
      };
    }

    // Check if user account is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    // Invalidate any existing unused verification tokens for this user
    await this.prisma.emailVerificationToken.updateMany({
      where: {
        userId: user.id,
        isUsed: false,
      },
      data: {
        isUsed: true,
        usedAt: new Date(),
      },
    });

    // Generate a new secure random token (32 bytes = 256 bits)
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Hash the token before storing
    const hashedToken = await bcrypt.hash(verificationToken, 10);

    // Token expires in 24 hours
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Create new verification token
    await this.prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        token: hashedToken,
        expiresAt,
      },
    });

    // Send verification email
    const emailSent = await this.emailService.sendVerificationEmail(
      user.email,
      verificationToken,
      user.name || 'User',
    );

    if (emailSent) {
      this.logger.log(
        `Verification email resent successfully to ${user.email}`,
      );
    } else {
      this.logger.warn(
        `Failed to send verification email to ${user.email}, but token was created`,
      );
    }

    // Log the resend request in audit log
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'verification_email_resent',
        entityType: 'user',
        entityId: user.id,
        metadata: {
          email: user.email,
          emailSent,
        },
      },
    });

    return {
      message: 'Verification email has been sent. Please check your inbox.',
    };
  }

  /**
   * Legacy method - kept for backward compatibility
   * @deprecated Use resendVerificationEmail or resendVerificationEmailByEmail instead
   */
  private async _legacyResendVerificationEmail(
    userId: string,
  ): Promise<{ message: string }> {
    try {
      // Find user by ID
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Check if email is already verified
      if (user.emailVerified) {
        return {
          message: 'Email is already verified.',
        };
      }

      // Check if user account is active
      if (!user.isActive) {
        throw new UnauthorizedException('Account is inactive');
      }

      // Invalidate any existing unused verification tokens for this user
      await this.prisma.emailVerificationToken.updateMany({
        where: {
          userId: user.id,
          isUsed: false,
        },
        data: {
          isUsed: true,
          usedAt: new Date(),
        },
      });

      // Generate a new secure random token (32 bytes = 256 bits)
      const verificationToken = crypto.randomBytes(32).toString('hex');

      // Hash the token before storing
      const hashedToken = await bcrypt.hash(verificationToken, 10);

      // Token expires in 24 hours
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      // Create new verification token
      await this.prisma.emailVerificationToken.create({
        data: {
          userId: user.id,
          token: hashedToken,
          expiresAt,
        },
      });

      // Send verification email
      const emailSent = await this.emailService.sendVerificationEmail(
        user.email,
        verificationToken,
        user.name || 'User',
      );

      if (emailSent) {
        this.logger.log(
          `Verification email resent successfully to ${user.email}`,
        );
      } else {
        this.logger.warn(
          `Failed to send verification email to ${user.email}, but token was created`,
        );
      }

      // Log the resend request in audit log
      await this.prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'verification_email_resent',
          entityType: 'user',
          entityId: user.id,
          metadata: {
            email: user.email,
            emailSent,
          },
        },
      });

      return {
        message: 'Verification email has been sent. Please check your inbox.',
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error(
        `Resend verification email error: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Could not resend verification email',
      );
    }
  }

  /**
   * Track login attempt (success or failure)
   * @param userId - User ID
   * @param email - Email used in login attempt
   * @param success - Whether login was successful
   * @param failureReason - Reason for failure (if applicable)
   */
  private async trackLoginAttempt(
    userId: string,
    email: string,
    success: boolean,
    failureReason: string | null,
  ): Promise<void> {
    try {
      await this.prisma.loginAttempt.create({
        data: {
          userId,
          email,
          success,
          failureReason,
          ipAddress: null, // TODO: Extract from request context
          userAgent: null, // TODO: Extract from request context
        },
      });
    } catch (error) {
      // Don't throw - just log the error
      this.logger.error(
        `Failed to track login attempt for ${email}: ${error.message}`,
      );
    }
  }

  /**
   * Handle failed login attempt
   * Increments counter and locks account after 5 failed attempts
   * @param userId - User ID
   * @param email - Email used in login attempt
   */
  private async handleFailedLogin(
    userId: string,
    email: string,
  ): Promise<void> {
    try {
      // Get current user data
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { failedLoginAttempts: true },
      });

      if (!user) return;

      const newAttemptCount = user.failedLoginAttempts + 1;
      const MAX_ATTEMPTS = 5;
      const LOCKOUT_DURATION_MINUTES = 30;

      if (newAttemptCount >= MAX_ATTEMPTS) {
        // Lock the account
        const lockedUntil = new Date();
        lockedUntil.setMinutes(
          lockedUntil.getMinutes() + LOCKOUT_DURATION_MINUTES,
        );

        await this.prisma.user.update({
          where: { id: userId },
          data: {
            failedLoginAttempts: newAttemptCount,
            lockedUntil,
            lockReason: `Account locked due to ${MAX_ATTEMPTS} consecutive failed login attempts`,
          },
        });

        // Log account lock in audit log
        await this.prisma.auditLog.create({
          data: {
            userId,
            action: 'account_locked',
            entityType: 'user',
            entityId: userId,
            metadata: {
              email,
              failedAttempts: newAttemptCount,
              lockedUntil: lockedUntil.toISOString(),
              reason: 'Too many failed login attempts',
            },
          },
        });

        this.logger.warn(
          `Account locked for ${email} due to ${newAttemptCount} failed login attempts. Locked until ${lockedUntil.toISOString()}`,
        );
      } else {
        // Just increment the counter
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            failedLoginAttempts: newAttemptCount,
          },
        });

        this.logger.warn(
          `Failed login attempt ${newAttemptCount}/${MAX_ATTEMPTS} for ${email}`,
        );
      }

      // Track the failed attempt
      await this.trackLoginAttempt(userId, email, false, 'invalid_password');
    } catch (error) {
      this.logger.error(
        `Error handling failed login for ${email}: ${error.message}`,
      );
    }
  }

  /**
   * Unlock a user account (admin only)
   * @param userId - User ID to unlock
   * @param adminId - Admin performing the unlock
   */
  async unlockAccount(
    userId: string,
    adminId: string,
  ): Promise<{ message: string }> {
    try {
      // Verify user exists
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          lockedUntil: true,
          failedLoginAttempts: true,
        },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Check if account is actually locked
      if (!user.lockedUntil || user.lockedUntil <= new Date()) {
        return { message: 'Account is not locked' };
      }

      // Unlock the account
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          lockedUntil: null,
          lockReason: null,
          failedLoginAttempts: 0,
        },
      });

      // Log the unlock action
      await this.prisma.auditLog.create({
        data: {
          userId: adminId,
          action: 'account_unlocked',
          entityType: 'user',
          entityId: userId,
          metadata: {
            targetEmail: user.email,
            previousFailedAttempts: user.failedLoginAttempts,
            unlockedBy: adminId,
          },
        },
      });

      this.logger.log(`Account unlocked for ${user.email} by admin ${adminId}`);

      return { message: 'Account unlocked successfully' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Unlock account error: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Could not unlock account');
    }
  }

  /**
   * Handle Google OAuth sign-in
   * Creates a new user if they don't exist, or returns existing user
   */
  /**
   * Verifies a Google ID token against our accepted OAuth client IDs and
   * returns the trusted profile. Throws UnauthorizedException on any failure
   * (bad signature, wrong audience, expired, unverified email).
   *
   * Accepted client IDs come from GOOGLE_OAUTH_CLIENT_IDS (comma-separated —
   * list every platform's client ID: web, Android, iOS), falling back to
   * GOOGLE_CLIENT_ID for a single-platform setup.
   */
  private async verifyGoogleIdToken(idToken: string): Promise<{
    email: string;
    name: string;
    image?: string;
    googleId: string;
  }> {
    const raw =
      this.configService.get<string>('GOOGLE_OAUTH_CLIENT_IDS') ||
      this.configService.get<string>('GOOGLE_CLIENT_ID') ||
      '';
    const audience = raw
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    if (audience.length === 0) {
      this.logger.error(
        'Google sign-in attempted but no GOOGLE_OAUTH_CLIENT_IDS / GOOGLE_CLIENT_ID configured',
      );
      throw new InternalServerErrorException(
        'Google sign-in is not configured on this server',
      );
    }

    let payload;
    try {
      const client = new OAuth2Client();
      const ticket = await client.verifyIdToken({ idToken, audience });
      payload = ticket.getPayload();
    } catch (error) {
      this.logger.warn(`Google ID token verification failed: ${error.message}`);
      throw new UnauthorizedException('Invalid Google credential');
    }

    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Invalid Google credential');
    }
    if (!payload.email || !payload.email_verified) {
      throw new UnauthorizedException(
        'Google account email is missing or not verified',
      );
    }

    return {
      email: payload.email,
      name: payload.name || payload.email.split('@')[0],
      image: payload.picture,
      googleId: payload.sub,
    };
  }

  async googleSignIn(googleSignInData: { idToken: string }): Promise<{
    user: {
      id: string;
      email: string;
      name: string | null;
      role: string;
    };
    sessionToken: string;
  }> {
    try {
      // Verify the Google ID token server-side BEFORE trusting any claim in it.
      // This is the security boundary: the client cannot forge email/googleId.
      const googleData = await this.verifyGoogleIdToken(
        googleSignInData.idToken,
      );

      // Check if user exists with this email
      let user = await this.prisma.user.findUnique({
        where: { email: googleData.email },
      });

      if (!user) {
        // Existing users can always sign in with Google; creating a new account is sign-up.
        this.assertGoogleSignupOpen();

        // Create new user with Google OAuth
        user = await this.prisma.user.create({
          data: {
            email: googleData.email,
            name: googleData.name,
            profilePicture: googleData.image,
            googleId: googleData.googleId,
            role: 'STUDENT', // Default role for Google sign-in
            accountType: 'INDEPENDENT',
            subscriptionTier: 'TRIAL',
            subscriptionStatus: 'TRIAL',
            trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days trial
            emailVerified: true, // Google emails are pre-verified
            isActive: true,
          },
        });

        this.logger.log(`New user created via Google OAuth: ${user.email}`);
      } else {
        // Update existing user with Google ID if not set
        if (!user.googleId) {
          user = await this.prisma.user.update({
            where: { id: user.id },
            data: {
              googleId: googleData.googleId,
              profilePicture: googleData.image || user.profilePicture,
              emailVerified: true, // Mark as verified since they signed in with Google
            },
          });
        }

        // Check if account is locked
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          throw new AccountLockedException(user.lockedUntil, {
            reason: user.lockReason,
          });
        }

        // Check if account is active
        if (!user.isActive) {
          throw new ForbiddenException(
            'Your account has been deactivated. Please contact support.',
          );
        }

        this.logger.log(`User signed in via Google OAuth: ${user.email}`);
      }

      // Create a Better Auth session
      const sessionToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      await this.prisma.session.create({
        data: {
          id: crypto.randomUUID(),
          token: sessionToken,
          userId: user.id,
          expiresAt,
          ipAddress: null,
          userAgent: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Update last login
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
        },
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        sessionToken,
      };
    } catch (error) {
      if (
        error instanceof AccountLockedException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      this.logger.error(`Google sign-in error: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Google sign-in failed');
    }
  }
}
