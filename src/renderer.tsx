import './index.css';

import { createRoot } from 'react-dom/client';
import { useEffect, useRef, useState, type DragEvent } from 'react';

import { createSharedButtonLabel } from '@moritzbrantner/ui';

import type { CommandState } from '@moritzbrantner/electron-commands/renderer';
import type { DocumentState } from '@moritzbrantner/electron-documents/renderer';

import { appRouteDefinitions, getRouteFromHash, type AppRoute } from './navbar';
import {
  defaultNavigationHotkeys,
  defaultDesktopPreferences,
  normalizeDesktopHotkeyAccelerator,
  normalizeDesktopHotkeyKeyToken,
  reservedDesktopHotkeys,
  resolveThemePreference,
  splitDesktopHotkeyAccelerator,
  type DesktopPreferences,
  type NavigationHotkeyName,
} from './platform/shared/preferences';
import { defaultUploadsState, type UploadItem, type UploadsState } from './platform/shared/uploads';

const defaultDocumentState: DocumentState = {
  content: '',
  displayName: 'Untitled',
  filePath: null,
  isDirty: false,
  lastSavedAt: null,
  recentDocuments: [],
  statusMessage: 'Ready',
};

const systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');

function applyTheme(preferences: DesktopPreferences) {
  const theme = resolveThemePreference(preferences.appearance.theme, systemThemeQuery.matches);
  document.documentElement.dataset.theme = theme;
}

function formatBytes(sizeInBytes: number) {
  if (sizeInBytes < 1024) {
    return `${sizeInBytes} B`;
  }

  if (sizeInBytes < 1024 * 1024) {
    return `${(sizeInBytes / 1024).toFixed(1)} KB`;
  }

  return `${(sizeInBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatTimestamp(timestamp: string | null) {
  if (!timestamp) {
    return 'Not completed yet';
  }

  return new Date(timestamp).toLocaleString();
}

function getDroppedPaths(dataTransfer: DataTransfer | null) {
  if (!dataTransfer) {
    return [];
  }

  return Array.from(dataTransfer.files)
    .map((file) => (file as File & { path?: string }).path)
    .filter((filePath): filePath is string => typeof filePath === 'string' && filePath.length > 0);
}

function normalizeKeyboardEventAccelerator(event: KeyboardEvent) {
  if (event.repeat) {
    return null;
  }

  const code = event.code;
  let key: string | null = null;

  if (code.startsWith('Digit') && code.length === 'Digit0'.length) {
    key = code.slice('Digit'.length);
  } else if (code.startsWith('Key') && code.length === 'KeyA'.length) {
    key = code.slice('Key'.length);
  } else if (code === 'Comma') {
    key = ',';
  } else if (code === 'Period') {
    key = '.';
  } else if (code === 'Slash') {
    key = '/';
  } else if (code === 'Minus') {
    key = '-';
  } else if (event.key.length === 1) {
    key = normalizeDesktopHotkeyKeyToken(event.key);
  }

  if (!key) {
    return null;
  }

  const parts: string[] = [];

  if (event.ctrlKey || event.metaKey) {
    parts.push('CmdOrCtrl');
  }

  if (event.altKey) {
    parts.push('Alt');
  }

  if (event.shiftKey) {
    parts.push('Shift');
  }

  parts.push(key);
  return parts.join('+');
}

function App() {
  const [route, setRoute] = useState<AppRoute>(() => getRouteFromHash(window.location.hash));
  const [ready, setReady] = useState(false);
  const [commands, setCommands] = useState<CommandState[]>([]);
  const [documents, setDocuments] = useState<DocumentState>(defaultDocumentState);
  const [preferences, setPreferences] = useState<DesktopPreferences>(defaultDesktopPreferences);
  const [uploads, setUploads] = useState<UploadsState>(defaultUploadsState);

  useEffect(() => {
    const onHashChange = () => setRoute(getRouteFromHash(window.location.hash));
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadDesktopState() {
      const [nextCommands, nextDocuments, nextPreferences, nextUploads] = await Promise.all([
        window.desktop.commands.list(),
        window.desktop.documents.getState(),
        window.desktop.preferences.getAll(),
        window.desktop.uploads.getState(),
      ]);

      if (!mounted) {
        return;
      }

      setCommands(nextCommands);
      setDocuments(nextDocuments);
      setPreferences(nextPreferences);
      setUploads(nextUploads);
      applyTheme(nextPreferences);
      setReady(true);
    }

    void loadDesktopState();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(
    () =>
      window.desktop.preferences.subscribe((nextPreferences) => {
        setPreferences(nextPreferences);
        applyTheme(nextPreferences);
      }),
    [],
  );
  useEffect(() => window.desktop.documents.subscribe(setDocuments), []);
  useEffect(() => window.desktop.uploads.subscribe(setUploads), []);
  useEffect(() => window.desktop.commands.subscribe(setCommands), []);

  useEffect(() => {
    const onSystemThemeChange = () => applyTheme(preferences);
    systemThemeQuery.addEventListener('change', onSystemThemeChange);
    return () => systemThemeQuery.removeEventListener('change', onSystemThemeChange);
  }, [preferences]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const accelerator = normalizeKeyboardEventAccelerator(event);

      if (!accelerator) {
        return;
      }

      const matchedRoute = (Object.entries(preferences.hotkeys.navigation) as Array<[AppRoute, string]>).find(
        ([, routeAccelerator]) => routeAccelerator === accelerator,
      )?.[0];

      if (!matchedRoute || matchedRoute === route) {
        return;
      }

      event.preventDefault();
      const target = appRouteDefinitions.find((definition) => definition.route === matchedRoute);

      if (target) {
        window.location.hash = target.href;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [preferences.hotkeys.navigation, route]);

  return (
    <main>
      <Navbar route={route} hotkeys={preferences.hotkeys.navigation} />
      {!ready ? <LoadingScreen /> : null}
      {ready && route === 'home' ? <HomeScreen commands={commands} /> : null}
      {ready && route === 'settings' ? <SettingsScreen commands={commands} preferences={preferences} /> : null}
      {ready && route === 'documents' ? <DocumentsScreen documents={documents} /> : null}
      {ready && route === 'uploads' ? <UploadsScreen uploads={uploads} /> : null}
      {ready && route === 'maps' ? <MapsScreen /> : null}
    </main>
  );
}

function Navbar({ hotkeys, route }: { hotkeys: DesktopPreferences['hotkeys']['navigation']; route: AppRoute }) {
  return (
    <nav className="navbar">
      <span className="navbar__brand">Desktop App</span>
      <div className="navbar__actions">
        {appRouteDefinitions.map((definition) => (
          <a
            key={definition.route}
            href={definition.href}
            className={route === definition.route ? 'is-active' : undefined}
          >
            <span>{definition.label}</span>
            {definition.hotkeyName ? <HotkeyPreview accelerator={hotkeys[definition.hotkeyName]} inline /> : null}
          </a>
        ))}
      </div>
    </nav>
  );
}

function LoadingScreen() {
  return (
    <section className="screen">
      <p className="screen__eyebrow">Loading</p>
      <h1 className="screen__title">Loading desktop services</h1>
      <p className="screen__description">Connecting to the preload bridge.</p>
    </section>
  );
}

function HomeScreen({ commands }: { commands: CommandState[] }) {
  return (
    <section className="screen">
      <p className="screen__eyebrow">Desktop foundation</p>
      <h1 className="screen__title">Electron template</h1>
      <p className="screen__description">
        This repository now owns its screens and route flows directly, while shared desktop primitives stay in the
        Electron packages and shared UI building blocks stay in <code>@moritzbrantner/ui</code>.
      </p>
      <div className="overview-grid">
        <article className="overview-card">
          <h2>Shared platform package</h2>
          <p>The app consumes final package names you can publish later under the `@moritzbrantner` scope.</p>
          <code className="shared-package-label">{createSharedButtonLabel({ label: 'desktop-launch' })}</code>
        </article>
        <article className="overview-card">
          <h2>Template baseline</h2>
          <ul className="overview-list">
            <li>Preferences persist through a typed preload-safe store.</li>
            <li>Documents support save, save as, reopen recent, and dirty state.</li>
            <li>Uploads support queueing, retry, cancelation, persistence, and restart recovery.</li>
            <li>Commands flow through a reusable registry with menu-state refresh hooks.</li>
          </ul>
        </article>
        <article className="overview-card">
          <h2>Architecture boundary</h2>
          <p>
            Packages hold reusable desktop primitives. Screen composition, route behavior, and product-specific flows
            stay in this repo.
          </p>
        </article>
        <article className="overview-card">
          <h2>Build quality</h2>
          <p>Lint, build, package tests, integration checks, and end-to-end smoke coverage stay local to the app.</p>
        </article>
        <article className="overview-card">
          <h2>Maps playground</h2>
          <p>
            A dedicated sandbox route mounts <code>@moritzbrantner/maps</code> with live filters, feature inspection,
            and temporal playback controls.
          </p>
        </article>
        <article className="overview-card">
          <h2>Command registry</h2>
          <p>{commands.length} commands registered through the desktop command service.</p>
        </article>
      </div>
    </section>
  );
}

function SettingsScreen({ commands, preferences }: { commands: CommandState[]; preferences: DesktopPreferences }) {
  const [hotkeyDrafts, setHotkeyDrafts] = useState(preferences.hotkeys.navigation);
  const [hotkeyErrors, setHotkeyErrors] = useState<Partial<Record<NavigationHotkeyName, string>>>({});

  useEffect(() => {
    setHotkeyDrafts(preferences.hotkeys.navigation);
    setHotkeyErrors({});
  }, [preferences.hotkeys.navigation]);

  function setPreferenceSection<K extends keyof DesktopPreferences>(key: K, value: DesktopPreferences[K]) {
    void window.desktop.preferences.set(key, value);
  }

  function updateHotkeyDraft(name: NavigationHotkeyName, value: string) {
    setHotkeyDrafts((current) => ({
      ...current,
      [name]: value,
    }));
    setHotkeyErrors((current) => ({
      ...current,
      [name]: undefined,
    }));
  }

  function commitHotkey(name: NavigationHotkeyName) {
    const draftValue = hotkeyDrafts[name];
    const currentHotkey = preferences.hotkeys.navigation[name];
    const normalizedValue = normalizeDesktopHotkeyAccelerator(draftValue);

    if (!normalizedValue) {
      setHotkeyDrafts((current) => ({
        ...current,
        [name]: currentHotkey,
      }));
      setHotkeyErrors((current) => ({
        ...current,
        [name]: 'Use shortcuts like CmdOrCtrl+1 or Alt+Shift+D.',
      }));
      return;
    }

    const hasDuplicate = (Object.entries(preferences.hotkeys.navigation) as Array<[NavigationHotkeyName, string]>).some(
      ([otherName, accelerator]) => otherName !== name && accelerator === normalizedValue,
    );

    if (hasDuplicate) {
      setHotkeyDrafts((current) => ({
        ...current,
        [name]: currentHotkey,
      }));
      setHotkeyErrors((current) => ({
        ...current,
        [name]: 'Each page shortcut must be unique.',
      }));
      return;
    }

    if (reservedDesktopHotkeys.includes(normalizedValue as (typeof reservedDesktopHotkeys)[number])) {
      setHotkeyDrafts((current) => ({
        ...current,
        [name]: currentHotkey,
      }));
      setHotkeyErrors((current) => ({
        ...current,
        [name]: 'That shortcut is already reserved for a built-in command.',
      }));
      return;
    }

    setHotkeyDrafts((current) => ({
      ...current,
      [name]: normalizedValue,
    }));
    setHotkeyErrors((current) => ({
      ...current,
      [name]: undefined,
    }));

    if (normalizedValue !== currentHotkey) {
      setPreferenceSection('hotkeys', {
        navigation: {
          ...preferences.hotkeys.navigation,
          [name]: normalizedValue,
        },
      });
    }
  }

  return (
    <section className="screen">
      <p className="screen__eyebrow">Application settings</p>
      <h1 className="screen__title">Settings</h1>
      <p className="screen__description">
        Preferences are stored in the Electron main process and streamed back into the renderer through the preload
        bridge.
      </p>
      <div className="settings-grid">
        <article className="overview-card">
          <h2>Appearance</h2>
          <div className="settings-toggle-group">
            {(['system', 'light', 'dark'] as const).map((themeMode) => (
              <button
                key={themeMode}
                type="button"
                className={preferences.appearance.theme === themeMode ? 'settings-chip is-active' : 'settings-chip'}
                onClick={() => {
                  setPreferenceSection('appearance', { theme: themeMode });
                }}
              >
                {themeMode === 'system' ? 'System theme' : themeMode === 'light' ? 'Light mode' : 'Dark mode'}
              </button>
            ))}
          </div>
        </article>
        <article className="overview-card">
          <h2>Display</h2>
          <label className="settings-checkbox">
            <input
              type="checkbox"
              checked={preferences.display.useGpu}
              onChange={(event) => {
                setPreferenceSection('display', {
                  useGpu: event.target.checked,
                });
              }}
            />
            <span>Use GPU acceleration</span>
          </label>
          <p className="settings-note">Applies the next time the app launches.</p>
        </article>
        <article className="overview-card">
          <h2>Developer</h2>
          <label className="settings-checkbox">
            <input
              type="checkbox"
              checked={preferences.developer.openDevToolsOnLaunch}
              onChange={(event) => {
                setPreferenceSection('developer', {
                  openDevToolsOnLaunch: event.target.checked,
                });
              }}
            />
            <span>Open DevTools automatically on launch</span>
          </label>
        </article>
        <article className="overview-card">
          <h2>Documents</h2>
          <label className="settings-checkbox">
            <input
              type="checkbox"
              checked={preferences.documents.reopenLastDocument}
              onChange={(event) => {
                setPreferenceSection('documents', {
                  reopenLastDocument: event.target.checked,
                });
              }}
            />
            <span>Reopen the last document on launch</span>
          </label>
        </article>
      </div>
      <article className="overview-card settings-card settings-card--wide">
        <h2>Hotkeys</h2>
        <p>Page navigation shortcuts are editable and stored with your other desktop preferences.</p>
        <div className="hotkey-list">
          {appRouteDefinitions
            .filter((definition) => definition.hotkeyName)
            .map((definition) => {
              const hotkeyName = definition.hotkeyName as NavigationHotkeyName;
              return (
                <div key={definition.route} className="hotkey-row">
                  <div className="hotkey-row__copy">
                    <strong>{definition.label}</strong>
                    <p className="hotkey-row__detail">Open the {definition.label.toLowerCase()} page.</p>
                    {hotkeyErrors[hotkeyName] ? <p className="hotkey-row__detail">{hotkeyErrors[hotkeyName]}</p> : null}
                  </div>
                  <div className="hotkey-row__controls">
                    <input
                      type="text"
                      className="hotkey-input"
                      spellCheck={false}
                      autoComplete="off"
                      value={hotkeyDrafts[hotkeyName]}
                      placeholder="CmdOrCtrl+1"
                      onChange={(event) => updateHotkeyDraft(hotkeyName, event.target.value)}
                      onBlur={() => commitHotkey(hotkeyName)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          commitHotkey(hotkeyName);
                          event.currentTarget.blur();
                        }
                      }}
                    />
                    <HotkeyPreview accelerator={preferences.hotkeys.navigation[hotkeyName]} />
                  </div>
                </div>
              );
            })}
        </div>
        <div className="document-toolbar">
          <button
            type="button"
            className="upload-button"
            onClick={() => {
              setPreferenceSection('hotkeys', {
                navigation: {
                  ...defaultNavigationHotkeys,
                },
              });
            }}
          >
            Reset navigation hotkeys
          </button>
        </div>
        <p className="hotkey-row__detail">Built-in document shortcuts stay global and cannot be edited here yet.</p>
        <div className="hotkey-list">
          {[
            {
              accelerator: getCommandAccelerator(commands, 'app.openPreferences') ?? 'CmdOrCtrl+,',
              description: 'Open Settings directly from anywhere in the app.',
              title: 'Preferences',
            },
            {
              accelerator: getCommandAccelerator(commands, 'document.new') ?? 'CmdOrCtrl+N',
              description: 'Create a fresh document draft.',
              title: 'New document',
            },
            {
              accelerator: getCommandAccelerator(commands, 'document.open') ?? 'CmdOrCtrl+O',
              description: 'Open an existing desktop document.',
              title: 'Open document',
            },
            {
              accelerator: getCommandAccelerator(commands, 'document.save') ?? 'CmdOrCtrl+S',
              description: 'Save the active document.',
              title: 'Save document',
            },
            {
              accelerator: getCommandAccelerator(commands, 'document.saveAs') ?? 'CmdOrCtrl+Shift+S',
              description: 'Save the active document under a new path.',
              title: 'Save document as',
            },
          ].map((hotkey) => (
            <div key={hotkey.title} className="hotkey-row">
              <div className="hotkey-row__copy">
                <strong>{hotkey.title}</strong>
                <p className="hotkey-row__detail">{hotkey.description}</p>
              </div>
              <div className="hotkey-row__controls">
                <HotkeyPreview accelerator={hotkey.accelerator} />
              </div>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}

function DocumentsScreen({ documents }: { documents: DocumentState }) {
  return (
    <section className="screen">
      <p className="screen__eyebrow">Save and load</p>
      <h1 className="screen__title">Documents</h1>
      <p className="screen__description">
        This route is backed by reusable document workflow packages and session-scoped renderer state.
      </p>
      <div className="document-toolbar">
        {[
          { commandId: 'document.new', label: 'New' },
          { commandId: 'document.open', label: 'Open' },
          { commandId: 'document.save', label: 'Save' },
          { commandId: 'document.saveAs', label: 'Save As' },
        ].map((action) => (
          <button
            key={action.commandId}
            type="button"
            className="upload-button"
            onClick={() => {
              void window.desktop.commands.run(action.commandId);
            }}
          >
            {action.label}
          </button>
        ))}
      </div>
      <div className="document-summary">
        <span className={documents.isDirty ? 'status-badge status-badge--warn' : 'status-badge'}>
          {documents.isDirty ? 'Unsaved changes' : 'Saved'}
        </span>
        <div className="document-meta">
          <strong>{documents.displayName}</strong>
          <span>{documents.filePath ?? 'No file path yet'}</span>
          <span>{documents.statusMessage}</span>
        </div>
      </div>
      <div className="document-layout">
        <article className="overview-card">
          <label className="document-editor-label" htmlFor="document-editor">
            Current document
          </label>
          <textarea
            id="document-editor"
            className="document-editor"
            value={documents.content}
            placeholder="Write something, then save it to a .desktop.json file."
            onChange={(event) => {
              void window.desktop.documents.updateDraft(event.target.value);
            }}
          />
        </article>
        <article className="overview-card">
          <h2>Recent files</h2>
          <div className="recent-list">
            {documents.recentDocuments.length === 0 ? <p>No recent documents yet.</p> : null}
            {documents.recentDocuments.map((recentDocument) => (
              <button
                key={recentDocument.filePath}
                type="button"
                className="recent-item"
                onClick={() => {
                  void window.desktop.documents.openRecent(recentDocument.filePath);
                }}
              >
                <strong>{recentDocument.name}</strong>
                <span>{recentDocument.filePath}</span>
                <span>{new Date(recentDocument.lastOpenedAt).toLocaleString()}</span>
              </button>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}

function UploadsScreen({ uploads }: { uploads: UploadsState }) {
  const [isDragActive, setIsDragActive] = useState(false);
  const items = uploads.items;
  const queuedCount = items.filter((item) => item.status === 'queued').length;
  const uploadingCount = items.filter((item) => item.status === 'uploading').length;
  const failedCount = items.filter((item) => item.status === 'failed').length;
  const completedCount = items.filter((item) => item.status === 'completed').length;

  function onDragStateChange(event: DragEvent<HTMLDivElement>, active: boolean) {
    event.preventDefault();
    setIsDragActive(active);
  }

  return (
    <section className="screen">
      <p className="screen__eyebrow">Upload workflow</p>
      <h1 className="screen__title">Uploads</h1>
      <p className="screen__description">
        An app-specific upload exemplar with file intake, normalized queue state, retry and cancel controls,
        persistence, and restart recovery.
      </p>
      <article className="upload-card upload-card--hero">
        <div className="upload-copy-stack">
          <p className="upload-card__eyebrow">App-specific example</p>
          <h2>Persistent file intake</h2>
          <p>
            Uploads stay app-owned here while shared packages cover persistence, commands, preferences, and window
            lifecycle.
          </p>
          <ul className="upload-note-list">
            <li>Drop files into the queue or pick them from the main-process dialog.</li>
            <li>Queued items persist across restarts and in-flight work recovers as retryable failures.</li>
            <li>Any filename containing "fail" simulates a retryable transport error on its first attempt.</li>
          </ul>
        </div>
        <div className="upload-info-stack">
          {[
            `Queue size: ${items.length}`,
            `Queued: ${queuedCount}`,
            `Uploading: ${uploadingCount}`,
            `Failed: ${failedCount}`,
            `Completed: ${completedCount}`,
            `Status: ${uploads.statusMessage}`,
          ].map((text) => (
            <div key={text} className="upload-info-row">
              <p>{text}</p>
            </div>
          ))}
        </div>
      </article>
      <div className="upload-surface-grid">
        <div
          className={isDragActive ? 'upload-dropzone is-active' : 'upload-dropzone'}
          tabIndex={0}
          onDragEnter={(event) => onDragStateChange(event, true)}
          onDragOver={(event) => onDragStateChange(event, true)}
          onDragLeave={(event) => {
            if (event.target === event.currentTarget) {
              onDragStateChange(event, false);
            }
          }}
          onDrop={(event) => {
            event.preventDefault();
            setIsDragActive(false);

            const droppedPaths = getDroppedPaths(event.dataTransfer);

            if (droppedPaths.length > 0) {
              void window.desktop.uploads.addDroppedFiles(droppedPaths);
            }
          }}
        >
          <strong>Drop files here</strong>
          <p>Drag local files into this surface, or use the picker to queue them through the Electron main process.</p>
          <div className="document-toolbar">
            <button
              type="button"
              className="upload-button upload-button--primary"
              onClick={() => {
                void window.desktop.uploads.pickFiles();
              }}
            >
              Pick files
            </button>
            <button
              type="button"
              className="upload-button"
              disabled={queuedCount === 0}
              onClick={() => {
                void window.desktop.uploads.startAll();
              }}
            >
              Start queued
            </button>
            <button
              type="button"
              className="upload-button"
              disabled={completedCount === 0}
              onClick={() => {
                void window.desktop.uploads.clearCompleted();
              }}
            >
              Clear completed
            </button>
          </div>
        </div>
        <section className="upload-queue">
          <div className="upload-queue__header">
            <h2>Upload queue</h2>
            <p className="upload-empty-state">{uploads.statusMessage}</p>
          </div>
          <div className="upload-queue__list">
            {items.length === 0 ? <p className="upload-empty-state">No uploads queued yet.</p> : null}
            {items.map((item) => (
              <UploadQueueItem key={item.id} item={item} />
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

function UploadQueueItem({ item }: { item: UploadItem }) {
  return (
    <article className="upload-queue-item">
      <div className="upload-queue-item__meta">
        <div className="upload-copy-stack">
          <h3>{item.name}</h3>
          <p className="upload-queue-item__detail">{item.filePath}</p>
        </div>
        <span className={`upload-status upload-status--${item.status}`}>{item.status}</span>
      </div>
      <div className="upload-progress">
        <span className="upload-progress__bar" style={{ width: `${item.progress}%` }} />
      </div>
      <div className="upload-summary-grid">
        <span className="upload-queue-item__detail">Size: {formatBytes(item.size)}</span>
        <span className="upload-queue-item__detail">Progress: {item.progress}%</span>
        <span className="upload-queue-item__detail">Attempts: {item.attempts}</span>
        <span className="upload-queue-item__detail">Completed: {formatTimestamp(item.completedAt)}</span>
      </div>
      <p className="upload-queue-item__detail">{item.error ?? 'Ready for upload.'}</p>
      <div className="upload-actions">
        {item.status === 'queued' ? (
          <>
            <button
              type="button"
              className="upload-button upload-button--primary"
              onClick={() => {
                void window.desktop.uploads.startUpload(item.id);
              }}
            >
              Start
            </button>
            <button
              type="button"
              className="upload-button"
              onClick={() => {
                void window.desktop.uploads.cancelUpload(item.id);
              }}
            >
              Cancel
            </button>
          </>
        ) : null}
        {item.status === 'uploading' ? (
          <button
            type="button"
            className="upload-button"
            onClick={() => {
              void window.desktop.uploads.cancelUpload(item.id);
            }}
          >
            Cancel
          </button>
        ) : null}
        {item.status === 'failed' || item.status === 'canceled' ? (
          <button
            type="button"
            className="upload-button upload-button--primary"
            onClick={() => {
              void window.desktop.uploads.retryUpload(item.id);
            }}
          >
            Retry
          </button>
        ) : null}
      </div>
    </article>
  );
}

function MapsScreen() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cleanup = () => undefined;
    let cancelled = false;

    async function mountMaps() {
      const module = await import('./maps-playground');

      if (cancelled || !mountRef.current) {
        return;
      }

      module.mountMapsPlayground(mountRef.current);
      cleanup = () => module.unmountMapsPlayground();
    }

    void mountMaps();
    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

  return (
    <section className="screen">
      <p className="screen__eyebrow">Component sandbox</p>
      <h1 className="screen__title">Maps playground</h1>
      <p className="screen__description">
        Play with <code>@moritzbrantner/maps</code> in-place: filter datasets, inspect selected features, and exercise
        clustering plus temporal playback without leaving the desktop shell.
      </p>
      <div ref={mountRef} className="maps-screen-root" />
    </section>
  );
}

function HotkeyPreview({ accelerator, inline = false }: { accelerator: string; inline?: boolean }) {
  return (
    <span className={inline ? 'hotkey-preview hotkey-preview--inline' : 'hotkey-preview'} aria-hidden="true">
      {splitDesktopHotkeyAccelerator(accelerator).map((token) => (
        <kbd key={`${accelerator}:${token}`} className={inline ? 'hotkey-kbd hotkey-kbd--inline' : 'hotkey-kbd'}>
          {token}
        </kbd>
      ))}
    </span>
  );
}

function getCommandAccelerator(commands: CommandState[], commandId: string) {
  return commands.find((command) => command.id === commandId)?.accelerator ?? null;
}

export function RendererRoutePreview({ route }: { route: AppRoute }) {
  return (
    <>
      <Navbar route={route} hotkeys={defaultDesktopPreferences.hotkeys.navigation} />
      {route === 'home' ? <HomeScreen commands={[]} /> : null}
      {route === 'settings' ? <SettingsScreen commands={[]} preferences={defaultDesktopPreferences} /> : null}
      {route === 'documents' ? <DocumentsScreen documents={defaultDocumentState} /> : null}
      {route === 'uploads' ? <UploadsScreen uploads={defaultUploadsState} /> : null}
      {route === 'maps' ? <MapsScreen /> : null}
    </>
  );
}

const rootElement = document.getElementById('app');

if (rootElement) {
  createRoot(rootElement).render(<App />);
}
