'use server';

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';

import { authOptions } from '@/src/auth';
import { getDb } from '@/src/db/client';
import { profiles, securityAuditLogs, securityRateLimitCounters, users } from '@/src/db/schema';
import { canWriteTable } from '@/src/domain/data-entry/table-permissions';
import { isManagedTable } from '@/src/domain/data-entry/use-cases';

type DataEntryState = {
  error?: string;
  success?: string;
};

function revalidateDataEntry() {
  revalidatePath('/[locale]/data-entry');
}

export async function createTableRow(
  _previousState: DataEntryState,
  formData: FormData,
): Promise<DataEntryState> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const role = session?.user?.role;

  if (!userId || !role) {
    return { error: 'You must be signed in.' };
  }

  const rawTable = formData.get('table');

  if (typeof rawTable !== 'string' || !isManagedTable(rawTable)) {
    return { error: 'A target table is required.' };
  }

  const table = rawTable;

  if (!canWriteTable(role, table)) {
    return { error: `Your role does not have write access to ${table}.` };
  }

  const db = getDb();

  try {
    if (table === 'Profile') {
      const bio = toNullableString(formData.get('bio'));
      const locale = toNullableString(formData.get('locale'));
      const timezone = toNullableString(formData.get('timezone'));

      await db.insert(profiles).values({
        id: crypto.randomUUID(),
        userId,
        bio,
        locale,
        timezone,
      });

      revalidateDataEntry();
      return { success: 'Profile row created.' };
    }

    if (table === 'User') {
      const email = toNullableString(formData.get('email'));
      const name = toNullableString(formData.get('name'));
      const newRole = formData.get('role');
      const normalizedRole = newRole === 'ADMIN' ? 'ADMIN' : 'USER';

      if (!email) {
        return { error: 'Email is required for User rows.' };
      }

      await db.insert(users).values({
        id: crypto.randomUUID(),
        email,
        name,
        role: normalizedRole,
      });

      revalidateDataEntry();
      return { success: 'User row created.' };
    }

    if (table === 'SecurityAuditLog') {
      const action = toNullableString(formData.get('action'));
      const outcome = toNullableString(formData.get('outcome'));
      const statusCode = Number(formData.get('statusCode'));
      const metadata = toNullableString(formData.get('metadata'));

      if (!action || !outcome || Number.isNaN(statusCode)) {
        return { error: 'Action, outcome, and a numeric status code are required.' };
      }

      const parsedMetadata = parseMetadata(metadata);

      if (!parsedMetadata.ok) {
        return { error: parsedMetadata.error };
      }

      await db.insert(securityAuditLogs).values({
        id: crypto.randomUUID(),
        actorId: userId,
        action,
        outcome,
        statusCode,
        metadata: parsedMetadata.value,
      });

      revalidateDataEntry();
      return { success: 'SecurityAuditLog row created.' };
    }

    if (table === 'SecurityRateLimitCounter') {
      const key = toNullableString(formData.get('key'));
      const count = Number(formData.get('count'));
      const resetAtRaw = toNullableString(formData.get('resetAt'));

      if (!key || Number.isNaN(count) || !resetAtRaw) {
        return { error: 'Key, count, and resetAt are required.' };
      }

      const resetAt = new Date(resetAtRaw);

      if (Number.isNaN(resetAt.getTime())) {
        return { error: 'resetAt must be a valid date.' };
      }

      await db.insert(securityRateLimitCounters).values({
        key,
        count,
        resetAt,
      });

      revalidateDataEntry();
      return { success: 'SecurityRateLimitCounter row created.' };
    }

    return { error: 'Unsupported table.' };
  } catch {
    return { error: 'Unable to insert row. Check values and constraints.' };
  }
}

function toNullableString(value: FormDataEntryValue | null): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseMetadata(rawMetadata: string | null):
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; error: string } {
  if (!rawMetadata) {
    return { ok: true, value: {} };
  }

  try {
    const parsed = JSON.parse(rawMetadata) as unknown;

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, error: 'Metadata must be a JSON object.' };
    }

    return { ok: true, value: parsed as Record<string, unknown> };
  } catch {
    return { ok: false, error: 'Metadata must be valid JSON.' };
  }
}

export type { DataEntryState };
