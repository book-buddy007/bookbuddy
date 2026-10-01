import {
  Injectable,
  BadRequestException,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { SmsService } from '../sms/sms.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { LoggerService } from '../logger/logger.service';
import { OtpType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 5;
const MAX_SENDS_PER_WINDOW = 3;
const SEND_WINDOW_MINUTES = 10;

@Injectable()
export class OtpService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private smsService: SmsService,
    private whatsAppService: WhatsAppService,
    private logger: LoggerService,
  ) {
    this.logger.setContext('OtpService');
  }

  /**
   * Send OTP for email or phone verification
   * Derives destination from user's pendingEmail/pendingPhone — never from client
   */
  async sendOtp(
    userId: string,
    type: OtpType,
  ): Promise<{ success: boolean; expiresIn: number }> {
    // 1. Get user and determine destination
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        pendingEmail: true,
        pendingPhone: true,
        phone: true,
        emailVerified: true,
        phoneVerified: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    let destination: string;

    if (type === OtpType.EMAIL) {
      // For email verification: use pendingEmail if changing, or current email if unverified
      destination = user.pendingEmail || user.email;
      if (!destination) {
        throw new BadRequestException('No email address to verify');
      }
      // If email is already verified and there's no pending change, nothing to do
      if (user.emailVerified && !user.pendingEmail) {
        throw new BadRequestException('Email is already verified');
      }
    } else {
      // For phone: must have a pendingPhone (set during profile update)
      destination = user.pendingPhone || user.phone || '';
      if (!destination) {
        throw new BadRequestException(
          'No phone number to verify. Please add a phone number in your profile first.',
        );
      }
      if (user.phoneVerified && !user.pendingPhone) {
        throw new BadRequestException('Phone number is already verified');
      }
    }

    // 2. Check send rate limit at DB level
    const existingOtp = await this.prisma.otpVerification.findUnique({
      where: { userId_type: { userId, type } },
    });

    if (existingOtp) {
      const timeSinceCreated = Date.now() - existingOtp.createdAt.getTime();
      const minTimeBetweenSends = 60 * 1000; // 1 minute minimum between sends

      if (timeSinceCreated < minTimeBetweenSends) {
        const waitSeconds = Math.ceil(
          (minTimeBetweenSends - timeSinceCreated) / 1000,
        );
        throw new HttpException(
          `Please wait ${waitSeconds} seconds before requesting a new OTP`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    // 3. Generate 6-digit OTP
    const otp = this.generateOtp();

    // 4. Hash OTP with HMAC-SHA256
    const hashedOtp = this.hashOtp(otp);

    // 5. Upsert OTP record (auto-invalidates any previous OTP for this user+type)
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await this.prisma.otpVerification.upsert({
      where: { userId_type: { userId, type } },
      create: {
        userId,
        type,
        destination,
        hashedOtp,
        attempts: 0,
        expiresAt,
      },
      update: {
        destination,
        hashedOtp,
        attempts: 0, // Reset attempts on new OTP
        expiresAt,
        createdAt: new Date(), // Reset creation time
      },
    });

    // 6. Send OTP via appropriate channel
    let sent = false;

    if (type === OtpType.EMAIL) {
      sent = await this.emailService.sendOtpEmail(
        destination,
        otp,
        user.name || 'User',
      );
    } else {
      // Format to WhatsApp-compatible digits (e.g. 917272865002)
      const formattedPhone =
        this.whatsAppService.formatIndianNumber(destination);

      try {
        await this.whatsAppService.sendOtp(formattedPhone, otp);
        sent = true;
      } catch (err) {
        this.logger.warn(`WhatsApp failed, falling back to SMS for ${userId}`);
        sent = await this.smsService.sendOtp(formattedPhone, otp);
      }
    }

    if (!sent) {
      this.logger.warn(
        `Failed to deliver OTP to ${type}:${this.maskDestination(destination, type)}`,
      );
      // Don't throw — in dev mode, SMS/Email may not be configured
      // The OTP is stored and can be verified (useful for testing)
    }

    this.logger.log(
      `OTP sent for ${type} verification to ${this.maskDestination(destination, type)} for user ${userId}`,
    );

    const result: any = {
      success: true,
      expiresIn: OTP_EXPIRY_MINUTES * 60, // seconds
    };

    // In development, include OTP in response for testing
    // This is NEVER exposed in production
    if (process.env.NODE_ENV !== 'production') {
      result.devOtp = otp;
      this.logger.warn(`[DEV MODE] OTP for ${type}: ${otp}`);
    }

    return result;
  }

  /**
   * Send Email Verification Link
   */
  async sendVerificationLink(
    userId: string,
  ): Promise<{ success: boolean; expiresIn: number }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        pendingEmail: true,
        emailVerified: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const destination = user.pendingEmail || user.email;
    if (!destination) {
      throw new BadRequestException('No email address to verify');
    }
    if (user.emailVerified && !user.pendingEmail) {
      throw new BadRequestException('Email is already verified');
    }

    // Check rate limit
    const existingOtp = await this.prisma.otpVerification.findUnique({
      where: { userId_type: { userId, type: OtpType.EMAIL } },
    });

    if (existingOtp) {
      const timeSinceCreated = Date.now() - existingOtp.createdAt.getTime();
      const minTimeBetweenSends = 60 * 1000; // 1 minute

      if (timeSinceCreated < minTimeBetweenSends) {
        const waitSeconds = Math.ceil(
          (minTimeBetweenSends - timeSinceCreated) / 1000,
        );
        throw new HttpException(
          `Please wait ${waitSeconds} seconds before requesting a new verification link`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    // Generate token
    const rawToken = crypto.randomBytes(32).toString('base64url');
    const hashedToken = await bcrypt.hash(rawToken, 10);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const otpRecord = await this.prisma.otpVerification.upsert({
      where: { userId_type: { userId, type: OtpType.EMAIL } },
      create: {
        userId,
        type: OtpType.EMAIL,
        destination,
        hashedOtp: hashedToken,
        attempts: 0,
        expiresAt,
      },
      update: {
        destination,
        hashedOtp: hashedToken,
        attempts: 0,
        expiresAt,
        createdAt: new Date(),
      },
    });

    const verificationToken = `${otpRecord.id}::${rawToken}`;

    const sent = await this.emailService.sendVerificationEmail(
      destination,
      verificationToken,
      user.name || 'User',
    );

    if (!sent) {
      this.logger.warn(
        `Failed to deliver verification link to ${this.maskDestination(destination, OtpType.EMAIL)}`,
      );
    }

    this.logger.log(
      `Verification link sent to ${this.maskDestination(destination, OtpType.EMAIL)} for user ${userId}`,
    );

    const result: any = {
      success: true,
      expiresIn: 24 * 60 * 60,
    };

    if (process.env.NODE_ENV !== 'production') {
      result.devToken = verificationToken;
      this.logger.warn(`[DEV MODE] Verification Link: ${verificationToken}`);
    }

    return result;
  }

  /**
   * Verify an OTP and update user record atomically
   */
  async verifyOtp(
    userId: string,
    type: OtpType,
    otp: string,
  ): Promise<{ verified: boolean }> {
    // 1. Fetch OTP record
    const record = await this.prisma.otpVerification.findUnique({
      where: { userId_type: { userId, type } },
    });

    if (!record) {
      throw new BadRequestException(
        'No verification code found. Please request a new one.',
      );
    }

    // 2. Check expiry
    if (new Date() > record.expiresAt) {
      // Clean up expired record
      await this.prisma.otpVerification.delete({
        where: { id: record.id },
      });
      throw new BadRequestException(
        'Verification code has expired. Please request a new one.',
      );
    }

    // 3. Check attempt limit
    if (record.attempts >= MAX_ATTEMPTS) {
      // Delete the record — user must request fresh OTP
      await this.prisma.otpVerification.delete({
        where: { id: record.id },
      });
      throw new HttpException(
        'Too many failed attempts. Please request a new verification code.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 4. Compare OTP
    const isMatch = this.verifyOtpHash(otp, record.hashedOtp);

    if (!isMatch) {
      // Increment attempts
      await this.prisma.otpVerification.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });

      const remaining = MAX_ATTEMPTS - (record.attempts + 1);
      throw new BadRequestException(
        `Invalid verification code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`,
      );
    }

    // 5. SUCCESS — Atomic transaction: delete OTP + update user
    await this.prisma.$transaction(async (tx) => {
      // Delete the OTP record
      await tx.otpVerification.delete({
        where: { id: record.id },
      });

      if (type === OtpType.EMAIL) {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { pendingEmail: true },
        });

        if (user?.pendingEmail) {
          // Email change: copy pendingEmail → email
          await tx.user.update({
            where: { id: userId },
            data: {
              email: user.pendingEmail,
              emailVerified: true,
              pendingEmail: null,
            },
          });
        } else {
          // Initial email verification (no change, just verify)
          await tx.user.update({
            where: { id: userId },
            data: { emailVerified: true },
          });
        }
      } else {
        const user = await tx.user.findUnique({
          where: { id: userId },
          select: { pendingPhone: true },
        });

        if (user?.pendingPhone) {
          // Phone verification: copy pendingPhone → phone
          await tx.user.update({
            where: { id: userId },
            data: {
              phone: user.pendingPhone,
              phoneVerified: true,
              pendingPhone: null,
            },
          });
        } else {
          // Mark existing phone as verified
          await tx.user.update({
            where: { id: userId },
            data: { phoneVerified: true },
          });
        }
      }
    });

    this.logger.log(`${type} verified successfully for user ${userId}`);

    return { verified: true };
  }

  /**
   * Verify an Email Magic Link token
   */
  async verifyLink(token: string): Promise<{ verified: boolean }> {
    if (!token || !token.includes('::')) {
      throw new BadRequestException('Invalid verification link');
    }

    const separatorIndex = token.indexOf('::');
    if (separatorIndex === -1)
      throw new BadRequestException('Invalid token format');
    const recordId = token.substring(0, separatorIndex);
    const rawToken = token.substring(separatorIndex + 2);

    const record = await this.prisma.otpVerification.findUnique({
      where: { id: recordId },
    });

    if (!record || record.type !== OtpType.EMAIL) {
      throw new BadRequestException(
        'The verification link is invalid or has already been used.',
      );
    }

    if (new Date() > record.expiresAt) {
      await this.prisma.otpVerification.delete({ where: { id: record.id } });
      throw new BadRequestException(
        'Verification link has expired. Please request a new one.',
      );
    }

    if (record.attempts >= 10) {
      await this.prisma.otpVerification.delete({ where: { id: record.id } });
      throw new HttpException(
        'Link invalidated due to too many attempts',
        HttpStatus.GONE,
      );
    }

    const isMatch = await bcrypt.compare(rawToken, record.hashedOtp);

    if (!isMatch) {
      await this.prisma.otpVerification.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Invalid verification link.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.otpVerification.delete({ where: { id: record.id } });

      const user = await tx.user.findUnique({
        where: { id: record.userId },
        select: { pendingEmail: true },
      });

      if (user?.pendingEmail) {
        await tx.user.update({
          where: { id: record.userId },
          data: {
            email: user.pendingEmail,
            emailVerified: true,
            pendingEmail: null,
          },
        });
      } else {
        await tx.user.update({
          where: { id: record.userId },
          data: { emailVerified: true },
        });
      }
    });

    this.logger.log(
      `Email verification link used successfully for user ${record.userId}`,
    );

    return { verified: true };
  }

  /**
   * Generate a cryptographically secure 6-digit OTP
   */
  private generateOtp(): string {
    // Use crypto.randomInt for unbiased random numbers
    const otp = crypto.randomInt(0, Math.pow(10, OTP_LENGTH));
    return otp.toString().padStart(OTP_LENGTH, '0');
  }

  private hashOtp(otp: string): string {
    if (!process.env.OTP_HMAC_SECRET) {
      throw new Error('OTP_HMAC_SECRET is not configured');
    }
    return crypto
      .createHmac('sha256', process.env.OTP_HMAC_SECRET)
      .update(otp)
      .digest('hex');
  }

  private verifyOtpHash(submitted: string, stored: string): boolean {
    const a = Buffer.from(this.hashOtp(submitted), 'hex');
    const b = Buffer.from(stored, 'hex');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }

  /**
   * Mask destination for logging
   */
  private maskDestination(dest: string, type: OtpType): string {
    if (type === OtpType.EMAIL) {
      const [local, domain] = dest.split('@');
      if (!local || !domain) return '***';
      return `${local.slice(0, 2)}***@${domain}`;
    }
    if (dest.length <= 4) return '****';
    return '*'.repeat(dest.length - 4) + dest.slice(-4);
  }
}
