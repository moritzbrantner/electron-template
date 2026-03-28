'use server';

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';

import { authOptions } from '@/src/auth';
import {
  removeProfileImageUseCase,
  updateDisplayNameUseCase,
  updateProfileImageUseCase,
} from '@/src/domain/profile/use-cases';

export type UpdateProfileImageState = {
  error?: string;
  success?: boolean;
};

export type UpdateDisplayNameState = {
  error?: string;
  success?: boolean;
};

function revalidateProfileSurfaces() {
  revalidatePath('/');
  revalidatePath('/[locale]', 'layout');
  revalidatePath('/[locale]/profile');
}

export async function updateDisplayName(
  _previousState: UpdateDisplayNameState,
  formData: FormData,
): Promise<UpdateDisplayNameState> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return { error: 'You must be signed in to update your display name.' };
  }

  const rawDisplayName = formData.get('displayName');
  const displayName = typeof rawDisplayName === 'string' ? rawDisplayName : '';

  try {
    const result = await updateDisplayNameUseCase(userId, displayName);

    if (!result.ok) {
      return { error: result.error.message };
    }

    revalidateProfileSurfaces();
    return { success: true };
  } catch {
    return { error: 'Unable to update display name right now. Please try again.' };
  }
}

export async function updateProfileImage(
  _previousState: UpdateProfileImageState,
  formData: FormData,
): Promise<UpdateProfileImageState> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return { error: 'You must be signed in to update your profile picture.' };
  }

  const file = formData.get('image');

  if (!(file instanceof File)) {
    return { error: 'Please select an image file.' };
  }

  try {
    const result = await updateProfileImageUseCase(userId, file);

    if (!result.ok) {
      return { error: result.error.message };
    }

    revalidateProfileSurfaces();
    return { success: true };
  } catch {
    return { error: 'Unable to update profile picture right now. Please try again.' };
  }
}

export async function removeProfileImage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  if (!userId) {
    return;
  }

  const result = await removeProfileImageUseCase(userId);

  if (!result.ok) {
    return;
  }

  revalidateProfileSurfaces();
}
