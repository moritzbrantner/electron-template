# DECISIONS.md

Use this file as a lightweight ADR (Architecture Decision Record) log.

## How to use this file well

- Add one entry per important decision.
- Include context, options, and consequences.
- Record decisions **before** implementation when possible.
- If a decision changes, create a superseding entry instead of rewriting history.

## Decision record template

## DEC-0001: [Decision title]
- **Date:** YYYY-MM-DD
- **Status:** proposed | accepted | deprecated | superseded
- **Owners:**
- **Related docs:** `ARCHITECTURE.md`, `PLANS.md`, issue links

### Context
What problem are we solving and why now?

### Options considered
1. Option A
2. Option B
3. Option C

### Decision
What we chose and why.

### Consequences
- Positive:
- Negative / trade-offs:
- Follow-up actions:

---

## Index
| ID | Title | Status | Date |
|---|---|---|---|
| DEC-0001 | URL as the source of truth for shareable view state | accepted | 2026-02-23 |
| DEC-0002 | Action API surface classification and phased exposure policy | accepted | 2026-02-23 |

## DEC-0001: URL as the source of truth for shareable view state
- **Date:** 2026-02-23
- **Status:** accepted
- **Owners:** Product + Engineering
- **Related docs:** `ARCHITECTURE.md`, `PLANS.md`

### Context
We want app states to be easy to copy, share, paste, test, and reproduce across devices and team members (especially QA and support). Keeping important view state only in in-memory client state makes exact reproduction difficult.

### Options considered
1. Keep all state in component/store memory.
2. Persist most state in local/session storage.
3. Put reproducible, non-sensitive view state in URL (path/query) and keep ephemeral/private state elsewhere.

### Decision
Adopt a hybrid strategy with URL-first view state:
- Put reproducible, user-visible view state in the URL (filters, sort, pagination, selected tab, search terms, locale).
- Keep canonical resource identity in route path segments.
- Keep sensitive, private, or highly ephemeral UI state out of URLs (use server session/database, secure cookies, local/session storage, or in-memory state as appropriate).

### Consequences
- Positive:
  - Deep links fully represent current view state.
  - QA/debug workflows improve via shareable URLs.
  - End-to-end tests can assert behavior through explicit URL parameters.
- Negative / trade-offs:
  - Requires consistent parameter naming/validation and defaulting.
  - URL design becomes part of public API and must be versioned thoughtfully.
  - Risk of leaking data if developers place sensitive values in query strings.
- Follow-up actions:
  - Document URL state conventions in `ARCHITECTURE.md`.
  - Add guardrails in code review checklist: no sensitive data in URL params.

## DEC-0002: Action API surface classification and phased exposure policy
- **Date:** 2026-02-23
- **Status:** accepted
- **Owners:** Product + Engineering
- **Related docs:** `lib/authorization.ts`, `src/domain/authorization/use-cases.ts`, `app/[locale]/admin/page.tsx`

### Context
The current action model is role-based and primarily consumed by server-rendered pages and server actions. We need a consistent policy for deciding which business actions are exposed as HTTP APIs versus kept server-side only.

### Options considered
1. Expose all business actions over HTTP now.
2. Keep all actions as server-side invocations only.
3. Phase API exposure by action value/risk and keep low-value actions server-only.

### Decision
Choose a phased model (Option 3) with explicit classification and criteria:

#### Business action inventory and classification
| Action | Current usage | Classification | Rationale |
|---|---|---|---|
| `viewDashboard` | UI rendering/authorization checks in server-side web flows | UI-only (server-internal) | Not required for external integration; already satisfied by page auth checks. |
| `editOwnProfile` | Server action updates profile image in web app | UI-only (server action/internal call) | Session-bound web workflow; external use can be deferred. |
| `viewReports` | Admin page authorization state | **Public API (phase 1)** | High value for non-web admin clients and read-only integrations. |
| `manageUsers` | Admin authorization matrix; future admin workflows | Internal API (automation/test harness) | Needed for test-data setup and admin automation; high security risk, keep constrained initially. |
| `manageSystemSettings` | Admin authorization matrix; future privileged operations | UI-only (defer API) | Highest risk surface; no immediate non-web requirement. |

#### Decision criteria for API exposure
- **Required for test-data setup?**
  - If yes, prefer internal API with stricter controls and narrower schema.
- **Needed by non-web client?**
  - If yes, prioritize a stable HTTP endpoint with explicit versioning.
- **Security risk level?**
  - High-risk state-changing actions remain server-side until additional safeguards are in place.
- **Idempotency/retry semantics?**
  - Read actions should be idempotent (`GET`) and retry-safe.
  - Write actions require explicit idempotency keys or conflict strategy before exposure.

#### Mandatory controls for every API-exposed action
- Authentication: require authenticated session and action-appropriate role.
- Rate limiting: enforce per-user (or per-IP fallback) request budget.
- Audit logging: record actor, action, result, and request context on every access.

### Consequences
- Positive:
  - API surface remains minimal and intentional.
  - Non-web and automation use-cases can be supported without overexposing privileged actions.
  - Security controls are standardized at endpoint creation time.
- Negative / trade-offs:
  - Mixed invocation modes (server action + API) increase maintenance overhead.
  - Some integrations must wait for later phases.
- Follow-up actions:
  - Implement phase 1 `viewReports` API endpoint with auth/rate-limit/audit.
  - Define idempotency policy before exposing write-oriented admin actions.
