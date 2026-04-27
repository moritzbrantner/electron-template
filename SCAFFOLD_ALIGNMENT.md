# SCAFFOLD_ALIGNMENT.md

## Canonical source

The normative scaffold contract lives in `monorepo/SCAFFOLD_V2.md`.

## Repo role

`electron-template` is the maintained standalone desktop scaffold in the `next-expo-electron` family.

## What is local vs shared

Local:

- Electron main/preload/renderer app composition
- desktop-only package set and upload/reference flows
- Forge/Vite packaging and e2e setup

Shared:

- scaffold contract from `monorepo`
- pinned reusable workflow references
- structural migrations from `@moritzbrantner/platform-upgrader`
- released packages from `platform-packages`

## Update path

1. Land contract changes in `monorepo`.
2. Publish shared workflow or package changes when needed.
3. Apply structural changes with `bunx @moritzbrantner/platform-upgrader apply scaffold-v2`.
4. Keep desktop-specific implementation changes local to this repo.

## What must not drift

- root `app.manifest.ts`
- `.platform-upgrader.json`
- pinned reusable workflow refs
- removal of direct-sync update scripts and workflows
- smoke e2e naming (`desktop-smoke.e2e.ts`)

## Config references

- `.platform-upgrader.json`
- `app.manifest.ts`
- `docs/architecture.md`
