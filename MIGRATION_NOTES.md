# Migration Notes: Canonical Structure (`src/`)

This repository now uses **domain-first modules under `src/`** as the single canonical application structure.

## Deprecated directories/modules

The following paths are deprecated and should not be used for new code:

- `features/`
- `stores/`
- `lib/services/`

## Migration mapping

Use these canonical replacements:

- `features/profile/domain/profile-service.ts` -> `src/profile/demo-profile-service.ts`
- `features/profile/server/profile-adapter.ts` -> `src/profile/demo-profile-adapter.ts`
- `features/profile/ui/profile-card.tsx` -> `src/profile/profile-card.tsx`
- `features/forms/employee-profile-form.ts` -> `src/domain/forms/employee-profile-form.ts`
- `lib/services/auth.ts` -> `src/auth/current-user.ts`

## Enforcement

ESLint now enforces the canonical direction rules and blocks imports of deprecated modules from `app/**`, `components/**`, `src/**`, and `tests/**`.
