# FEATURES.md

Use this file to define and track major capabilities in the template.

## How to use this file well

- Treat each feature as a mini-spec with acceptance criteria.
- Keep user-facing behavior, technical notes, and rollout status together.
- Split broad capabilities into smaller feature slices.
- Mark dependencies clearly (e.g., auth needed before dashboard features).

## Feature catalog template

## 1) Core platform features

### Feature: User Management
- **Status:** in progress
- **Summary:** Authentication, session lifecycle, profile management, and role-aware access control shipped as independent slices.
- **User value:** Enables secure personalization and account-based experiences with clear delivery milestones.
- **Dependencies:** DB, auth provider, email provider, role policy definitions.

#### Slice plan

| Slice | Status | Owner | Release target | Acceptance criteria (linked to code) |
|---|---|---|---|---|
| Sign-in (credentials + GitHub) | done | Auth Team | v0.3.0 | [x] Credentials and optional GitHub providers are configured and wired to NextAuth in `src/auth.ts`. [x] Credentials authorization path delegates to dedicated logic in `src/auth/credentials.ts`. [x] Auth route is exposed via NextAuth catch-all route in `app/api/auth/[...nextauth]/route.ts`. |
| Session handling | done | Auth Team | v0.3.0 | [x] Session strategy falls back between DB and JWT in `src/auth.ts`. [x] JWT callback stores user id + role claims in `src/auth.ts`. [x] Session callback materializes typed session user data in `src/auth.ts` and `src/types/next-auth.d.ts`. |
| Profile edit | done | Profile Team | v0.4.0 | [x] Display name updates validate lengths and persist to `users` table in `app/[locale]/profile/actions.ts`. [x] Profile image upload validates and stores image data in `app/[locale]/profile/actions.ts` and `src/profile/image-validation.ts`. [x] Profile page and forms consume these actions in `app/[locale]/profile/page.tsx`, `app/[locale]/profile/profile-display-name-form.tsx`, and `app/[locale]/profile/profile-image-form.tsx`. |
| Authorization matrix | in progress | Security Team | v0.5.0 | [x] Role definitions and guards are used by `requireRole` and permission checks in `app/api/admin/reports/authorization/route.ts` and `src/domain/authorization/use-cases.ts`. [ ] Expand matrix coverage and documentation for all admin and settings actions in `app/[locale]/admin/page.tsx` and `app/[locale]/settings/page.tsx`. |
| Admin reporting API | done | Security Team | v0.5.0 | [x] Authorization report endpoint enforces authentication/authorization in `app/api/admin/reports/authorization/route.ts`. [x] Endpoint applies rate limiting + audit logging via `src/api/security.ts`. [x] Endpoint returns permission payload for `viewReports` from `src/domain/authorization/use-cases.ts`. |
| Sign-up | planned | Auth Team | v0.6.0 | [ ] Add self-serve account registration flow and persistence using `users` schema in `src/db/schema.ts`. [ ] Add UX entry points and validation screens under localized routes (to be added near `app/[locale]/page.tsx`). [ ] Connect registration to auth/session bootstrap in `src/auth.ts`. |
| Password reset | planned | Auth Team | v0.7.0 | [ ] Add password reset request + token issuance using verification token storage in `src/db/schema.ts`. [ ] Add secure password reset action endpoint(s) under `app/api/auth/*` (to be implemented alongside `app/api/auth/[...nextauth]/route.ts`). [ ] Add updated credential verification path in `src/auth/credentials.ts`. |
| Email verification | blocked | Platform Team | v0.7.0 | [ ] Require verified email before privileged access by extending checks in `src/auth.ts`. [ ] Add verification token generation/consume flow using `verificationTokens` from `src/db/schema.ts`. [ ] Implement outbound email delivery integration (blocked pending provider selection and secrets management). |
| Account recovery | blocked | Support + Auth Team | v0.8.0 | [ ] Add recovery flow for locked or inaccessible accounts with auditable actions in `src/api/security.ts`. [ ] Add admin/support recovery controls aligned to role policies in `src/domain/authorization/use-cases.ts`. [ ] Define recovery UX and localized content under `app/[locale]/*` routes (blocked on support policy and compliance review). |

### Not started yet

The following platform capabilities are still not started and need initial slice planning before implementation.

### Feature: 3D Interactive Experiences
- **Status:** planned
- **Summary:** Three.js-powered sections with performant fallbacks.
- **User value:** Highly engaging brand and product storytelling.
- **Scope includes:** hero scene, scroll-linked animation, graceful degradation.
- **Acceptance criteria:**
  - [ ] 3D scene loads with fallback for low-capability devices.
  - [ ] Animation controls are keyboard accessible where applicable.
  - [ ] Performance stays within agreed budget.
- **Dependencies:** rendering setup, asset pipeline.

### Feature: Video Components
- **Status:** planned
- **Summary:** Reusable video components for background, inline, and modal playback.
- **User value:** Rich media communication without custom player rebuild.
- **Scope includes:** provider abstraction, lazy loading, controls, captions support.
- **Acceptance criteria:**
  - [ ] Component supports common video providers.
  - [ ] Mobile autoplay/controls behavior documented and tested.
  - [ ] Captions and pause controls available.
- **Dependencies:** media strategy, accessibility guidelines.

### Feature: Form System
- **Status:** planned
- **Summary:** Consistent forms with schema validation and async submission.
- **User value:** Reliable lead capture and user data updates.
- **Scope includes:** input components, validation schemas, submission states.
- **Acceptance criteria:**
  - [ ] Errors are clear and field-specific.
  - [ ] Loading, success, and failure states are implemented.
  - [ ] Server-side validation mirrors client-side rules.
- **Dependencies:** validation library, API/actions.

### Feature: Global State (Zustand)
- **Status:** planned
- **Summary:** Shared client state for UX flows requiring cross-component sync.
- **User value:** Smooth interactions across media, layout, and user context.
- **Scope includes:** store conventions, persistence strategy, testing.
- **Acceptance criteria:**
  - [ ] Store slices are domain-scoped.
  - [ ] No sensitive data persisted in insecure storage.
  - [ ] Store usage patterns are documented.
- **Dependencies:** state management conventions.

## 2) Backlog template
| Feature | Priority | Status | Owner | Notes |
|---|---|---|---|---|
|  | P1 | planned |  |  |
