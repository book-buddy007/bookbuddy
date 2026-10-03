import { ForbiddenException } from '@nestjs/common';
import { AuthService } from './auth.service';

/**
 * Public sign-up policy: closed unless PUBLIC_SIGNUP_ENABLED is exactly "true", and even then
 * anonymous callers can only create a trial student. Constructed directly with mocks so the spec
 * does not depend on the Nest testing module wiring.
 */
describe('AuthService public sign-up', () => {
  const build = (flag?: string, googleFlag?: string) => {
    const prisma = {
      user: {
        create: jest.fn(({ data }) => Promise.resolve({ id: 'u1', ...data })),
        findUnique: jest.fn(),
        update: jest.fn(({ data }) => Promise.resolve({ id: 'u1', ...data })),
      },
      auditLog: { create: jest.fn() },
      emailVerificationToken: { create: jest.fn() },
      session: { create: jest.fn() },
    };
    const config = {
      get: jest.fn((key: string) => {
        if (key === 'PUBLIC_SIGNUP_ENABLED') return flag;
        if (key === 'GOOGLE_SIGNUP_ENABLED') return googleFlag;
        return undefined;
      }),
    };
    const logger = {
      setContext: jest.fn(),
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    };
    const email = {
      sendVerificationEmail: jest.fn().mockResolvedValue(true),
      sendWelcomeEmail: jest.fn().mockResolvedValue(true),
    };
    const service = new AuthService(
      prisma as any,
      config as any,
      logger as any,
      email as any,
    );
    return { service, prisma };
  };

  const dto = (extra: Record<string, unknown> = {}) =>
    ({
      name: 'Test User',
      email: 'test@example.com',
      password: 'Str0ng!Passw0rd',
      ...extra,
    }) as any;

  describe('register', () => {
    it('is closed by default and creates nothing', async () => {
      const { service, prisma } = build(undefined);
      await expect(service.register(dto())).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it.each(['false', 'TRUE', '1', 'yes', ''])(
      'stays closed when PUBLIC_SIGNUP_ENABLED is %j',
      async (flag) => {
        const { service, prisma } = build(flag);
        await expect(service.register(dto())).rejects.toBeInstanceOf(
          ForbiddenException,
        );
        expect(prisma.user.create).not.toHaveBeenCalled();
      },
    );

    it('refuses to password-register the reserved owner address', async () => {
      const { service, prisma } = build('true');
      const original = (service as any).configService.get;
      (service as any).configService.get = jest.fn((key: string) =>
        key === 'SUPER_ADMIN_EMAIL' ? 'Owner@Example.com' : original(key),
      );
      await expect(
        service.register(dto({ email: ' owner@example.com ' })),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('creates a trial student when explicitly enabled', async () => {
      const { service, prisma } = build('true');
      const result = await service.register(dto());
      const data = prisma.user.create.mock.calls[0][0].data;
      expect(data).toMatchObject({
        role: 'STUDENT',
        accountType: 'INDEPENDENT',
        subscriptionTier: 'TRIAL',
        subscriptionStatus: 'TRIAL',
        emailVerified: false,
      });
      expect(data.password).not.toBe('Str0ng!Passw0rd'); // hashed
      expect(result).not.toHaveProperty('password');
    });

    it.each([
      'admin',
      'super-admin',
      'librarian',
      'teacher',
      'ADMIN',
      'SUPER_ADMIN',
    ])('refuses the %s role even with an invitation token', async (role) => {
      const { service, prisma } = build('true');
      await expect(
        service.register(
          dto({ role, invitationToken: 'a-made-up-token-1234' }),
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it.each(['student', 'STUDENT'])(
      'accepts an explicit %s role',
      async (role) => {
        const { service, prisma } = build('true');
        await service.register(dto({ role }));
        expect(prisma.user.create.mock.calls[0][0].data.role).toBe('STUDENT');
      },
    );

    it('ignores a requested paid tier', async () => {
      const { service, prisma } = build('true');
      await service.register(dto({ subscriptionTier: 'premium' }));
      expect(prisma.user.create.mock.calls[0][0].data.subscriptionTier).toBe(
        'TRIAL',
      );
    });
  });

  describe('googleSignIn', () => {
    const googleProfile = {
      email: 'new@example.com',
      name: 'New',
      googleId: 'g-1',
    };

    it('does not create a new account while sign-up is closed', async () => {
      const { service, prisma } = build(undefined);
      (service as any).verifyGoogleIdToken = jest
        .fn()
        .mockResolvedValue(googleProfile);
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.googleSignIn({ idToken: 't' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(prisma.session.create).not.toHaveBeenCalled();
    });

    it('still signs an existing user in while sign-up is closed', async () => {
      const { service, prisma } = build(undefined);
      (service as any).verifyGoogleIdToken = jest
        .fn()
        .mockResolvedValue(googleProfile);
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: googleProfile.email,
        name: 'New',
        role: 'STUDENT',
        googleId: 'g-1',
        isActive: true,
        lockedUntil: null,
      });
      const result = await service.googleSignIn({ idToken: 't' });
      expect(result.user.email).toBe(googleProfile.email);
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(prisma.session.create).toHaveBeenCalled();
    });

    it('GOOGLE_SIGNUP_ENABLED opens first-time Google sign-in but NOT POST /auth/register', async () => {
      const { service, prisma } = build(undefined, 'true');
      (service as any).verifyGoogleIdToken = jest
        .fn()
        .mockResolvedValue(googleProfile);
      prisma.user.findUnique.mockResolvedValue(null);
      await service.googleSignIn({ idToken: 't' });
      expect(prisma.user.create.mock.calls[0][0].data).toMatchObject({
        role: 'STUDENT',
        accountType: 'INDEPENDENT',
        subscriptionTier: 'TRIAL',
      });

      prisma.user.create.mockClear();
      await expect(service.register(dto())).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it.each(['false', 'TRUE', '1', 'yes', ''])(
      'stays closed when GOOGLE_SIGNUP_ENABLED is %j',
      async (googleFlag) => {
        const { service, prisma } = build(undefined, googleFlag);
        (service as any).verifyGoogleIdToken = jest
          .fn()
          .mockResolvedValue(googleProfile);
        prisma.user.findUnique.mockResolvedValue(null);
        await expect(
          service.googleSignIn({ idToken: 't' }),
        ).rejects.toBeInstanceOf(ForbiddenException);
        expect(prisma.user.create).not.toHaveBeenCalled();
      },
    );

    it('creates a student on first Google sign-in only when sign-up is enabled', async () => {
      const { service, prisma } = build('true');
      (service as any).verifyGoogleIdToken = jest
        .fn()
        .mockResolvedValue(googleProfile);
      prisma.user.findUnique.mockResolvedValue(null);
      await service.googleSignIn({ idToken: 't' });
      expect(prisma.user.create.mock.calls[0][0].data).toMatchObject({
        role: 'STUDENT',
        subscriptionTier: 'TRIAL',
      });
    });
  });
});
