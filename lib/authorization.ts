import type { Session } from "next-auth";
import { getServerSession } from "next-auth";

import { authOptions } from "@/src/auth";

export type AppRole = "ADMIN" | "USER";

type RoleInput = AppRole | AppRole[];

type BusinessAction =
  | "viewDashboard"
  | "editOwnProfile"
  | "viewReports"
  | "manageUsers"
  | "manageSystemSettings";

const roleHierarchy: Record<AppRole, number> = {
  USER: 0,
  ADMIN: 1,
};

const actionPermissions: Record<BusinessAction, readonly AppRole[]> = {
  viewDashboard: ["USER", "ADMIN"],
  editOwnProfile: ["USER", "ADMIN"],
  viewReports: ["ADMIN"],
  manageUsers: ["ADMIN"],
  manageSystemSettings: ["ADMIN"],
};

function normalizeRoles(roleOrRoles: RoleInput): readonly AppRole[] {
  if (Array.isArray(roleOrRoles)) {
    return roleOrRoles;
  }

  return [roleOrRoles];
}

export function hasRole(currentRole: AppRole | null | undefined, minimumRole: AppRole): boolean {
  if (!currentRole) {
    return false;
  }

  return roleHierarchy[currentRole] >= roleHierarchy[minimumRole];
}

export function isAdmin(role: AppRole | null | undefined): boolean {
  return hasRole(role, "ADMIN");
}

function canPerform(role: AppRole | null | undefined, action: BusinessAction): boolean {
  if (!role) {
    return false;
  }

  return actionPermissions[action].includes(role);
}

export function canViewDashboard(role: AppRole | null | undefined): boolean {
  return canPerform(role, "viewDashboard");
}

export function canEditOwnProfile(role: AppRole | null | undefined): boolean {
  return canPerform(role, "editOwnProfile");
}

export function canViewReports(role: AppRole | null | undefined): boolean {
  return canPerform(role, "viewReports");
}

export function canManageUsers(role: AppRole | null | undefined): boolean {
  return canPerform(role, "manageUsers");
}

export function canManageSystemSettings(role: AppRole | null | undefined): boolean {
  return canPerform(role, "manageSystemSettings");
}

function createAuthError(message: string, status: 401 | 403): Error & { status: 401 | 403 } {
  const error = new Error(message) as Error & { status: 401 | 403 };
  error.name = "AuthorizationError";
  error.status = status;

  return error;
}

export async function requireAuth(): Promise<Session> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw createAuthError("Authentication required.", 401);
  }

  return session;
}

export async function requireRole(roleOrRoles: RoleInput): Promise<Session> {
  const session = await requireAuth();
  const allowedRoles = normalizeRoles(roleOrRoles);

  if (!session.user.role || !allowedRoles.includes(session.user.role)) {
    throw createAuthError("You do not have permission to perform this action.", 403);
  }

  return session;
}

export function forbidUnless(condition: unknown, message = "Forbidden"): asserts condition {
  if (!condition) {
    throw createAuthError(message, 403);
  }
}
