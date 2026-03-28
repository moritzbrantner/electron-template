'use client';

import Image from 'next/image';
import { useActionState } from 'react';

import { Button } from '@/components/ui/button';
import { imageConstraints } from '@/src/profile/image-validation';

import { removeProfileImage, type UpdateProfileImageState, updateProfileImage } from './actions';

type ProfileImageFormProps = {
  currentImage: string | null;
  labels: {
    upload: string;
    uploading: string;
    remove: string;
    chooseImage: string;
    hint: string;
    success: string;
    empty: string;
    alt: string;
  };
};

const initialState: UpdateProfileImageState = {};

export function ProfileImageForm({ currentImage, labels }: ProfileImageFormProps) {
  const [state, formAction, isPending] = useActionState(updateProfileImage, initialState);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative h-24 w-24 overflow-hidden rounded-full border border-zinc-300 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900">
          {currentImage ? (
            <Image src={currentImage} alt={labels.alt} fill sizes="96px" className="object-cover" unoptimized />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-zinc-500">{labels.empty}</div>
          )}
        </div>

        {currentImage ? (
          <form action={removeProfileImage}>
            <Button type="submit" variant="ghost">
              {labels.remove}
            </Button>
          </form>
        ) : null}
      </div>

      <form action={formAction} className="space-y-3">
        <div className="space-y-2">
          <label htmlFor="image" className="text-sm font-medium">
            {labels.chooseImage}
          </label>
          <input
            id="image"
            name="image"
            type="file"
            accept="image/png,image/jpeg"
            className="block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700"
            required
          />
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{labels.hint}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {`Max ${(imageConstraints.maxUploadBytes / (1024 * 1024)).toFixed(0)}MB · ${imageConstraints.minDimensionPx}-${imageConstraints.maxDimensionPx}px`}
          </p>
        </div>

        <Button type="submit" disabled={isPending}>
          {isPending ? labels.uploading : labels.upload}
        </Button>

        {state.error ? <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p> : null}
        {state.success ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{labels.success}</p> : null}
      </form>
    </div>
  );
}
