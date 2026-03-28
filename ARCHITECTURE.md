# ARCHITECTURE.md

## Canonical application structure

This project uses a **domain-first `src/` architecture** as the single canonical structure.

```text
app/                     Next.js App Router entrypoints (UI composition + route handlers)
components/              Shared UI components
src/
  api/                   API-facing service adapters
  auth/                  Authentication/account services
  db/                    Database client + schema
  domain/                Core business use-cases (pure application logic)
  profile/               Profile-focused domain helpers/adapters
  testing/               Test fixtures and test-only helpers
  types/                 Project-level type augmentation
lib/
  authorization.ts       Shared role/authorization constants
  password.ts            Password hashing/verification helpers
  validation/            Shared validation contracts and parsers
```

Deprecated paths (`features/`, `stores/`, `lib/services/auth.ts`) are documented in `MIGRATION_NOTES.md` and should not be used for new implementation.

## Runtime flow

- **Read path:** `app/**` -> `src/domain/**` (or thin adapters in `src/*`) -> `src/db/**`
- **Write path:** `app/**` server action / route -> validation (`lib/validation/**`) -> `src/domain/**` -> persistence/integration

## Dependency rules

## Import Conventions

- Use canonical aliases only:
  - `@/src/*` for all application/domain/auth/db/profile/testing/types modules under `src/`
  - `@/app/*`, `@/components/*`, `@/lib/*`, and `@/i18n/*` for intentionally supported top-level folders
  - `@/tests/*`, `@/scripts/*`, `@/messages/*`, `@/emails/*` where test/tooling/content modules need explicit imports
  - `@/db-schema.json` for schema document import usage
- Do not use deprecated aliases (`@features/*`, `@stores/*`, `@services/*`) or their legacy `@/...` equivalents.
- Prefer explicit canonical aliases over ad-hoc root aliasing.

### Allowed import directions

```text
app/**           -> components/**, lib/**, src/**
components/**    -> components/**, lib/**
src/api/**       -> src/domain/**, src/auth/**, src/db/**, src/api/**
src/auth/**      -> src/db/**, src/auth/**, lib/**
src/domain/**    -> src/domain/**, src/db/**, src/profile/**, src/auth/**, lib/**
src/profile/**   -> src/profile/**, src/domain/**, src/db/**, src/auth/**, lib/**
src/db/**        -> src/db/**
lib/validation/**-> TypeScript/runtime validation utilities only
```

### Forbidden imports

- `app/**` and `src/**` must not import from deprecated modules:
  - `@features/*` / `@/features/*`
  - `@stores/*` / `@/stores/*`
  - `@services/*` / `@/lib/services/*`
- `src/domain/**` must not import from UI/runtime composition layers (`@/app/*`, `@/components/*`).
- `src/db/**` must stay infrastructure-only and must not import from `app/**`, `components/**`, `src/domain/**`, or feature-like presentation modules.

## Enforcement

`eslint.config.mjs` encodes import restrictions with `no-restricted-imports` rules that match the dependency policy above.
