'use client';

import { useActionState } from 'react';

import { Button } from '@/components/ui/button';
import type { TablePermissionView } from '@/src/domain/data-entry/use-cases';

import { createTableRow, type DataEntryState } from './actions';

type DataEntryLabels = {
  creating: string;
  createRow: string;
  fields: {
    bio: string;
    locale: string;
    timezone: string;
    email: string;
    name: string;
    role: string;
    action: string;
    outcome: string;
    statusCode: string;
    metadataJson: string;
    key: string;
    count: string;
    resetAt: string;
  };
};

type TableEntryFormProps = {
  table: TablePermissionView;
  labels: DataEntryLabels;
};

const initialState: DataEntryState = {};

export function TableEntryForm({ table, labels }: TableEntryFormProps) {
  const [state, formAction, isPending] = useActionState(createTableRow, initialState);

  return (
    <form action={formAction} className="space-y-3 rounded-lg border p-4 dark:border-zinc-800">
      <input type="hidden" name="table" value={table.table} />
      <h3 className="text-base font-semibold">{table.label}</h3>

      {table.table === 'Profile' ? (
        <>
          <Field label={labels.fields.bio} name="bio" />
          <Field label={labels.fields.locale} name="locale" placeholder="en" />
          <Field label={labels.fields.timezone} name="timezone" placeholder="Europe/Berlin" />
        </>
      ) : null}

      {table.table === 'User' ? (
        <>
          <Field label={labels.fields.email} name="email" type="email" required />
          <Field label={labels.fields.name} name="name" />
          <label className="block space-y-1 text-sm">
            <span className="font-medium">{labels.fields.role}</span>
            <select name="role" className="w-full rounded-md border border-zinc-300 p-2 dark:border-zinc-700">
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </label>
        </>
      ) : null}

      {table.table === 'SecurityAuditLog' ? (
        <>
          <Field label={labels.fields.action} name="action" required />
          <Field label={labels.fields.outcome} name="outcome" required />
          <Field label={labels.fields.statusCode} name="statusCode" type="number" required />
          <Field label={labels.fields.metadataJson} name="metadata" placeholder='{"key":"value"}' />
        </>
      ) : null}

      {table.table === 'SecurityRateLimitCounter' ? (
        <>
          <Field label={labels.fields.key} name="key" required />
          <Field label={labels.fields.count} name="count" type="number" required />
          <Field label={labels.fields.resetAt} name="resetAt" type="datetime-local" required />
        </>
      ) : null}

      <Button type="submit" disabled={isPending}>
        {isPending ? labels.creating : labels.createRow}
      </Button>

      {state.error ? <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-emerald-600 dark:text-emerald-400">{state.success}</p> : null}
    </form>
  );
}

type FieldProps = {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
};

function Field({ label, name, type = 'text', placeholder, required = false }: FieldProps) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-md border border-zinc-300 p-2 dark:border-zinc-700"
      />
    </label>
  );
}
