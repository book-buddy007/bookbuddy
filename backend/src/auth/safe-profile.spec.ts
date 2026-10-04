import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { omitSensitiveUserFields } from './safe-user';

const FORBIDDEN = [
  'password',
  'googleId',
  'failedLoginAttempts',
  'lockedUntil',
  'lockReason',
  'metadata',
  'deletedAt',
];

describe('omitSensitiveUserFields', () => {
  it('drops credentials, lockout state and onboarding metadata but keeps the rest', () => {
    const row = {
      id: 'u1',
      email: 'a@x.test',
      password: '$2b$12$hash',
      googleId: 'g-1',
      failedLoginAttempts: 3,
      lockedUntil: new Date(),
      lockReason: 'too many attempts',
      metadata: { aadharNumber: '1234' },
      deletedAt: null,
      role: 'STUDENT',
    };
    const out = omitSensitiveUserFields(row);
    for (const field of FORBIDDEN) expect(out).not.toHaveProperty(field);
    expect(out).toMatchObject({ id: 'u1', email: 'a@x.test', role: 'STUDENT' });
    // The input is not mutated.
    expect(row.password).toBe('$2b$12$hash');
  });
});

describe('AuthService.getSessionProfile', () => {
  const makeService = (findUnique: jest.Mock) => {
    const service = Object.create(AuthService.prototype) as AuthService;
    (service as any).prisma = { user: { findUnique } };
    return service;
  };

  it('selects an explicit allow-list: nothing sensitive is even requested', async () => {
    const findUnique = jest.fn().mockResolvedValue({
      id: 'u1',
      email: 'a@x.test',
      tenantMemberships: [],
      joinRequests: [],
    });
    await makeService(findUnique).getSessionProfile('u1');

    const select = findUnique.mock.calls[0][0].select;
    for (const field of FORBIDDEN) expect(select).not.toHaveProperty(field);
    expect(select).toMatchObject({ id: true, email: true, role: true, emailVerified: true });
  });

  it('flattens memberships to the shape the clients read', async () => {
    const findUnique = jest.fn().mockResolvedValue({
      id: 'u1',
      tenantMemberships: [
        { tenantId: 't1', role: 'ADMIN', status: 'ACTIVE', tenant: { name: 'Academy', type: 'SCHOOL' } },
      ],
      joinRequests: [],
    });
    const result = await makeService(findUnique).getSessionProfile('u1');
    expect(result.tenantMemberships).toEqual([
      { tenantId: 't1', tenantName: 'Academy', tenantType: 'SCHOOL', role: 'ADMIN', status: 'ACTIVE' },
    ]);
  });

  it('rejects when the user no longer exists', async () => {
    const findUnique = jest.fn().mockResolvedValue(null);
    await expect(makeService(findUnique).getSessionProfile('gone')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
