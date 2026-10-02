import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class EmailService {
  private resend: Resend;
  private fromEmail: string;
  private frontendUrl: string;
  private isConfigured: boolean;

  constructor(
    private configService: ConfigService,
    private logger: LoggerService,
  ) {
    this.logger.setContext('EmailService');

    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.isConfigured = !!apiKey;

    if (!apiKey) {
      this.logger.warn(
        'RESEND_API_KEY not configured. Email functionality will be disabled.',
      );
      // Initialize with a dummy key to prevent errors, but emails won't be sent
      this.resend = new Resend('re_dummy_key_for_development');
    } else {
      this.resend = new Resend(apiKey);
      this.logger.log('Email service initialized successfully with Resend');
    }

    this.fromEmail = this.configService.get<string>(
      'EMAIL_FROM',
      'Book Buddy <onboarding@resend.dev>',
    );
    this.frontendUrl = this.configService.get<string>(
      'FRONTEND_URL',
      'http://localhost:3000',
    );
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
    userName: string,
  ): Promise<boolean> {
    if (!this.isConfigured) {
      this.logger.warn(
        `Email not configured. Skipping password reset email to ${email}`,
      );
      return false;
    }

    try {
      const resetLink = `${this.frontendUrl}/reset-password?token=${resetToken}`;

      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: [email],
        subject: 'Reset Your Book Buddy Password',
        html: this.getPasswordResetTemplate(userName, resetLink),
      });

      if (error) {
        this.logger.error(
          `Failed to send password reset email to ${email}: ${error.message}`,
        );
        return false;
      }

      this.logger.log(
        `Password reset email sent successfully to ${email}. Email ID: ${data?.id}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Error sending password reset email: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /** Link to the confirmation page for a signed account-deletion token. */
  accountDeletionLink(token: string): string {
    return `${this.frontendUrl}/delete-account/confirm?token=${encodeURIComponent(token)}`;
  }

  /**
   * Account-deletion confirmation (public /delete-account flow). The link opens a page
   * with a button; nothing is deleted by following the link alone.
   */
  async sendAccountDeletionEmail(
    email: string,
    token: string,
    userName: string,
  ): Promise<boolean> {
    if (!this.isConfigured) {
      this.logger.warn(
        `Email not configured. Skipping account deletion email to ${email}`,
      );
      return false;
    }
    try {
      const link = this.accountDeletionLink(token);
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: [email],
        subject: 'Confirm deleting your Book Buddy account',
        html: this.getAccountDeletionTemplate(userName, link),
      });
      if (error) {
        this.logger.error(
          `Failed to send account deletion email to ${email}: ${error.message}`,
        );
        return false;
      }
      this.logger.log(
        `Account deletion email sent to ${email}. Email ID: ${data?.id}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Error sending account deletion email: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  private getAccountDeletionTemplate(userName: string, link: string): string {
    const safeName = String(userName).replace(/[<>&"]/g, '');
    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Confirm account deletion</title></head>
<body style="margin:0;padding:0;background:#F2F4F8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#0A0F24;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;"><tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="max-width:100%;background:#FFFFFF;border-radius:22px;overflow:hidden;">
      <tr><td style="background:#0A0F24;padding:28px 32px;">
        <p style="margin:0;color:#FFFFFF;font-size:20px;font-weight:800;">Book Buddy</p>
        <p style="margin:6px 0 0;color:#A9B4D0;font-size:14px;">Account deletion request</p>
      </td></tr>
      <tr><td style="padding:32px;">
        <p style="margin:0 0 16px;font-size:18px;font-weight:700;">Hello ${safeName},</p>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#4A5470;">
          We received a request to permanently delete your Book Buddy account. If you go ahead, your
          profile, reading history, notes, highlights, Varta conversations and uploaded files will be removed.
          This cannot be undone.
        </p>
        <p style="margin:28px 0;text-align:center;">
          <a href="${link}" style="display:inline-block;background:#E5283A;color:#FFFFFF;text-decoration:none;padding:14px 28px;border-radius:999px;font-weight:700;font-size:15px;">Review and delete my account</a>
        </p>
        <p style="margin:0 0 16px;font-size:13px;line-height:1.6;color:#4A5470;">
          The link works for 24 hours and opens a page where you confirm. If you didn't ask for this,
          ignore this email: nothing will be deleted.
        </p>
        <p style="margin:0;font-size:12px;color:#8E9AB8;word-break:break-all;">${link}</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
  }

  /**
   * Send welcome email to new users
   */
  async sendWelcomeEmail(
    email: string,
    userName: string,
    role: string,
  ): Promise<boolean> {
    if (!this.isConfigured) {
      this.logger.warn(
        `Email not configured. Skipping welcome email to ${email}`,
      );
      return false;
    }

    try {
      const dashboardLink = `${this.frontendUrl}/dashboard`;

      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: [email],
        subject: 'Welcome to Book Buddy - Your Digital Library Awaits!',
        html: this.getWelcomeTemplate(userName, role, dashboardLink),
      });

      if (error) {
        this.logger.error(
          `Failed to send welcome email to ${email}: ${error.message}`,
        );
        return false;
      }

      this.logger.log(
        `Welcome email sent successfully to ${email}. Email ID: ${data?.id}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Error sending welcome email: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Send email verification email
   */
  async sendVerificationEmail(
    email: string,
    verificationToken: string,
    userName: string,
  ): Promise<boolean> {
    if (!this.isConfigured) {
      this.logger.warn(
        `Email not configured. Skipping verification email to ${email}`,
      );
      return false;
    }

    try {
      const verificationLink = `${this.frontendUrl}/verify-email?token=${verificationToken}`;

      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: [email],
        subject: 'Verify Your Book Buddy Email Address',
        html: this.getVerificationTemplate(userName, verificationLink),
      });

      if (error) {
        this.logger.error(
          `Failed to send verification email to ${email}: ${error.message}`,
        );
        return false;
      }

      this.logger.log(
        `Verification email sent successfully to ${email}. Email ID: ${data?.id}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Error sending verification email: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Send OTP Email (for verification flow)
   */
  async sendOtpEmail(
    email: string,
    otp: string,
    userName: string,
  ): Promise<boolean> {
    if (!this.isConfigured) {
      this.logger.warn(
        `Email not configured. Skipping OTP email to ${email}. OTP: ${otp} (dev only log)`,
      );
      return false;
    }

    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: [email],
        subject: `${otp} is your Book Buddy Verification Code`,
        html: this.getOtpTemplate(userName, otp),
      });

      if (error) {
        this.logger.error(
          `Failed to send OTP email to ${email}: ${error.message}`,
        );
        return false;
      }

      this.logger.log(
        `OTP email sent successfully to ${email}. Email ID: ${data?.id}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Error sending OTP email: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Password Reset Email Template
   */
  private getPasswordResetTemplate(
    userName: string,
    resetLink: string,
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh;">
  <table width="100%" cellpadding="0" cellspacing="0" style="min-height: 100vh; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: white; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); overflow: hidden; max-width: 100%;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #06b6d4 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 32px; font-weight: 800; text-shadow: 0 2px 8px rgba(0,0,0,0.3);">🔐 Book Buddy</h1>
              <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px; font-weight: 600;">Password Reset Request</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #1e293b; font-size: 24px; font-weight: 700;">Hello ${userName},</h2>
              <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
                We received a request to reset your password for your Book Buddy account. Click the button below to create a new password:
              </p>
              
              <!-- Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #06b6d4 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-weight: 700; font-size: 16px; box-shadow: 0 8px 30px rgba(29,78,216,0.4); transition: all 0.3s;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0 0 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                Or copy and paste this link into your browser:<br>
                <a href="${resetLink}" style="color: #2563eb; word-break: break-all;">${resetLink}</a>
              </p>
              
              <div style="margin: 30px 0; padding: 20px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px;">
                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                  ⚠️ <strong>Security Notice:</strong> This link will expire in 1 hour. If you didn't request this password reset, please ignore this email or contact support if you have concerns.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">
                © ${new Date().getFullYear()} Book Buddy by VPD
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                This is an automated email. Please do not reply.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  /**
   * Welcome Email Template
   */
  private getWelcomeTemplate(
    userName: string,
    role: string,
    dashboardLink: string,
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Book Buddy</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh;">
  <table width="100%" cellpadding="0" cellspacing="0" style="min-height: 100vh; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: white; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); overflow: hidden; max-width: 100%;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #06b6d4 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 32px; font-weight: 800; text-shadow: 0 2px 8px rgba(0,0,0,0.3);">🎉 Welcome to Book Buddy!</h1>
              <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px; font-weight: 600;">Your Digital Library Awaits</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #1e293b; font-size: 24px; font-weight: 700;">Hello ${userName}! 👋</h2>
              <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
                Welcome to <strong>Book Buddy</strong> - Your digital library by VPD! We're thrilled to have you join our community as a <strong>${role}</strong>.
              </p>
              
              <div style="margin: 30px 0; padding: 25px; background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-radius: 12px; border: 2px solid #3b82f6;">
                <h3 style="margin: 0 0 15px 0; color: #1e40af; font-size: 18px; font-weight: 700;">🚀 Get Started:</h3>
                <ul style="margin: 0; padding-left: 20px; color: #1e40af;">
                  <li style="margin-bottom: 10px;">Access your personalized dashboard</li>
                  <li style="margin-bottom: 10px;">Browse our extensive digital library</li>
                  <li style="margin-bottom: 10px;">Manage your reading lists and favorites</li>
                  <li>Explore audiobooks, ebooks, and more!</li>
                </ul>
              </div>
              
              <!-- Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${dashboardLink}" style="display: inline-block; background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #06b6d4 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-weight: 700; font-size: 16px; box-shadow: 0 8px 30px rgba(29,78,216,0.4);">
                      Go to Dashboard
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0 0 0; color: #64748b; font-size: 14px; line-height: 1.6; text-align: center;">
                Need help? Contact our support team anytime!
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">
                © ${new Date().getFullYear()} Book Buddy by VPD
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                This is an automated email. Please do not reply.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  /**
   * Email Verification Template
   */
  private getVerificationTemplate(
    userName: string,
    verificationLink: string,
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh;">
  <table width="100%" cellpadding="0" cellspacing="0" style="min-height: 100vh; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: white; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); overflow: hidden; max-width: 100%;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #06b6d4 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 32px; font-weight: 800; text-shadow: 0 2px 8px rgba(0,0,0,0.3);">✉️ Book Buddy</h1>
              <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px; font-weight: 600;">Email Verification</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #1e293b; font-size: 24px; font-weight: 700;">Hello ${userName},</h2>
              <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
                Thank you for registering with Book Buddy! Please verify your email address to activate your account and unlock all features.
              </p>
              
              <!-- Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${verificationLink}" style="display: inline-block; background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #06b6d4 100%); color: white; text-decoration: none; padding: 16px 40px; border-radius: 12px; font-weight: 700; font-size: 16px; box-shadow: 0 8px 30px rgba(29,78,216,0.4);">
                      Verify Email Address
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0 0 0; color: #64748b; font-size: 14px; line-height: 1.6;">
                Or copy and paste this link into your browser:<br>
                <a href="${verificationLink}" style="color: #2563eb; word-break: break-all;">${verificationLink}</a>
              </p>
              
              <div style="margin: 30px 0; padding: 20px; background: #dbeafe; border-left: 4px solid #2563eb; border-radius: 8px;">
                <p style="margin: 0; color: #1e40af; font-size: 14px; line-height: 1.6;">
                  ℹ️ <strong>Note:</strong> This verification link will expire in 24 hours. If you didn't create an account with Book Buddy, please ignore this email.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">
                © ${new Date().getFullYear()} Book Buddy by VPD
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                This is an automated email. Please do not reply.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }

  /**
   * OTP Email Template
   */
  private getOtpTemplate(userName: string, otp: string): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Verification Code</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh;">
  <table width="100%" cellpadding="0" cellspacing="0" style="min-height: 100vh; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background: white; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); overflow: hidden; max-width: 100%;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #06b6d4 100%); padding: 40px 30px; text-align: center;">
              <h1 style="margin: 0; color: white; font-size: 32px; font-weight: 800; text-shadow: 0 2px 8px rgba(0,0,0,0.3);">🔑 Book Buddy</h1>
              <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px; font-weight: 600;">Security Verification</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="margin: 0 0 20px 0; color: #1e293b; font-size: 24px; font-weight: 700;">Hello ${userName},</h2>
              <p style="margin: 0 0 20px 0; color: #475569; font-size: 16px; line-height: 1.6;">
                Use the following 6-digit code to verify your action. This code will expire in 5 minutes.
              </p>
              
              <!-- OTP Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; background: #f8fafc; border: 2px dashed #cbd5e1; padding: 20px 40px; border-radius: 12px;">
                      <span style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #0f172a;">${otp}</span>
                    </div>
                  </td>
                </tr>
              </table>
              
              <div style="margin: 30px 0; padding: 20px; background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px;">
                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                  ⚠️ <strong>Security Notice:</strong> Don't share this code with anyone. Our team will never ask you for this code.
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 10px 0; color: #64748b; font-size: 14px;">
                © ${new Date().getFullYear()} Book Buddy by VPD
              </p>
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                This is an automated email. Please do not reply.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;
  }
}
