# Monorepo (Next.js + Expo + Electron) Template

This repository is a starter template for app portfolios that need web, mobile, and desktop entrypoints without treating the template itself as the long-lived shared platform.

## Operating model
- Keep this repository thin and focused on scaffolding.
- Keep deployable apps in `apps/*`.
- Keep template-local reusable code in `packages/*`.
- Move real cross-repository shared code into a separate private packages repository.
- Let app repositories adopt shared package updates on their own release cadence.

See:
- `ARCHITECTURE.md` for the boundary rules
- `PLATFORM_PACKAGES.md` for the private GitHub Packages setup
- `templates/platform-packages/` for a starter scaffold of the separate packages repo

## What belongs here
- workspace layout and repo conventions
- baseline Next.js, Expo, and Electron setup
- lint, typecheck, test, build, and CI wiring
- app manifest examples
- scaffolding and workflow templates

## What does not belong here
- evolving business logic for multiple live products
- shared packages that need independent semantic versioning
- manual sync workflows across many generated repositories

## Best way to use Codex here
1. Copy this folder's `AGENTS.md` into your target repository root.
2. Start Codex with a concrete task and include: **"follow the plan step by step"**.
3. Ask Codex to keep running autonomously until done unless a serious blocker occurs.
4. Require tests and relevant lint/type/build checks before completion.

## Environment setup for testing and benchmarking
1. Install Node.js 20 LTS and `pnpm`.
2. Install workspace dependencies once from the repository root with `pnpm install --frozen-lockfile`.
3. Configure per-app environment files plus shared service variables.
4. Run testing by scope: unit, then integration, then cross-app e2e.
5. Build production artifacts before benchmarking to avoid dev-mode noise.
6. Benchmark each surface separately and keep device profiles fixed.
7. Use Turbo cache controls intentionally so reruns are explicit.

## Companion docs for generated repos
- `PLANS.md`: ordered queue the agent executes without interruption.
- `INFRASTRUCTURE.md`: environments, services, secrets, deploy/rollback constraints.
- `AGENT_WORKFLOW.md`: explicit execution contract for autonomous agents.
- `ARCHITECTURE.md`: boundaries, key data flows, and invariants.
- `OPERATIONS.md`: deployment and rollback notes.
- `DECISIONS.md`: brief ADR-style log for major technical choices.
