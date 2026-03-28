import { getCurrentUser } from '@/src/auth/current-user';
import type { ProfileContract, UpdateProfileInput } from '@/lib/validation';

export async function getCurrentProfile(): Promise<ProfileContract | null> {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    displayName: 'Alex Example',
    bio: 'Building features with clear architecture boundaries.',
  };
}

export async function updateCurrentProfile(input: UpdateProfileInput): Promise<ProfileContract> {
  const profile = await getCurrentProfile();
  if (!profile) {
    throw new Error('Cannot update profile without an authenticated user');
  }

  return {
    ...profile,
    displayName: input.displayName,
    bio: input.bio ?? null,
  };
}
