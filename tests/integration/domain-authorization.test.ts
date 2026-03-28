import type { Session } from "next-auth";
import { describe, expect, it } from "vitest";

import { getAdminActionPermissions, getAdminAuthorization } from "@/src/domain/authorization/use-cases";

function createSession(role: "ADMIN" | "USER"): Session {
  return {
    user: {
      id: role === "ADMIN" ? "admin_1" : "user_1",
      role,
    },
    expires: "2999-01-01T00:00:00.000Z",
  };
}

describe("authorization domain use-cases", () => {
  it("returns authentication error for missing session", () => {
    const result = getAdminAuthorization(null);

    expect(result).toEqual({
      ok: false,
      error: {
        code: "AUTHENTICATION_REQUIRED",
        message: "Authentication required.",
      },
    });
  });

  it("returns forbidden error for non-admin session", () => {
    const result = getAdminAuthorization(createSession("USER"));

    expect(result).toEqual({
      ok: false,
      error: {
        code: "FORBIDDEN",
        message: "You do not have permission to access admin actions.",
      },
    });
  });

  it("returns allowed actions for admin", () => {
    const result = getAdminAuthorization(createSession("ADMIN"));

    expect(result.ok).toBe(true);

    if (!result.ok) {
      return;
    }

    expect(result.data.actions).toEqual([
      { key: "viewReports", allowed: true },
      { key: "manageUsers", allowed: true },
      { key: "manageSystemSettings", allowed: true },
    ]);
  });

  it("computes admin action permissions from role", () => {
    expect(getAdminActionPermissions("USER")).toEqual([
      { key: "viewReports", allowed: false },
      { key: "manageUsers", allowed: false },
      { key: "manageSystemSettings", allowed: false },
    ]);
  });
});
