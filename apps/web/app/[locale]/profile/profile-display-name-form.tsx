'use client';

import { useActionState } from 'react';

import { Button } from '@/components/ui/button';

import { type UpdateDisplayNameState, updateDisplayName } from './actions';

type ProfileDisplayNameFormProps = {
  currentDisplayName: string;
  labels: {
    label: string;
    placeholder: string;
    save: string;
    saving: string;
    success: string;
  };
};

const initialState: UpdateDisplayNameState = {};

export function ProfileDisplayNameForm({ currentDisplayName, labels }: ProfileDisplayNameFormProps) {
  const [state, formAction, isPending] = useActionState(updateDisplayName, initialState);

  return (
    <form action={formAction} className="space-y-3">
      <div className="space-y-2">
        <label htmlFor="displayName" className="text-sm font-medium">
          {labels.label}
        </label>
        <input
          id="displayName"
          name="displayName"
          type="text"
          minLength={2}
          maxLength={60}
          defaultValue={currentDisplayName}
          placeholder={labels.placeholder}
          className="block w-full rounded-md border border-zinc-300 p-2 text-sm dark:border-zinc-700"
          required
        />
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? labels.saving : labels.save}
      </Button>

      {state.error ? <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{labels.success}</p> : null}
    </form>
  );
}
