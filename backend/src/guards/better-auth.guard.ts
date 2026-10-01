import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import {
  readSessionTokenFromHeader,
  readSessionTokenFromRecord,
} from '../auth-cookies';

/**
 * Validates a Better Auth session from either:
 *  - `Authorization: Bearer <token>` header (native iOS/Android apps, API clients)
 *  - `better-auth.session_token` cookie (browser sessions via the Next.js app)
 */
@Injectable()
export class BetterAuthGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;
    let rawToken = '';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      rawToken = authHeader.split(' ')[1];
    } else {
      // Cookie names come from auth-cookies.ts so the prefix lives in one place.
      rawToken =
        readSessionTokenFromRecord(
          request.cookies as Record<string, string | undefined>,
        ) ||
        // Fall back to parsing the raw header if cookie-parser is not mounted.
        readSessionTokenFromHeader(request.headers.cookie);
    }

    if (!rawToken) {
      throw new UnauthorizedException('Missing authentication token');
    }

    // Better Auth cookies use "token.hmacSignature" format.
    // Strip the signature portion — only the token before the first dot is stored in MySQL.
    const token = rawToken.includes('.') ? rawToken.split('.')[0] : rawToken;

    const session = await this.prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    (request as Request & { user: typeof session.user }).user = session.user;

    // The normalised session token, so a handler can act on *this* session
    // rather than every session the user owns — logging out on one device
    // should not sign them out everywhere.
    (request as Request & { sessionToken: string }).sessionToken = token;

    return true;
  }
}
