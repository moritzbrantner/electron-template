import { parseUpdateProfileInput, type ProfileContract } from '@/lib/validation';

import { getCurrentProfile, updateCurrentProfile } from '@/src/profile/demo-profile-service';

export async function getProfileViewModel(): Promise<ProfileContract | null> {
  return getCurrentProfile();
}

export async function updateProfileFromForm(formData: FormData): Promise<ProfileContract> {
  const input = parseUpdateProfileInput({
    displayName: formData.get('displayName'),
    bio: formData.get('bio'),
  });

  return updateCurrentProfile(input);
}
