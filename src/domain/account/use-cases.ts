import {
  requestPasswordReset,
  resetPasswordWithToken,
  signUpWithCredentials,
  type SignupInput,
  verifyEmailByToken,
} from '@/src/auth/account-lifecycle';
import { failure, success, type ServiceResult } from '@/src/domain/shared/result';

export type AccountError = {
  code: 'VALIDATION_ERROR' | 'NOT_FOUND' | 'FORBIDDEN' | 'CONFLICT';
  message: string;
};

function mapLifecycleError(error: string): AccountError {
  if (error === 'An account already exists for this email.') {
    return { code: 'CONFLICT', message: error };
  }

  if (
    error === 'Invalid verification token.' ||
    error === 'Verification token has expired.' ||
    error === 'Invalid password reset token.' ||
    error === 'Password reset token has expired.'
  ) {
    return { code: 'NOT_FOUND', message: error };
  }

  return { code: 'VALIDATION_ERROR', message: error };
}

export async function registerAccountUseCase(
  input: SignupInput,
): Promise<ServiceResult<{ userId: string; verificationToken: string }, AccountError>> {
  const result = await signUpWithCredentials(input);

  if (!result.ok) {
    return failure(mapLifecycleError(result.error));
  }

  return success({
    userId: result.userId,
    verificationToken: result.verificationToken,
  });
}

export async function requestAccountRecoveryUseCase(email: string): Promise<ServiceResult<{ requested: true }, never>> {
  await requestPasswordReset(email);
  return success({ requested: true });
}

export async function recoverAccountWithTokenUseCase(
  token: string,
  password: string,
): Promise<ServiceResult<{ recovered: true }, AccountError>> {
  const result = await resetPasswordWithToken(token, password);

  if (!result.ok) {
    return failure(mapLifecycleError(result.error));
  }

  return success({ recovered: true });
}

export async function verifyAccountEmailUseCase(token: string): Promise<ServiceResult<{ verified: true }, AccountError>> {
  const result = await verifyEmailByToken(token);

  if (!result.ok) {
    return failure(mapLifecycleError(result.error));
  }

  return success({ verified: true });
}
