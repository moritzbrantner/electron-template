# PLANS.md

Use this file as the single source of truth for execution plans.

## How to use this file well

- Keep plans **time-bound** and **outcome-focused**.
- Break work into milestones with clear completion criteria.
- Mark status frequently (`not started`, `in progress`, `blocked`, `done`).
- Link each plan item to architecture decisions and tracked tasks.
- Keep old plans for history; archive completed phases instead of deleting context.

## Planning cadence

- **Daily (Mon-Fri by 16:00 UTC):** update active tasks, blockers, and risk status.
- **Weekly (Monday planning):** re-sequence milestones, validate dependencies, and confirm capacity.
- **Sprint close (every 2 weeks):** publish outcome summary and carry-over decisions.

## 1) Current Objective
- **Theme:** Ship production-ready core platform baseline for secure auth, reliable data services, and accelerated feature delivery.
- **Target Date:** 2026-04-30
- **Owner(s):** Platform Lead (A. Rivera), Security Engineer (J. Patel), Product Engineer (M. Chen)
- **Success Metrics:**
  - 100% of authenticated routes enforce policy checks aligned with role-based authorization tests.
  - P0 security checklist complete with zero open high-severity findings.
  - Median profile update API latency <= 250ms in staging at p50 and <= 500ms at p95.
  - Forms/state/media starter modules consumed by at least 2 product features.

## 2) Milestones
| Milestone | Description | Owner | Due Date | Status | Exit Criteria |
|---|---|---|---|---|---|
| M1: Platform hardening | Lock down runtime boundaries, API controls, and non-functional guardrails. References: `ARCHITECTURE.md` §4 Runtime split and §6 Non-functional requirements; `DECISIONS.md` DEC-0002 mandatory API controls. | A. Rivera + J. Patel | 2026-03-15 | in progress | Security headers, rate limiting, audit logging, and route-level authorization checks enabled; threat model reviewed; all platform hardening tasks marked done. |
| M2: Auth/account lifecycle | Implement end-to-end account lifecycle (signup/invite, login, recovery, profile lifecycle, and deactivation) with clear authorization rules. References: `FEATURES.md` Feature: User Management; `ARCHITECTURE.md` §5.2 Domain logic once, multi-transport adapters; `DECISIONS.md` DEC-0002. | J. Patel + M. Chen | 2026-03-29 | not started | Account lifecycle flows pass integration and e2e coverage; auth provider integration and fallback path documented; lifecycle audit events emitted. |
| M3: Data/service architecture | Stabilize data model and service boundaries for maintainable domain evolution. References: `ARCHITECTURE.md` §3 Module boundaries and §5 Data flow patterns; `DECISIONS.md` DEC-0001 URL source-of-truth for state where applicable. | A. Rivera | 2026-04-12 | not started | Domain services own business rules; persistence adapters are isolated; migration playbook validated with rollback rehearsal; data SLO dashboard live. |
| M4: Feature accelerators (forms/state/media) | Deliver reusable accelerators for form workflows, shared state patterns, and media integrations to speed delivery. References: `FEATURES.md` Feature: Form System, Feature: Global State (Zustand), Feature: Video Components; `ARCHITECTURE.md` §5.1 URL state conventions. | M. Chen | 2026-04-24 | not started | Reusable form kit, state orchestration pattern, and media wrapper are documented and used by >=2 shipped feature slices. |

## 3) Task Breakdown
| Task ID | Task | Related Milestone | Dependencies | Priority | Status |
|---|---|---|---|---|---|
| T-101 | Add centralized API security middleware (headers, throttling, trace IDs) | M1 | — | P0 | in progress |
| T-102 | Enforce policy checks across admin/profile/api endpoints and expand authorization tests | M1 | T-101 | P0 | in progress |
| T-103 | Build threat model + abuse-case checklist and run remediation review | M1 | T-101 | P1 | not started |
| T-201 | Implement account lifecycle states (pending, active, suspended, deactivated) in domain layer | M2 | T-102 | P0 | not started |
| T-202 | Add password reset + session revocation flow with audit trail | M2 | T-201 | P0 | not started |
| T-203 | Add auth provider drift monitor and fallback sign-in policy | M2 | T-202 | P1 | not started |
| T-301 | Define service contracts for profile/media/forms domains and isolate adapters | M3 | T-201 | P0 | not started |
| T-302 | Create forward + rollback migration runbooks and rehearse against staging snapshot | M3 | T-301 | P0 | not started |
| T-303 | Add data/service observability (latency, error budget, migration health signals) | M3 | T-302 | P1 | not started |
| T-401 | Publish reusable form primitives with validation + i18n hooks | M4 | T-301 | P1 | not started |
| T-402 | Standardize global state patterns for URL-synced and client-only state | M4 | T-401 | P1 | not started |
| T-403 | Deliver media abstraction (upload/video embed) with policy enforcement | M4 | T-301, T-102 | P1 | not started |

## 4) Risks & Blockers
| Risk/Blocker | Impact | Likelihood | Mitigation | Owner | Status |
|---|---|---|---|---|---|
| Security control gaps during rapid API expansion | High: potential exposure of privileged actions | Medium | Gate new endpoints behind DEC-0002 API exposure checklist and automated authorization tests before merge. | J. Patel | open |
| Migration drift between local/staging/prod schemas | High: deployment failures or data loss | Medium | Require migration rehearsal with rollback (T-302), schema checksum verification in CI, and backup snapshots before apply. | A. Rivera | open |
| Auth provider behavior drift (token/session semantics changes) | Medium-High: login instability and lockouts | Medium | Add contract tests and provider drift monitor (T-203); document fallback mode with temporary local credential path. | J. Patel | open |
| i18n footprint growth outpaces form/state component consistency | Medium: UX inconsistency and translation debt | High | Enforce shared form primitives (T-401), localization lint checks, and release checklist for new locale keys. | M. Chen | open |
| Infrastructure readiness lag (rate-limit store, observability, secrets rotation) | High: inability to meet non-functional requirements | Medium | Infra readiness checklist tied to M1/M3 exit criteria, weekly platform sync, and phased cutover with canary environment. | A. Rivera | open |

## 5) Decisions Needed
- [ ] Decision: Primary auth provider fallback strategy (temporary credentials-only vs. multi-provider failover)
  - Context: M2 depends on predictable session semantics under third-party outages or breaking changes.
  - Options considered: (A) Credentials-only emergency mode, (B) dual-provider strategy, (C) strict fail-closed.
  - Recommendation: A now, with B evaluated after M2 completion.
  - Deadline: 2026-03-08
- [ ] Decision: Migration deployment policy (expand/contract window length)
  - Context: M3 requires safe rollout with rollback guarantees.
  - Options considered: (A) 1 sprint expand/contract, (B) 2 sprint overlap, (C) feature-flagged shadow writes.
  - Recommendation: B for critical tables, A for non-critical tables.
  - Deadline: 2026-03-12

## 6) Progress Log
- `2026-02-23`: Replaced planning template with committed roadmap, defined milestone dependencies/priorities, documented top risks/owners/mitigations, and set explicit update cadence.

## Done checklist
- [x] Objective and metric are explicit.
- [x] Each milestone has measurable exit criteria.
- [x] Dependencies are listed.
- [x] Risks have an owner.
- [x] This plan references architecture/features docs where relevant.
