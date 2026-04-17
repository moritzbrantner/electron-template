# electron-template

Reusable Electron desktop scaffold with a typed main/preload boundary, publishable local packages, and smoke-tested app-level reference flows.

## What is included

- Reusable local packages for commands, documents, JSON persistence, preferences, and window state.
- Electron Forge + Vite for development, packaging, and distributable builds.
- A preload-safe renderer API exposed on `window.desktop`.
- A complete upload baseline that stays app-specific while using the shared persistence layer.
- Unit, integration, and Playwright end-to-end coverage.

## Repository layout

- `src/main.ts`: Electron entrypoint and `BrowserWindow` lifecycle.
- `src/preload.ts`: preload bridge that exposes the typed desktop APIs.
- `src/renderer.ts`: renderer UI for the template example screens.
- `src/platform/main`: app-specific main-process services and composition.
- `src/platform/shared`: shared app-level types and validators.
- `packages/*`: reusable Electron primitives and shared tooling packages intended for publishing.
- `tests`: source-level unit and integration tests.
- `e2e`: Playwright desktop smoke coverage and fixtures.

## Architecture

The shared packages provide reusable platform primitives:

- `@moritzbrantner/electron-commands`
- `@moritzbrantner/electron-documents`
- `@moritzbrantner/electron-json-store`
- `@moritzbrantner/electron-preferences`
- `@moritzbrantner/electron-window-state`

The app layer composes those packages in [create-desktop-platform.ts](/home/moenarch/moritzbrantner/electron-template/src/platform/main/create-desktop-platform.ts:163) and keeps product-specific behavior, like the upload queue, outside the reusable packages until it proves worth extracting.

The standalone repo contract lives in [app.manifest.ts](/home/moenarch/moritzbrantner/electron-template/app.manifest.ts:1). It defines repo-level metadata such as `entryWorkspace`, deployment runtime, and the real shared package set. It does not imply an upstream sync relationship.

See [docs/architecture.md](/home/moenarch/moritzbrantner/electron-template/docs/architecture.md:1) for the package boundary rules.

## Storage

The template persists app state under `app.getPath('userData')/moritzbrantner/`:

- `preferences.json`
- `documents.json`
- `window-state.json`
- `uploads.json`

Document files themselves are saved where the user chooses.

## Commands

Install dependencies:

```bash
bun install
```

Run the app in development:

```bash
bun run dev
```

Build packages and the Electron app:

```bash
bun run build
```

Run the quality gate locally:

```bash
bun run ci
```

Lint the repository with Biome:

```bash
bun run lint
```

Format supported files with Biome:

```bash
bun run format
```

Verify that the repository still produces a packaged desktop app:

```bash
bun run test:package
```

Package distributables:

```bash
bun run make
```

## Extending the template

- Add app-specific workflows under `src/platform/main` and `src/platform/shared` first.
- Extract logic into `packages/*` only when it is generic enough to serve multiple apps.
- Expose renderer-safe APIs only through preload bridges.
- Prefer persisted typed state in the main process over renderer-owned local storage.

## Update model

- Adopt shared runtime updates through versioned packages.
- Adopt CI and release changes through pinned reusable workflows once the shared workflow repo is in place.
- Apply structural repo migrations through `@moritzbrantner/platform-upgrader`.
- Do not use repo-dispatch or subtree-sync flows for ongoing alignment.
