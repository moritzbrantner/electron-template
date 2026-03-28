'use server';

import { requestPasswordReset, resetPasswordWithToken, signUpWithCredentials } from '@/src/auth/account-lifecycle';

export type AccountActionState = {
  success?: boolean;
  error?: string;
};

export async function signUpAction(_previousState: AccountActionState, formData: FormData): Promise<AccountActionState> {
  const email = typeof formData.get('email') === 'string' ? (formData.get('email') as string) : '';
  const password = typeof formData.get('password') === 'string' ? (formData.get('password') as string) : '';
  const name = typeof formData.get('name') === 'string' ? (formData.get('name') as string) : undefined;

  const result = await signUpWithCredentials({ email, password, name });

  if (!result.ok) {
    return { error: result.error };
  }

  return { success: true };
}

export async function forgotPasswordAction(
  _previousState: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const email = typeof formData.get('email') === 'string' ? (formData.get('email') as string) : '';

  await requestPasswordReset(email);

  return { success: true };
}

export async function resetPasswordAction(_previousState: AccountActionState, formData: FormData): Promise<AccountActionState> {
  const token = typeof formData.get('token') === 'string' ? (formData.get('token') as string) : '';
  const password = typeof formData.get('password') === 'string' ? (formData.get('password') as string) : '';

  const result = await resetPasswordWithToken(token, password);
  if (!result.ok) {
    return { error: result.error };
  }

  return { success: true };
}
