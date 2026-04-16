import './index.css';

import { createSharedButtonLabel } from '@moritzbrantner/ui';

import type { DocumentState } from '@moritzbrantner/electron-documents/renderer';

import { AppRoute, createNavbar } from './navbar';
import {
  defaultDesktopPreferences,
  resolveThemePreference,
  type DesktopPreferences,
} from './platform/shared/preferences';
import {
  defaultUploadsState,
  type UploadItem,
} from './platform/shared/uploads';

const systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');

const defaultDocumentState: DocumentState = {
  content: '',
  displayName: 'Untitled',
  filePath: null,
  isDirty: false,
  lastSavedAt: null,
  recentDocuments: [],
  statusMessage: 'Ready',
};

const appState = {
  documents: defaultDocumentState,
  preferences: defaultDesktopPreferences,
  ready: false,
  uploads: defaultUploadsState,
};

function applyTheme(preferences: DesktopPreferences) {
  const theme = resolveThemePreference(preferences.appearance.theme, systemThemeQuery.matches);
  document.documentElement.dataset.theme = theme;
}

function getCurrentRoute(): AppRoute {
  if (window.location.hash === '#/settings') {
    return 'settings';
  }

  if (window.location.hash === '#/documents') {
    return 'documents';
  }

  if (window.location.hash === '#/uploads') {
    return 'uploads';
  }

  return 'home';
}

function createScreenFrame(eyebrowText: string, titleText: string, descriptionText: string) {
  const screen = document.createElement('section');
  screen.className = 'screen';

  const eyebrow = document.createElement('p');
  eyebrow.className = 'screen__eyebrow';
  eyebrow.textContent = eyebrowText;

  const title = document.createElement('h1');
  title.className = 'screen__title';
  title.textContent = titleText;

  const description = document.createElement('p');
  description.className = 'screen__description';
  description.textContent = descriptionText;

  screen.append(eyebrow, title, description);

  return screen;
}

function createCard(titleText: string, bodyText: string) {
  const card = document.createElement('article');
  card.className = 'overview-card';

  const title = document.createElement('h2');
  title.textContent = titleText;

  const body = document.createElement('p');
  body.textContent = bodyText;

  card.append(title, body);
  return card;
}

function createHomeScreen() {
  const screen = createScreenFrame(
    'Desktop foundation',
    'Electron template',
    'A reusable desktop starter with typed main/preload services, persistent documents, persistent uploads, and package-level platform primitives.',
  );

  const grid = document.createElement('div');
  grid.className = 'overview-grid';

  const sharedPackageCard = createCard(
    'Shared platform package',
    'The app consumes the same final package names you can publish later under the @moritzbrantner scope.',
  );

  const sharedPackageLabel = document.createElement('code');
  sharedPackageLabel.className = 'shared-package-label';
  sharedPackageLabel.textContent = createSharedButtonLabel({ label: 'desktop-launch' });
  sharedPackageCard.append(sharedPackageLabel);

  const featuresCard = document.createElement('article');
  featuresCard.className = 'overview-card';

  const featuresTitle = document.createElement('h2');
  featuresTitle.textContent = 'Template baseline';

  const featuresList = document.createElement('ul');
  featuresList.className = 'overview-list';

  [
    'Preferences persist through a typed preload-safe store.',
    'Documents support save, save as, reopen recent, and dirty state.',
    'Uploads support queueing, retry, cancelation, persistence, and restart recovery.',
    'Commands flow through a reusable registry with menu-state refresh hooks.',
  ].forEach((text) => {
    const item = document.createElement('li');
    item.textContent = text;
    featuresList.append(item);
  });

  featuresCard.append(featuresTitle, featuresList);

  const structureCard = createCard(
    'Architecture boundary',
    'Packages hold reusable desktop primitives. App-specific workflows, like uploads, stay in the root app layer until they prove reusable.',
  );

  const qualityCard = createCard(
    'Build quality',
    'The workspace now targets Node 24, builds package dist outputs, and is intended to run lint, build, unit, integration, and end-to-end checks in CI.',
  );

  grid.append(sharedPackageCard, featuresCard, structureCard, qualityCard);
  screen.append(grid);

  return screen;
}

function createSettingsScreen() {
  const screen = createScreenFrame(
    'Application settings',
    'Settings',
    'Preferences are stored in the Electron main process and streamed back into the renderer through the preload bridge.',
  );

  const grid = document.createElement('div');
  grid.className = 'settings-grid';

  const appearanceCard = document.createElement('article');
  appearanceCard.className = 'overview-card';

  const appearanceTitle = document.createElement('h2');
  appearanceTitle.textContent = 'Appearance';

  const themeGroup = document.createElement('div');
  themeGroup.className = 'settings-toggle-group';

  ['system', 'light', 'dark'].forEach((themeMode) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className =
      appState.preferences.appearance.theme === themeMode ? 'settings-chip is-active' : 'settings-chip';
    button.textContent =
      themeMode === 'system'
        ? 'System theme'
        : themeMode === 'light'
          ? 'Light mode'
          : 'Dark mode';
    button.addEventListener('click', () => {
      void window.desktop.preferences.set('appearance', {
        theme: themeMode as DesktopPreferences['appearance']['theme'],
      });
    });
    themeGroup.append(button);
  });

  appearanceCard.append(appearanceTitle, themeGroup);

  const displayCard = document.createElement('article');
  displayCard.className = 'overview-card';

  const displayTitle = document.createElement('h2');
  displayTitle.textContent = 'Display';

  const gpuToggle = document.createElement('label');
  gpuToggle.className = 'settings-checkbox';

  const gpuCheckbox = document.createElement('input');
  gpuCheckbox.type = 'checkbox';
  gpuCheckbox.checked = appState.preferences.display.useGpu;
  gpuCheckbox.addEventListener('change', () => {
    void window.desktop.preferences.set('display', {
      useGpu: gpuCheckbox.checked,
    });
  });

  const gpuText = document.createElement('span');
  gpuText.textContent = 'Use GPU acceleration';
  gpuToggle.append(gpuCheckbox, gpuText);

  const gpuNote = document.createElement('p');
  gpuNote.className = 'settings-note';
  gpuNote.textContent = 'Applies the next time the app launches.';

  displayCard.append(displayTitle, gpuToggle, gpuNote);

  const developerCard = document.createElement('article');
  developerCard.className = 'overview-card';

  const developerTitle = document.createElement('h2');
  developerTitle.textContent = 'Developer';

  const developerToggle = document.createElement('label');
  developerToggle.className = 'settings-checkbox';

  const developerCheckbox = document.createElement('input');
  developerCheckbox.type = 'checkbox';
  developerCheckbox.checked = appState.preferences.developer.openDevToolsOnLaunch;
  developerCheckbox.addEventListener('change', () => {
    void window.desktop.preferences.set('developer', {
      openDevToolsOnLaunch: developerCheckbox.checked,
    });
  });

  const developerText = document.createElement('span');
  developerText.textContent = 'Open DevTools automatically on launch';
  developerToggle.append(developerCheckbox, developerText);
  developerCard.append(developerTitle, developerToggle);

  const documentsCard = document.createElement('article');
  documentsCard.className = 'overview-card';

  const documentsTitle = document.createElement('h2');
  documentsTitle.textContent = 'Documents';

  const reopenToggle = document.createElement('label');
  reopenToggle.className = 'settings-checkbox';

  const reopenCheckbox = document.createElement('input');
  reopenCheckbox.type = 'checkbox';
  reopenCheckbox.checked = appState.preferences.documents.reopenLastDocument;
  reopenCheckbox.addEventListener('change', () => {
    void window.desktop.preferences.set('documents', {
      reopenLastDocument: reopenCheckbox.checked,
    });
  });

  const reopenText = document.createElement('span');
  reopenText.textContent = 'Reopen the last document on launch';
  reopenToggle.append(reopenCheckbox, reopenText);
  documentsCard.append(documentsTitle, reopenToggle);

  grid.append(appearanceCard, displayCard, developerCard, documentsCard);
  screen.append(grid);

  return screen;
}

function createMetaLine(text: string) {
  const line = document.createElement('span');
  line.textContent = text;
  return line;
}

function createDocumentsScreen() {
  const screen = createScreenFrame(
    'Save and load',
    'Documents',
    'This route is backed by reusable document workflow packages and session-scoped renderer state.',
  );

  const toolbar = document.createElement('div');
  toolbar.className = 'document-toolbar';

  const actions: Array<{ commandId: string; label: string }> = [
    { commandId: 'document.new', label: 'New' },
    { commandId: 'document.open', label: 'Open' },
    { commandId: 'document.save', label: 'Save' },
    { commandId: 'document.saveAs', label: 'Save As' },
  ];

  actions.forEach((action) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'upload-button';
    button.textContent = action.label;
    button.addEventListener('click', () => {
      void window.desktop.commands.run(action.commandId);
    });
    toolbar.append(button);
  });

  const summary = document.createElement('div');
  summary.className = 'document-summary';

  const statusBadge = document.createElement('span');
  statusBadge.className = appState.documents.isDirty ? 'status-badge status-badge--warn' : 'status-badge';
  statusBadge.textContent = appState.documents.isDirty ? 'Unsaved changes' : 'Saved';

  const meta = document.createElement('div');
  meta.className = 'document-meta';

  const nameLine = document.createElement('strong');
  nameLine.textContent = appState.documents.displayName;
  meta.append(
    nameLine,
    createMetaLine(appState.documents.filePath ?? 'No file path yet'),
    createMetaLine(appState.documents.statusMessage),
  );

  summary.append(statusBadge, meta);

  const layout = document.createElement('div');
  layout.className = 'document-layout';

  const editorCard = document.createElement('article');
  editorCard.className = 'overview-card';

  const editorLabel = document.createElement('label');
  editorLabel.className = 'document-editor-label';
  editorLabel.textContent = 'Current document';

  const editor = document.createElement('textarea');
  editor.className = 'document-editor';
  editor.value = appState.documents.content;
  editor.placeholder = 'Write something, then save it to a .desktop.json file.';
  editor.addEventListener('input', () => {
    void window.desktop.documents.updateDraft(editor.value);
  });

  editorCard.append(editorLabel, editor);

  const recentCard = document.createElement('article');
  recentCard.className = 'overview-card';

  const recentTitle = document.createElement('h2');
  recentTitle.textContent = 'Recent files';

  const recentList = document.createElement('div');
  recentList.className = 'recent-list';

  if (appState.documents.recentDocuments.length === 0) {
    const empty = document.createElement('p');
    empty.textContent = 'No recent documents yet.';
    recentList.append(empty);
  } else {
    appState.documents.recentDocuments.forEach((recentDocument) => {
      const recentButton = document.createElement('button');
      recentButton.type = 'button';
      recentButton.className = 'recent-item';

      const name = document.createElement('strong');
      name.textContent = recentDocument.name;

      recentButton.append(
        name,
        createMetaLine(recentDocument.filePath),
        createMetaLine(new Date(recentDocument.lastOpenedAt).toLocaleString()),
      );
      recentButton.addEventListener('click', () => {
        void window.desktop.documents.openRecent(recentDocument.filePath);
      });
      recentList.append(recentButton);
    });
  }

  recentCard.append(recentTitle, recentList);
  layout.append(editorCard, recentCard);
  screen.append(toolbar, summary, layout);

  return screen;
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

function createUploadButton(
  label: string,
  onClick: () => void,
  options?: { disabled?: boolean; primary?: boolean },
) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = options?.primary ? 'upload-button upload-button--primary' : 'upload-button';
  button.disabled = Boolean(options?.disabled);
  button.textContent = label;
  button.addEventListener('click', onClick);
  return button;
}

function getDroppedPaths(dataTransfer: DataTransfer | null) {
  if (!dataTransfer) {
    return [];
  }

  return Array.from(dataTransfer.files)
    .map((file) => (file as File & { path?: string }).path)
    .filter((filePath): filePath is string => typeof filePath === 'string' && filePath.length > 0);
}

function createUploadStatus(item: UploadItem) {
  const badge = document.createElement('span');
  badge.className = `upload-status upload-status--${item.status}`;
  badge.textContent = item.status;
  return badge;
}

function createUploadProgress(item: UploadItem) {
  const progress = document.createElement('div');
  progress.className = 'upload-progress';

  const bar = document.createElement('span');
  bar.className = 'upload-progress__bar';
  bar.style.width = `${item.progress}%`;

  progress.append(bar);
  return progress;
}

function createUploadActions(item: UploadItem) {
  const actions = document.createElement('div');
  actions.className = 'upload-actions';

  if (item.status === 'queued') {
    actions.append(
      createUploadButton('Start', () => {
        void window.desktop.uploads.startUpload(item.id);
      }, { primary: true }),
      createUploadButton('Cancel', () => {
        void window.desktop.uploads.cancelUpload(item.id);
      }),
    );
  } else if (item.status === 'uploading') {
    actions.append(
      createUploadButton('Cancel', () => {
        void window.desktop.uploads.cancelUpload(item.id);
      }),
    );
  } else if (item.status === 'failed' || item.status === 'canceled') {
    actions.append(
      createUploadButton('Retry', () => {
        void window.desktop.uploads.retryUpload(item.id);
      }, { primary: true }),
    );
  }

  return actions;
}

function createUploadQueueItem(item: UploadItem) {
  const queueItem = document.createElement('article');
  queueItem.className = 'upload-queue-item';

  const meta = document.createElement('div');
  meta.className = 'upload-queue-item__meta';

  const copyStack = document.createElement('div');
  copyStack.className = 'upload-copy-stack';

  const title = document.createElement('h3');
  title.textContent = item.name;

  const detail = document.createElement('p');
  detail.className = 'upload-queue-item__detail';
  detail.textContent = item.filePath;

  copyStack.append(title, detail);
  meta.append(copyStack, createUploadStatus(item));

  const stats = document.createElement('div');
  stats.className = 'upload-summary-grid';

  [
    `Size: ${formatBytes(item.size)}`,
    `Progress: ${item.progress}%`,
    `Attempts: ${item.attempts}`,
    `Completed: ${formatTimestamp(item.completedAt)}`,
  ].forEach((text) => {
    const stat = document.createElement('span');
    stat.className = 'upload-queue-item__detail';
    stat.textContent = text;
    stats.append(stat);
  });

  const error = document.createElement('p');
  error.className = 'upload-queue-item__detail';
  error.textContent = item.error ?? 'Ready for upload.';

  queueItem.append(meta, createUploadProgress(item), stats, error, createUploadActions(item));
  return queueItem;
}

function createUploadScreen() {
  const screen = createScreenFrame(
    'Upload workflow',
    'Uploads',
    'An app-specific upload exemplar with file intake, normalized queue state, retry and cancel controls, persistence, and restart recovery.',
  );

  const hero = document.createElement('article');
  hero.className = 'upload-card upload-card--hero';

  const copyStack = document.createElement('div');
  copyStack.className = 'upload-copy-stack';

  const eyebrow = document.createElement('p');
  eyebrow.className = 'upload-card__eyebrow';
  eyebrow.textContent = 'App-specific example';

  const heroTitle = document.createElement('h2');
  heroTitle.textContent = 'Persistent file intake';

  const heroBody = document.createElement('p');
  heroBody.textContent =
    'Uploads remain app-specific while the shared platform packages cover persistence, commands, preferences, and window lifecycle.';

  const noteList = document.createElement('ul');
  noteList.className = 'upload-note-list';

  [
    'Drop files into the queue or pick them from the main-process dialog.',
    'Queued items persist across restarts and in-flight work recovers as retryable failures.',
    'Any filename containing "fail" simulates a retryable transport error on its first attempt.',
  ].forEach((text) => {
    const item = document.createElement('li');
    item.textContent = text;
    noteList.append(item);
  });

  copyStack.append(eyebrow, heroTitle, heroBody, noteList);

  const infoStack = document.createElement('div');
  infoStack.className = 'upload-info-stack';

  const items = appState.uploads.items;
  const queuedCount = items.filter((item) => item.status === 'queued').length;
  const uploadingCount = items.filter((item) => item.status === 'uploading').length;
  const failedCount = items.filter((item) => item.status === 'failed').length;
  const completedCount = items.filter((item) => item.status === 'completed').length;

  [
    `Queue size: ${items.length}`,
    `Queued: ${queuedCount}`,
    `Uploading: ${uploadingCount}`,
    `Failed: ${failedCount}`,
    `Completed: ${completedCount}`,
    `Status: ${appState.uploads.statusMessage}`,
  ].forEach((text) => {
    const row = document.createElement('div');
    row.className = 'upload-info-row';

    const body = document.createElement('p');
    body.textContent = text;
    row.append(body);
    infoStack.append(row);
  });

  hero.append(copyStack, infoStack);

  const surfaceGrid = document.createElement('div');
  surfaceGrid.className = 'upload-surface-grid';

  const dropzone = document.createElement('div');
  dropzone.className = 'upload-dropzone';
  dropzone.tabIndex = 0;

  const dropTitle = document.createElement('strong');
  dropTitle.textContent = 'Drop files here';

  const dropText = document.createElement('p');
  dropText.textContent =
    'Drag local files into this surface, or use the picker to queue them through the Electron main process.';

  const dropButtons = document.createElement('div');
  dropButtons.className = 'document-toolbar';

  const hasQueuedUploads = queuedCount > 0;
  const hasCompletedUploads = completedCount > 0;

  dropButtons.append(
    createUploadButton('Pick files', () => {
      void window.desktop.uploads.pickFiles();
    }, { primary: true }),
    createUploadButton('Start queued', () => {
      void window.desktop.uploads.startAll();
    }, { disabled: !hasQueuedUploads }),
    createUploadButton('Clear completed', () => {
      void window.desktop.uploads.clearCompleted();
    }, { disabled: !hasCompletedUploads }),
  );

  const setDropzoneActive = (isActive: boolean) => {
    dropzone.classList.toggle('is-active', isActive);
  };

  dropzone.addEventListener('dragenter', (event) => {
    event.preventDefault();
    setDropzoneActive(true);
  });

  dropzone.addEventListener('dragover', (event) => {
    event.preventDefault();
    setDropzoneActive(true);
  });

  dropzone.addEventListener('dragleave', (event) => {
    if (event.target === dropzone) {
      setDropzoneActive(false);
    }
  });

  dropzone.addEventListener('drop', (event) => {
    event.preventDefault();
    setDropzoneActive(false);

    const droppedPaths = getDroppedPaths(event.dataTransfer);

    if (droppedPaths.length === 0) {
      return;
    }

    void window.desktop.uploads.addDroppedFiles(droppedPaths);
  });

  dropzone.append(dropTitle, dropText, dropButtons);

  const queue = document.createElement('section');
  queue.className = 'upload-queue';

  const queueHeader = document.createElement('div');
  queueHeader.className = 'upload-queue__header';

  const queueTitle = document.createElement('h2');
  queueTitle.textContent = 'Upload queue';

  const queueStatus = document.createElement('p');
  queueStatus.className = 'upload-empty-state';
  queueStatus.textContent = appState.uploads.statusMessage;

  queueHeader.append(queueTitle, queueStatus);

  const queueList = document.createElement('div');
  queueList.className = 'upload-queue__list';

  if (items.length === 0) {
    const emptyState = document.createElement('p');
    emptyState.className = 'upload-empty-state';
    emptyState.textContent = 'No uploads queued yet.';
    queueList.append(emptyState);
  } else {
    items.forEach((item) => {
      queueList.append(createUploadQueueItem(item));
    });
  }

  queue.append(queueHeader, queueList);
  surfaceGrid.append(dropzone, queue);
  screen.append(hero, surfaceGrid);

  return screen;
}

function renderApp() {
  const app = document.getElementById('app');
  if (!app) {
    return;
  }

  const route = getCurrentRoute();
  app.innerHTML = '';
  app.append(createNavbar(route));

  if (!appState.ready) {
    app.append(createScreenFrame('Loading', 'Loading desktop services', 'Connecting to the preload bridge.'));
    return;
  }

  if (route === 'settings') {
    app.append(createSettingsScreen());
    return;
  }

  if (route === 'documents') {
    app.append(createDocumentsScreen());
    return;
  }

  if (route === 'uploads') {
    app.append(createUploadScreen());
    return;
  }

  app.append(createHomeScreen());
}

function handleKeyboardShortcuts(event: KeyboardEvent) {
  if (!event.ctrlKey && !event.metaKey) {
    return;
  }

  if (event.altKey) {
    return;
  }

  const key = event.key.toLowerCase();
  let commandId: string | null = null;

  if (key === ',') {
    commandId = 'app.openPreferences';
  } else if (key === 'n' && !event.shiftKey) {
    commandId = 'document.new';
  } else if (key === 'o' && !event.shiftKey) {
    commandId = 'document.open';
  } else if (key === 's' && event.shiftKey) {
    commandId = 'document.saveAs';
  } else if (key === 's') {
    commandId = 'document.save';
  }

  if (!commandId) {
    return;
  }

  event.preventDefault();
  void window.desktop.commands.run(commandId);
}

async function bootstrap() {
  const [preferences, documents, uploads] = await Promise.all([
    window.desktop.preferences.getAll(),
    window.desktop.documents.getState(),
    window.desktop.uploads.getState(),
  ]);

  appState.preferences = preferences;
  appState.documents = documents;
  appState.uploads = uploads;
  appState.ready = true;
  applyTheme(preferences);

  window.desktop.preferences.subscribe((nextPreferences) => {
    appState.preferences = nextPreferences;
    applyTheme(nextPreferences);
    renderApp();
  });

  window.desktop.documents.subscribe((nextDocuments) => {
    appState.documents = nextDocuments;
    renderApp();
  });

  window.desktop.uploads.subscribe((nextUploads) => {
    appState.uploads = nextUploads;
    renderApp();
  });

  systemThemeQuery.addEventListener('change', () => {
    applyTheme(appState.preferences);
  });

  window.addEventListener('keydown', handleKeyboardShortcuts);
  renderApp();
}

window.addEventListener('hashchange', renderApp);
renderApp();
void bootstrap();
