'use server';

import dbSchema from '@/db-schema.json';
import { getDb } from '@/src/db/client';
import { writableTableMap } from '@/src/dynamic-db/config';
import { normalizeFieldValue, parseDbSchemaDocument } from '@/src/dynamic-db/schema';

type PersistState = {
  ok: boolean;
  message: string;
};

export const initialPersistState: PersistState = {
  ok: false,
  message: '',
};

export async function persistSchemaRecord(_previousState: PersistState, formData: FormData): Promise<PersistState> {
  const tableName = formData.get('tableName');

  if (typeof tableName !== 'string' || !(tableName in writableTableMap)) {
    return {
      ok: false,
      message: 'Unknown table name. Update db-schema.json or writable table map.',
    };
  }

  const parsedSchema = parseDbSchemaDocument(dbSchema);
  const schemaTable = parsedSchema.tables.find((table) => table.name === tableName);

  if (!schemaTable) {
    return {
      ok: false,
      message: `Table ${tableName} is not defined in db-schema.json.`,
    };
  }

  const row: Record<string, unknown> = {};

  for (const field of schemaTable.fields) {
    const normalized = normalizeFieldValue(field.type, formData.get(field.name), field.format);

    if (field.required && (normalized === null || normalized === undefined)) {
      return {
        ok: false,
        message: `Field ${field.label} is required.`,
      };
    }

    if (normalized !== null && normalized !== undefined) {
      row[field.name] = normalized;
    }
  }

  if (Object.keys(row).length === 0) {
    return {
      ok: false,
      message: 'No values were provided.',
    };
  }

  try {
    const db = getDb();
    const targetTable = writableTableMap[tableName as keyof typeof writableTableMap];
    await db.insert(targetTable).values(row as never);

    return {
      ok: true,
      message: `${tableName} record created successfully.`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error while creating record.';

    return {
      ok: false,
      message,
    };
  }
}
