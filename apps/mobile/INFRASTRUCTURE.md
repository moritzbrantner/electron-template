# INFRASTRUCTURE.md — monorepo-nextjs-expo-electron template

Document the infrastructure and operational constraints the agent must treat as non-negotiable.

## Environments
- **local**: developer machine defaults and required services.
- **ci**: commands and assumptions in automation.
- **staging**: pre-production validation environment.
- **production**: live environment constraints and safety guardrails.

## Services and dependencies
| Component | Purpose | Owner | Access pattern | Notes |
| --- | --- | --- | --- | --- |
| App runtime | Main application process | Team | Internal | Fill with actual runtime details |
| Database | Persistent storage | Team | Private network | Include migration/backup policy |
| Queue/Cache | Async or performance layer | Team | Private network | Include ttl, retry, and failure behavior |

## Secrets and configuration
- List required environment variables and where they are managed.
- Specify rotation policy and least-privilege expectations.
- Explicitly mark variables that must never be logged.

## Deployment and rollback
- Define deploy command or pipeline trigger.
- Define health checks and canary/verification window.
- Define rollback command and decision threshold.

## Safety constraints for autonomous agents
- Never run destructive production commands without explicit human direction.
- Prefer idempotent migrations and reversible operations.
- Treat missing infrastructure details as a blocker and pause safely.
