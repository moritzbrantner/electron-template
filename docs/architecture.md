# Architecture

## Layering rule

Use the repository in three layers:

1. `packages/*`
   Put code here only when it is reusable across multiple Electron apps.
2. `src/platform/*`
   Put app-specific main/preload/shared platform code here.
3. `src/renderer.ts`
   Keep renderer concerns focused on presentation and user interaction.

## What belongs in a package

Move code into `packages/*` when all of the following are true:

- The code is not tied to this app's routes, copy, or storage schema.
- The API can be described generically.
- The behavior is useful in more than one Electron app.
- The renderer can consume it through a stable preload-safe interface.

Current examples:

- Command registration and menu wiring.
- Preferences persistence and broadcast.
- Document lifecycle and recent-file handling.
- Window bounds persistence.

## What belongs in the app layer

Keep code in `src/platform/*` when it is product-shaped rather than platform-shaped.

Current examples:

- The upload queue workflow and its UI language.
- Route selection and screen composition.
- App manifest metadata.
- Decisions about which commands should navigate to which screen.

## Main / preload / renderer responsibilities

- Main process:
  Own filesystem access, dialogs, persistence, and Electron APIs.
- Preload:
  Expose the smallest safe bridge surface to the renderer.
- Renderer:
  Render state, trigger bridge calls, and avoid direct privileged logic.

## State ownership defaults

- Preferences, document state, recent files, uploads, and window state live in the main process.
- Renderer state should be derived from subscriptions to main-process services.
- If a feature needs to survive restart, persist it with a typed store rather than browser storage.

## Extraction heuristic

Do not create a reusable package for the first version of a feature unless the abstraction is already obvious. Build the app-specific version first, then extract once two or more apps would use the same API with minimal branching.
