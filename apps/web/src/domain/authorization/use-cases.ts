import type { Session } from "next-auth";

import {
  canManageSystemSettings,
  canManageUsers,
  canViewReports,
  type AppRole,
} from "@/lib/authorization";
import { failure, success, type ServiceResult } from "@/src/domain/shared/result";

export const adminActionKeys = ["viewReports", "manageUsers", "manageSystemSettings"] as const;

export type AdminActionKey = (typeof adminActionKeys)[number];

export type AdminActionPermission = {
  key: AdminActionKey;
  allowed: boolean;
};

export type AuthorizationError =
  | {
      code: "AUTHENTICATION_REQUIRED";
      message: string;
    }
  | {
      code: "FORBIDDEN";
      message: string;
    };

export type AdminAuthorizationPayload = {
  actions: readonly AdminActionPermission[];
};

export function getAdminActionPermissions(role: AppRole | null | undefined): readonly AdminActionPermission[] {
  return [
    {
      key: "viewReports",
      allowed: canViewReports(role),
    },
    {
      key: "manageUsers",
      allowed: canManageUsers(role),
    },
    {
      key: "manageSystemSettings",
      allowed: canManageSystemSettings(role),
    },
  ];
}

export function getAdminAuthorization(
  session: Session | null,
): ServiceResult<AdminAuthorizationPayload, AuthorizationError> {
  if (!session?.user?.id) {
    return failure({
      code: "AUTHENTICATION_REQUIRED",
      message: "Authentication required.",
    });
  }

  const role = session.user.role;
  if (role !== "ADMIN") {
    return failure({
      code: "FORBIDDEN",
      message: "You do not have permission to access admin actions.",
    });
  }

  return success({
    actions: getAdminActionPermissions(role),
  });
}
