import type { NextRequest } from "next/server";

import { auditAction, enforceRateLimit, getRateLimitKey, type AuditRecord } from "@/src/api/security";

export async function enforceAdminReportsRateLimit(request: NextRequest, actorId: string | null) {
  const key = getRateLimitKey(request, actorId);
  return enforceRateLimit(key);
}

export async function auditAdminReportsAction(record: AuditRecord) {
  return auditAction(record);
}
