import { eq } from 'drizzle-orm';

import { getDb } from '@/src/db/client';
import { users } from '@/src/db/schema';
import { failure, success, type ServiceResult } from '@/src/domain/shared/result';
import { ImageValidationError, validateImageUpload } from '@/src/profile/image-validation';
import { deleteProfileImage, uploadProfileImage } from '@/src/profile/object-storage';

const DISPLAY_NAME_MIN_LENGTH = 2;
const DISPLAY_NAME_MAX_LENGTH = 60;

export type ProfileError = {
  code: 'VALIDATION_ERROR' | 'NOT_FOUND' | 'FORBIDDEN' | 'CONFLICT';
  message: string;
};

export type UpdateDisplayNamePayload = {
  displayName: string;
};

export type UpdateProfileImagePayload = {
  imageKey: string;
  imageUrl: string;
};

export async function updateDisplayNameUseCase(
  userId: string,
  rawDisplayName: string,
): Promise<ServiceResult<UpdateDisplayNamePayload, ProfileError>> {
  const displayName = rawDisplayName.trim();

  if (displayName.length < DISPLAY_NAME_MIN_LENGTH) {
    return failure({
      code: 'VALIDATION_ERROR',
      message: `Display name must be at least ${DISPLAY_NAME_MIN_LENGTH} characters.`,
    });
  }

  if (displayName.length > DISPLAY_NAME_MAX_LENGTH) {
    return failure({
      code: 'VALIDATION_ERROR',
      message: `Display name must be ${DISPLAY_NAME_MAX_LENGTH} characters or fewer.`,
    });
  }

  const existingUser = await getDb().query.users.findFirst({
    where: (table, { eq: innerEq }) => innerEq(table.id, userId),
  });

  if (!existingUser) {
    return failure({
      code: 'NOT_FOUND',
      message: 'User account was not found.',
    });
  }

  await getDb()
    .update(users)
    .set({ name: displayName, updatedAt: new Date() })
    .where(eq(users.id, userId));

  return success({
    displayName,
  });
}

export async function updateProfileImageUseCase(
  userId: string,
  file: File,
): Promise<ServiceResult<UpdateProfileImagePayload, ProfileError>> {
  const existingUser = await getDb().query.users.findFirst({
    where: (table, { eq: innerEq }) => innerEq(table.id, userId),
  });

  if (!existingUser) {
    return failure({
      code: 'NOT_FOUND',
      message: 'User account was not found.',
    });
  }

  try {
    const validated = await validateImageUpload(file);
    const uploaded = await uploadProfileImage(userId, validated);

    try {
      await getDb()
        .update(users)
        .set({ image: uploaded.key, updatedAt: new Date() })
        .where(eq(users.id, userId));
    } catch (error) {
      await deleteProfileImage(uploaded.key);
      throw error;
    }

    await deleteProfileImage(existingUser.image);

    return success({
      imageKey: uploaded.key,
      imageUrl: uploaded.url,
    });
  } catch (error) {
    if (error instanceof ImageValidationError) {
      return failure({
        code: 'VALIDATION_ERROR',
        message: error.message,
      });
    }

    throw error;
  }
}

export async function removeProfileImageUseCase(
  userId: string,
): Promise<ServiceResult<{ removed: true }, ProfileError>> {
  const existingUser = await getDb().query.users.findFirst({
    where: (table, { eq: innerEq }) => innerEq(table.id, userId),
  });

  if (!existingUser) {
    return failure({
      code: 'NOT_FOUND',
      message: 'User account was not found.',
    });
  }

  await getDb()
    .update(users)
    .set({ image: null, updatedAt: new Date() })
    .where(eq(users.id, userId));

  await deleteProfileImage(existingUser.image);

  return success({ removed: true });
}
