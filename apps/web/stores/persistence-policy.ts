export const PERSISTENCE_POLICY = {
  storageKey: "app-store:v1",
  // Never persist secrets, raw auth tokens, or PII that is not required for UX continuity.
  forbiddenKeys: ["accessToken", "refreshToken", "ssn", "password"] as const,
  // Persist only user experience preferences and low-risk cache hints.
  allowedSlices: ["preferences", "ui"] as const,
};

export function assertPersistenceWhitelist(sliceName: string): void {
  if (!PERSISTENCE_POLICY.allowedSlices.includes(sliceName as (typeof PERSISTENCE_POLICY.allowedSlices)[number])) {
    throw new Error(`Slice \"${sliceName}\" is not whitelisted for persistence.`);
  }
}
