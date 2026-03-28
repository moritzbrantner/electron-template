# Next.js Comprehensive Template

This repository is a starter template for building impressive, production-ready Next.js experiences, including foundations for:

- User management
- 3D/animation experiences (Three.js-oriented architecture)
- Video-rich interfaces
- Form and validation flows
- Shared client state management (Zustand-style patterns)

## Documentation-first workflow

## Authoritative directory map

The repository uses **domain-first modules under `src/`** as the only canonical application structure.

```text
app/                     App Router pages, layouts, API route entrypoints, server actions
components/              Shared UI primitives/composites
src/api/                 API-facing adapters
src/auth/                Auth and account-lifecycle services
src/db/                  Database client/schema
src/domain/              Business use-cases
src/profile/             Profile domain helpers and adapters
src/testing/             Test fixtures/helpers
src/types/               Type augmentation
lib/authorization.ts     Role/authorization constants
lib/password.ts          Password utilities
lib/validation/          Validation contracts and parsing
```

Legacy demo paths (`features/`, `stores/`, and `lib/services/auth.ts`) are deprecated. See [`MIGRATION_NOTES.md`](./MIGRATION_NOTES.md).

Use these root docs before and during implementation:

- [`PRODUCT_BRIEF.md`](./PRODUCT_BRIEF.md): product goals, audience, and success criteria.
- [`PLANS.md`](./PLANS.md): active execution plans, milestones, and blockers.
- [`ARCHITECTURE.md`](./ARCHITECTURE.md): system design, module boundaries, and runtime decisions.
- [`FEATURES.md`](./FEATURES.md): feature specs and acceptance criteria.
- [`DECISIONS.md`](./DECISIONS.md): architecture and implementation decision log.

## Build instructions

## Package manager standard

This project uses **Bun** as the default package manager/runtime for local and CI workflows.

```bash
bun install
```

Use `bun run <script>` for project scripts.

- Prefer Server Components and server prerendering by default to improve SEO and minimize client-side JavaScript.
- Keep UI components donut-shaped (rounded, ring/pill-like geometry) unless a specific feature requires another shape.
- For theme-related UI, read system preferences on first visit and persist explicit user choices.

## Authentication setup

1. Copy environment variables:

   ```bash
   cp .env.example .env
   ```

2. Set `AUTH_SECRET`, `AUTH_URL` (or `NEXTAUTH_URL` for equivalent setups), and any OAuth provider credentials you plan to use.

3. For account lifecycle emails (sign-up verification + password reset), configure one of:

   - `EMAIL_PROVIDER=console` (default in local development; logs secure links to stdout)
   - `EMAIL_PROVIDER=resend` plus `RESEND_API_KEY` and `EMAIL_FROM`

4. Ensure `DATABASE_URL` is present; account lifecycle tokens and lockout counters are persisted in Postgres.

5. Configure profile image object storage (S3-compatible):

   - `PROFILE_IMAGE_STORAGE_BUCKET`
   - `PROFILE_IMAGE_STORAGE_REGION`
   - `PROFILE_IMAGE_STORAGE_ENDPOINT`
   - `PROFILE_IMAGE_STORAGE_ACCESS_KEY_ID`
   - `PROFILE_IMAGE_STORAGE_SECRET_ACCESS_KEY`
   - `PROFILE_IMAGE_PUBLIC_BASE_URL`
   - `PROFILE_IMAGE_STORAGE_FORCE_PATH_STYLE` (optional, provider-specific)

   Migration and rollback notes are documented in [`docs/profile-image-storage-migration.md`](./docs/profile-image-storage-migration.md).

## Local database (Docker)

1. Start the Postgres container:

   ```bash
   docker compose up -d postgres
   ```

2. Wait for the healthcheck to pass and verify status:

   ```bash
   docker compose ps
   ```

## Local startup flow

1. Start DB container:

   ```bash
   docker compose up -d postgres
   ```

2. Run migrations:

   ```bash
   bun run db:generate
   bun run db:migrate
   bun run db:schema:generate
   ```

   `db:schema:generate` derives `db-schema.json` from the Drizzle table configs used by the admin data studio.

3. Run Next app:

   ```bash
   bun run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

Start editing by updating `app/page.tsx`; the page auto-updates as you save.

## Testing

1. Run tiered checks locally depending on branch target:

   ```bash
   bun run checks:nightly
   bun run checks:beta
   bun run checks:main
   ```

   - `checks:nightly`: lint + typecheck + unit tests
   - `checks:beta`: nightly checks + integration tests
   - `checks:main`: beta checks + database schema check + production build + strict e2e preflight + deterministic DB bootstrap (start Postgres, wait for readiness, apply migrations, seed baseline users) + e2e tests

2. Run integration tests directly when iterating on service logic:

   ```bash
   bun run test:integration
   ```

3. Seed default test users (optional, but recommended for manual QA):

   ```bash
   bun run db:seed:test-users
   ```

   Default seeded credentials:

   - `admin@example.com` / `admin`
   - `manager@example.com` / `manager`
   - `user@example.com` / `user`


   `checks:main` runs `scripts/ci/assert-e2e-prereqs.sh` and then `scripts/ci/bootstrap-e2e-db.sh` before Playwright. The bootstrap step is idempotent, reuses an already reachable `DATABASE_URL` when present (for example CI service containers), and otherwise starts `docker compose` Postgres. It always re-applies migrations plus baseline seeded users (`bun run db:migrate` and `bun run db:seed:test-users`) so each run has deterministic auth/e2e fixtures.

4. Run end-to-end authentication/profile user-story tests (requires Postgres and `.env`):

   ```bash
   docker compose up -d postgres
   bun run test:e2e
   ```

## CI/CD

### Tiered branch and workflow hierarchy

Adopt three long-lived integration branches:

- `nightly`: receives frequent merges; validates fast feedback (`checks:nightly`).
- `beta`: stabilization branch; validates integration behavior (`checks:beta`).
- `main`: release branch; validates full pre-release quality gate (`checks:main`).

GitHub workflows are split by target branch and call a shared reusable workflow:

- `.github/workflows/nightly-tier.yml`
- `.github/workflows/beta-tier.yml`
- `.github/workflows/main-tier.yml`
- `.github/workflows/tier-checks.yml` (shared execution logic)

Each workflow runs the corresponding local command so local and CI behavior stays aligned.

For `main`, CI uses the same strict e2e preflight as local `checks:main`; missing `DATABASE_URL`, missing auth env (`AUTH_SECRET` + `AUTH_URL`/`NEXTAUTH_URL`), or an unreachable Postgres instance will fail the job before Playwright starts. After preflight succeeds, deterministic bootstrap reuses the runner's reachable database service when available (avoiding port-collision conflicts) or starts Postgres via `docker compose up -d postgres`, then waits for readiness, reapplies migrations, and reseeds baseline users before e2e execution.

In CI mode (`CI=true`), `checks:main` also runs bootstrap teardown on exit (`scripts/ci/bootstrap-e2e-db.sh --teardown`) and only removes containers/volumes it started itself. This avoids cross-job contamination on runners while remaining safe for local developer databases.

### Required deploy secrets

Set these environment variables in each deploy environment (preview and production):

- `DATABASE_URL`
- `AUTH_SECRET`
- `AUTH_URL` (or `NEXTAUTH_URL` in equivalent Auth.js setups)
- `EMAIL_PROVIDER` (`console` or `resend`)
- `EMAIL_FROM`

If you enable OAuth providers, also set the provider-specific credentials (for example `GITHUB_ID` / `GITHUB_SECRET`, `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`, or `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET`).

For hosted transactional email via Resend, add `RESEND_API_KEY` and set `EMAIL_PROVIDER=resend`.

### Branch strategy

- Protect `nightly`, `beta`, and `main`.
- Merge feature branches into `nightly` first.
- Promote `nightly` -> `beta` after nightly checks stay green.
- Promote `beta` -> `main` only after full `checks:main` passes.
- Require the matching workflow status check on each branch before merging.

### Preview and production deploy behavior

- **Preview deploys** should run for pull requests, using preview-scoped secrets and infrastructure.
- **Production deploys** should run only after changes are merged to `main`, using production-scoped secrets and infrastructure.

## Suggested next steps

1. Finalize `PRODUCT_BRIEF.md` for your target audience.
2. Add your first milestone plan in `PLANS.md`.
3. Capture core technical choices in `ARCHITECTURE.md` and `DECISIONS.md`.
4. Define your MVP scope in `FEATURES.md`.
