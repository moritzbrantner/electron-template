import { describe, expect, it, vi } from 'vitest';

import {
  requestPasswordReset,
  resetPasswordWithToken,
  signUpWithCredentials,
  verifyEmailByToken,
} from '@/src/auth/account-lifecycle';

function createDeps() {
  return {
    findUserByEmail: vi.fn(),
    createUser: vi.fn(),
    issueToken: vi.fn(),
    findToken: vi.fn(),
    deleteToken: vi.fn(),
    deleteTokensByIdentifierPrefix: vi.fn(),
    markEmailVerified: vi.fn(),
    updatePassword: vi.fn(),
    updateFailureState: vi.fn(),
    clearFailureState: vi.fn(),
    findUserById: vi.fn(),
    hashPassword: vi.fn().mockResolvedValue('hashed-password'),
  };
}

describe('account lifecycle', () => {
  it('signs up users with hashed password and issues a verification token', async () => {
    const deps = createDeps();
    deps.findUserByEmail.mockResolvedValue(undefined);

    const result = await signUpWithCredentials(
      {
        email: '  NewUser@example.com ',
        password: 'VerySecure123',
        name: 'New User',
      },
      deps,
    );

    expect(result.ok).toBe(true);
    expect(deps.hashPassword).toHaveBeenCalledWith('VerySecure123');
    expect(deps.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'newuser@example.com',
        passwordHash: 'hashed-password',
      }),
    );
    expect(deps.issueToken).toHaveBeenCalledTimes(1);
  });

  it('verifies email using token and rejects expired tokens', async () => {
    const deps = createDeps();
    deps.findToken.mockResolvedValueOnce({
      identifier: 'email-verification:user_1',
      token: 'stored-token',
      expires: new Date(Date.now() + 60_000),
    });

    const okResult = await verifyEmailByToken('raw-token', deps);
    expect(okResult).toEqual({ ok: true });
    expect(deps.markEmailVerified).toHaveBeenCalledWith('user_1');

    deps.findToken.mockResolvedValueOnce({
      identifier: 'email-verification:user_1',
      token: 'expired-token',
      expires: new Date(Date.now() - 1),
    });

    const expiredResult = await verifyEmailByToken('expired-raw-token', deps);
    expect(expiredResult).toEqual({ ok: false, error: 'Verification token has expired.' });
    expect(deps.deleteToken).toHaveBeenCalledWith('expired-token');
  });

  it('issues and consumes password reset tokens', async () => {
    const deps = createDeps();
    deps.findUserByEmail.mockResolvedValue({
      id: 'user_2',
      email: 'person@example.com',
      failedSignInAttempts: 0,
      lockoutUntil: null,
    });

    const requestResult = await requestPasswordReset('person@example.com', deps);
    expect(requestResult.ok).toBe(true);
    expect(requestResult.token).toBeDefined();
    expect(deps.issueToken).toHaveBeenCalledTimes(1);

    deps.findToken.mockResolvedValue({
      identifier: 'password-reset:user_2',
      token: 'stored-reset-token',
      expires: new Date(Date.now() + 60_000),
    });

    const resetResult = await resetPasswordWithToken('raw-reset', 'AnotherSecure123', deps);
    expect(resetResult).toEqual({ ok: true });
    expect(deps.hashPassword).toHaveBeenCalledWith('AnotherSecure123');
    expect(deps.updatePassword).toHaveBeenCalledWith('user_2', 'hashed-password');
    expect(deps.deleteToken).toHaveBeenCalledWith('stored-reset-token');
  });
});
