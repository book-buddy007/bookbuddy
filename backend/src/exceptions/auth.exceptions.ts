import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base class for all authentication-related exceptions
 * Provides consistent error response format with error codes
 */
export class AuthException extends HttpException {
  constructor(
    public readonly code: string,
    public readonly message: string,
    public readonly statusCode: HttpStatus = HttpStatus.UNAUTHORIZED,
    public readonly details?: any,
  ) {
    super(
      {
        success: false,
        error: {
          code,
          message,
          details,
        },
      },
      statusCode,
    );
  }
}

/**
 * Thrown when user provides invalid credentials (email/password)
 * Uses generic message to prevent information leakage
 */
export class InvalidCredentialsException extends AuthException {
  constructor(details?: any) {
    super(
      'INVALID_CREDENTIALS',
      'Invalid email or password',
      HttpStatus.UNAUTHORIZED,
      details,
    );
  }
}

/**
 * Thrown when access token has expired
 */
export class TokenExpiredException extends AuthException {
  constructor(details?: any) {
    super(
      'TOKEN_EXPIRED',
      'Access token has expired',
      HttpStatus.UNAUTHORIZED,
      details,
    );
  }
}

/**
 * Thrown when refresh token has been revoked or is invalid
 */
export class RefreshTokenRevokedException extends AuthException {
  constructor(details?: any) {
    super(
      'REFRESH_TOKEN_REVOKED',
      'Refresh token has been revoked or is invalid',
      HttpStatus.UNAUTHORIZED,
      details,
    );
  }
}

/**
 * Thrown when user tries to access a tenant they don't belong to
 */
export class InvalidTenantContextException extends AuthException {
  constructor(details?: any) {
    super(
      'INVALID_TENANT_CONTEXT',
      'You do not have access to this tenant',
      HttpStatus.FORBIDDEN,
      details,
    );
  }
}

/**
 * Thrown when MFA is required but secret is missing or invalid
 */
export class MissingMFASecretException extends AuthException {
  constructor(details?: any) {
    super(
      'MISSING_MFA_SECRET',
      'MFA is required but not configured',
      HttpStatus.FORBIDDEN,
      details,
    );
  }
}

/**
 * Thrown when MFA verification fails
 */
export class InvalidMFACodeException extends AuthException {
  constructor(details?: any) {
    super(
      'INVALID_MFA_CODE',
      'Invalid MFA code provided',
      HttpStatus.UNAUTHORIZED,
      details,
    );
  }
}

/**
 * Thrown when rate limit is exceeded
 */
export class RateLimitExceededException extends AuthException {
  constructor(retryAfter?: number, details?: any) {
    super(
      'RATE_LIMIT_EXCEEDED',
      retryAfter
        ? `Too many requests. Please try again after ${retryAfter} seconds`
        : 'Too many requests. Please try again later',
      HttpStatus.TOO_MANY_REQUESTS,
      { retryAfter, ...details },
    );
  }
}

/**
 * Thrown when account is locked due to failed login attempts
 */
export class AccountLockedException extends AuthException {
  constructor(lockedUntil?: Date, details?: any) {
    super(
      'ACCOUNT_LOCKED',
      lockedUntil
        ? `Account is locked until ${lockedUntil.toISOString()}`
        : 'Account is locked due to multiple failed login attempts',
      HttpStatus.FORBIDDEN,
      { lockedUntil, ...details },
    );
  }
}

/**
 * Thrown when email is not verified
 */
export class EmailNotVerifiedException extends AuthException {
  constructor(details?: any) {
    super(
      'EMAIL_NOT_VERIFIED',
      'Please verify your email address before logging in',
      HttpStatus.FORBIDDEN,
      details,
    );
  }
}

/**
 * Thrown when email verification token is invalid or expired
 */
export class InvalidVerificationTokenException extends AuthException {
  constructor(details?: any) {
    super(
      'INVALID_VERIFICATION_TOKEN',
      'Email verification token is invalid or has expired',
      HttpStatus.BAD_REQUEST,
      details,
    );
  }
}

/**
 * Thrown when password reset token is invalid or expired
 */
export class InvalidPasswordResetTokenException extends AuthException {
  constructor(details?: any) {
    super(
      'INVALID_PASSWORD_RESET_TOKEN',
      'Password reset token is invalid or has expired',
      HttpStatus.BAD_REQUEST,
      details,
    );
  }
}

/**
 * Thrown when user account is inactive
 */
export class AccountInactiveException extends AuthException {
  constructor(details?: any) {
    super(
      'ACCOUNT_INACTIVE',
      'Your account is inactive. Please contact support',
      HttpStatus.FORBIDDEN,
      details,
    );
  }
}

/**
 * Thrown when invitation token is required but missing
 */
export class InvitationTokenRequiredException extends AuthException {
  constructor(details?: any) {
    super(
      'INVITATION_TOKEN_REQUIRED',
      'Invitation token is required for this registration',
      HttpStatus.FORBIDDEN,
      details,
    );
  }
}

/**
 * Thrown when invitation token is invalid
 */
export class InvalidInvitationTokenException extends AuthException {
  constructor(details?: any) {
    super(
      'INVALID_INVITATION_TOKEN',
      'Invitation token is invalid or has expired',
      HttpStatus.BAD_REQUEST,
      details,
    );
  }
}

/**
 * Thrown when device is not verified (for device fingerprinting)
 */
export class DeviceNotVerifiedException extends AuthException {
  constructor(details?: any) {
    super(
      'DEVICE_NOT_VERIFIED',
      'This device needs to be verified before access is granted',
      HttpStatus.FORBIDDEN,
      details,
    );
  }
}

/**
 * Thrown when suspicious activity is detected
 */
export class SuspiciousActivityException extends AuthException {
  constructor(details?: any) {
    super(
      'SUSPICIOUS_ACTIVITY',
      'Suspicious activity detected. Additional verification required',
      HttpStatus.FORBIDDEN,
      details,
    );
  }
}

/**
 * Thrown when user doesn't have required permissions
 */
export class InsufficientPermissionsException extends AuthException {
  constructor(details?: any) {
    super(
      'INSUFFICIENT_PERMISSIONS',
      'You do not have permission to perform this action',
      HttpStatus.FORBIDDEN,
      details,
    );
  }
}
