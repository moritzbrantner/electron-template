import type { AppRole } from '@/lib/authorization';

export type ManagedTable = 'User' | 'Profile' | 'SecurityAuditLog' | 'SecurityRateLimitCounter';

export const managedTables: readonly ManagedTable[] = [
  'User',
  'Profile',
  'SecurityAuditLog',
  'SecurityRateLimitCounter',
] as const;

export type TablePermission = {
  table: ManagedTable;
  label: string;
  readRoles: readonly AppRole[];
  writeRoles: readonly AppRole[];
};

export const tablePermissions: readonly TablePermission[] = [
  {
    table: 'User',
    label: 'User',
    readRoles: ['ADMIN'],
    writeRoles: ['ADMIN'],
  },
  {
    table: 'Profile',
    label: 'Profile',
    readRoles: ['USER', 'ADMIN'],
    writeRoles: ['USER', 'ADMIN'],
  },
  {
    table: 'SecurityAuditLog',
    label: 'SecurityAuditLog',
    readRoles: ['ADMIN'],
    writeRoles: ['ADMIN'],
  },
  {
    table: 'SecurityRateLimitCounter',
    label: 'SecurityRateLimitCounter',
    readRoles: ['ADMIN'],
    writeRoles: ['ADMIN'],
  },
] as const;

export function canReadTable(role: AppRole | null | undefined, table: ManagedTable): boolean {
  if (!role) {
    return false;
  }

  const permission = tablePermissions.find((item) => item.table === table);

  return permission ? permission.readRoles.includes(role) : false;
}

export function canWriteTable(role: AppRole | null | undefined, table: ManagedTable): boolean {
  if (!role) {
    return false;
  }

  const permission = tablePermissions.find((item) => item.table === table);

  return permission ? permission.writeRoles.includes(role) : false;
}
