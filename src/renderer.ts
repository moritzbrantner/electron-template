import './index.css';
import { insertCodeFence } from './platform/shared/markdown-editing';
import { renderMarkdownPreview } from './platform/shared/markdown-preview';

import { createSharedButtonLabel } from '@moritzbrantner/ui';

import type { CommandState } from '@moritzbrantner/electron-commands/renderer';
import type { DocumentState } from '@moritzbrantner/electron-documents/renderer';

import { appRouteDefinitions, type AppRoute, createNavbar, getRouteFromHash } from './navbar';
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
  commands: [] as CommandState[],
  documents: defaultDocumentState,
  preferences: defaultDesktopPreferences,
  ready: false,
  uploads: defaultUploadsState,
};
let mapsPlaygroundModule: typeof import('./maps-playground') | null = null;
let mapsPlaygroundRenderVersion = 0;

interface DocumentEditorSnapshot {
  hadFocus: boolean;
  scrollTop: number;
  selectionEnd: number | null;
  selectionStart: number | null;
}

function countWords(text: string) {
  const trimmed = text.trim();

  if (trimmed.length === 0) {
    return 0;
  }

  return trimmed.split(/\s+/).length;
}

function updateDocumentEditorValue(
  editor: HTMLTextAreaElement,
  nextValue: string,
  selectionStart: number,
  selectionEnd: number,
) {
  editor.value = nextValue;
  editor.focus({ preventScroll: true });
  editor.setSelectionRange(selectionStart, selectionEnd);
  void window.desktop.documents.updateDraft(nextValue);
}

function wrapMarkdownSelection(
  editor: HTMLTextAreaElement,
  prefix: string,
  suffix: string,
  fallbackText: string,
) {
  const selectionStart = editor.selectionStart;
  const selectionEnd = editor.selectionEnd;
  const selectedText = editor.value.slice(selectionStart, selectionEnd) || fallbackText;
  const nextValue =
    editor.value.slice(0, selectionStart) +
    prefix +
    selectedText +
    suffix +
    editor.value.slice(selectionEnd);

  updateDocumentEditorValue(
    editor,
    nextValue,
    selectionStart + prefix.length,
    selectionStart + prefix.length + selectedText.length,
  );
}

function prefixMarkdownSelection(
  editor: HTMLTextAreaElement,
  prefix: string,
  fallbackText: string,
) {
  const selectionStart = editor.selectionStart;
  const selectionEnd = editor.selectionEnd;
  const selectedText = editor.value.slice(selectionStart, selectionEnd) || fallbackText;
  const nextText = selectedText
    .split('\n')
    .map((line) => `${prefix}${line}`)
    .join('\n');
  const nextValue =
    editor.value.slice(0, selectionStart) + nextText + editor.value.slice(selectionEnd);

  updateDocumentEditorValue(
    editor,
    nextValue,
    selectionStart,
    selectionStart + nextText.length,
  );
}

function insertMarkdownLink(editor: HTMLTextAreaElement) {
  const selectionStart = editor.selectionStart;
  const selectionEnd = editor.selectionEnd;
  const selectedText = editor.value.slice(selectionStart, selectionEnd) || 'link text';
  const linkText = `[${selectedText}](https://example.com)`;
  const nextValue =
    editor.value.slice(0, selectionStart) + linkText + editor.value.slice(selectionEnd);
  const urlStart = selectionStart + selectedText.length + 3;
  const urlEnd = urlStart + 'https://example.com'.length;

  updateDocumentEditorValue(editor, nextValue, urlStart, urlEnd);
}

function captureDocumentEditorSnapshot(): DocumentEditorSnapshot | null {
  const editor = document.querySelector<HTMLTextAreaElement>('textarea.document-editor');

  if (!editor) {
    return null;
  }

  return {
    hadFocus: document.activeElement === editor,
    scrollTop: editor.scrollTop,
    selectionEnd: editor.selectionEnd,
    selectionStart: editor.selectionStart,
  };
}

function restoreDocumentEditorSnapshot(snapshot: DocumentEditorSnapshot | null) {
  if (!snapshot?.hadFocus) {
    return;
  }

  const editor = document.querySelector<HTMLTextAreaElement>('textarea.document-editor');

  if (!editor) {
    return;
  }

  editor.focus({ preventScroll: true });

  if (
    typeof snapshot.selectionStart === 'number' &&
    typeof snapshot.selectionEnd === 'number'
  ) {
    editor.setSelectionRange(snapshot.selectionStart, snapshot.selectionEnd);
  }

  editor.scrollTop = snapshot.scrollTop;
}

function applyTheme(preferences: DesktopPreferences) {
  const theme = resolveThemePreference(preferences.appearance.theme, systemThemeQuery.matches);
  document.documentElement.dataset.theme = theme;
}

function getCurrentRoute(): AppRoute {
  return getRouteFromHash(window.location.hash);
}

function navigateToRoute(route: AppRoute) {
  const targetRoute = appRouteDefinitions.find((definition) => definition.route === route);

  if (!targetRoute) {
    return;
  }

  window.location.hash = targetRoute.href;
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

function createHotkeyPreview(accelerator: string) {
  const preview = document.createElement('span');
  preview.className = 'hotkey-preview';

  splitDesktopHotkeyAccelerator(accelerator).forEach((token) => {
    const keycap = document.createElement('kbd');
    keycap.className = 'hotkey-kbd';
    keycap.textContent = token;
    preview.append(keycap);
  });

  return preview;
}

function createHotkeyDetail(text: string) {
  const detail = document.createElement('p');
  detail.className = 'hotkey-row__detail';
  detail.textContent = text;
  return detail;
}

function createHotkeyRow(
  titleText: string,
  descriptionText: string,
  accelerator: string,
  options?: { editable?: boolean; onChange?: (value: string, input: HTMLInputElement) => void },
) {
  const row = document.createElement('div');
  row.className = 'hotkey-row';

  const copy = document.createElement('div');
  copy.className = 'hotkey-row__copy';

  const title = document.createElement('strong');
  title.textContent = titleText;
  copy.append(title, createHotkeyDetail(descriptionText));

  const controls = document.createElement('div');
  controls.className = 'hotkey-row__controls';

  if (options?.editable && options.onChange) {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'hotkey-input';
    input.spellcheck = false;
    input.autocomplete = 'off';
    input.value = accelerator;
    input.placeholder = 'CmdOrCtrl+1';
    input.addEventListener('change', () => {
      options.onChange?.(input.value, input);
    });
    controls.append(input);
  }

  controls.append(createHotkeyPreview(accelerator));
  row.append(copy, controls);
  return row;
}

function getCommandAccelerator(commandId: string) {
  return appState.commands.find((command) => command.id === commandId)?.accelerator ?? null;
}

function normalizeKeyboardEventAccelerator(event: KeyboardEvent) {
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
    'Documents support markdown editing, save/open flows, recent files, and dirty state.',
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

  const mapsCard = createCard(
    'Maps playground',
    'A dedicated sandbox route now mounts @moritzbrantner/maps with live filters, feature inspection, and temporal playback controls.',
  );

  grid.append(sharedPackageCard, featuresCard, structureCard, qualityCard, mapsCard);
  screen.append(grid);

  return screen;
}

function createMapsScreen() {
  const screen = createScreenFrame(
    'Component sandbox',
    'Maps playground',
    'Play with @moritzbrantner/maps in-place: filter datasets, inspect selected features, and exercise clustering plus temporal playback without leaving the desktop shell.',
  );

  const mountPoint = document.createElement('div');
  mountPoint.className = 'maps-screen-root';
  screen.append(mountPoint);

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

  const hotkeysCard = document.createElement('article');
  hotkeysCard.className = 'overview-card settings-card settings-card--wide';

  const hotkeysTitle = document.createElement('h2');
  hotkeysTitle.textContent = 'Hotkeys';

  const hotkeysBody = document.createElement('p');
  hotkeysBody.textContent =
    'Page navigation shortcuts are editable and stored with your other desktop preferences.';

  const editableHotkeys = document.createElement('div');
  editableHotkeys.className = 'hotkey-list';

  appRouteDefinitions.forEach((definition) => {
    if (!definition.hotkeyName) {
      return;
    }

    const currentHotkey = appState.preferences.hotkeys.navigation[definition.hotkeyName];

    editableHotkeys.append(
      createHotkeyRow(
        definition.label,
        `Open the ${definition.label.toLowerCase()} page.`,
        currentHotkey,
        {
          editable: true,
          onChange(value, input) {
            const normalizedValue = normalizeDesktopHotkeyAccelerator(value);

            if (!normalizedValue) {
              input.value = currentHotkey;
              input.setCustomValidity('Use shortcuts like CmdOrCtrl+1 or Alt+Shift+D.');
              input.reportValidity();
              input.setCustomValidity('');
              return;
            }

            const hasDuplicate = (
              Object.entries(appState.preferences.hotkeys.navigation) as Array<
                [NavigationHotkeyName, string]
              >
            ).some(
              ([name, accelerator]) =>
                name !== definition.hotkeyName && accelerator === normalizedValue,
            );

            if (hasDuplicate) {
              input.value = currentHotkey;
              input.setCustomValidity('Each page shortcut must be unique.');
              input.reportValidity();
              input.setCustomValidity('');
              return;
            }

            if (reservedDesktopHotkeys.includes(normalizedValue as (typeof reservedDesktopHotkeys)[number])) {
              input.value = currentHotkey;
              input.setCustomValidity('That shortcut is already reserved for a built-in command.');
              input.reportValidity();
              input.setCustomValidity('');
              return;
            }

            if (normalizedValue === currentHotkey) {
              input.value = normalizedValue;
              return;
            }

            void window.desktop.preferences.set('hotkeys', {
              navigation: {
                ...appState.preferences.hotkeys.navigation,
                [definition.hotkeyName]: normalizedValue,
              },
            });
          },
        },
      ),
    );
  });

  const hotkeyActions = document.createElement('div');
  hotkeyActions.className = 'document-toolbar';

  const resetHotkeysButton = document.createElement('button');
  resetHotkeysButton.type = 'button';
  resetHotkeysButton.className = 'upload-button';
  resetHotkeysButton.textContent = 'Reset navigation hotkeys';
  resetHotkeysButton.addEventListener('click', () => {
    void window.desktop.preferences.set('hotkeys', {
      navigation: {
        ...defaultNavigationHotkeys,
      },
    });
  });
  hotkeyActions.append(resetHotkeysButton);

  const commandHotkeys = document.createElement('div');
  commandHotkeys.className = 'hotkey-list';

  [
    {
      accelerator: getCommandAccelerator('app.openPreferences') ?? 'CmdOrCtrl+,',
      description: 'Open Settings directly from anywhere in the app.',
      title: 'Preferences',
    },
    {
      accelerator: getCommandAccelerator('document.new') ?? 'CmdOrCtrl+N',
      description: 'Create a fresh document draft.',
      title: 'New document',
    },
    {
      accelerator: getCommandAccelerator('document.open') ?? 'CmdOrCtrl+O',
      description: 'Open an existing desktop document.',
      title: 'Open document',
    },
    {
      accelerator: getCommandAccelerator('document.save') ?? 'CmdOrCtrl+S',
      description: 'Save the active document.',
      title: 'Save document',
    },
    {
      accelerator: getCommandAccelerator('document.saveAs') ?? 'CmdOrCtrl+Shift+S',
      description: 'Save the active document under a new path.',
      title: 'Save document as',
    },
  ].forEach((hotkey) => {
    commandHotkeys.append(
      createHotkeyRow(hotkey.title, hotkey.description, hotkey.accelerator),
    );
  });

  hotkeysCard.append(
    hotkeysTitle,
    hotkeysBody,
    editableHotkeys,
    hotkeyActions,
    createHotkeyDetail('Built-in document shortcuts stay global and cannot be edited here yet.'),
    commandHotkeys,
  );

  grid.append(appearanceCard, displayCard, developerCard, documentsCard);
  screen.append(grid, hotkeysCard);

  return screen;
}

function createMetaLine(text: string) {
  const line = document.createElement('span');
  line.textContent = text;
  return line;
}

function createDocumentsScreen() {
  const screen = createScreenFrame(
    'Write in markdown',
    'Documents',
    'Create markdown notes with a live preview, reusable save/open commands, and recent-file history.',
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

  const content = appState.documents.content;
  const wordCount = countWords(content);
  const characterCount = content.length;

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
    createMetaLine(appState.documents.filePath ?? 'Not saved yet'),
    createMetaLine(appState.documents.statusMessage),
    createMetaLine(
      appState.documents.lastSavedAt
        ? `Last saved ${new Date(appState.documents.lastSavedAt).toLocaleString()}`
        : 'No saved version yet',
    ),
  );

  const stats = document.createElement('div');
  stats.className = 'document-stats';

  [
    { label: 'Words', value: wordCount.toLocaleString() },
    { label: 'Characters', value: characterCount.toLocaleString() },
    { label: 'Lines', value: content.length === 0 ? '0' : content.split('\n').length.toLocaleString() },
  ].forEach((item) => {
    const stat = document.createElement('div');
    stat.className = 'document-stat';

    const value = document.createElement('strong');
    value.textContent = item.value;

    const label = document.createElement('span');
    label.textContent = item.label;

    stat.append(value, label);
    stats.append(stat);
  });

  summary.append(statusBadge, meta, stats);

  const layout = document.createElement('div');
  layout.className = 'document-layout';

  const editorCard = document.createElement('article');
  editorCard.className = 'overview-card';

  const editorHeader = document.createElement('div');
  editorHeader.className = 'document-card-header';

  const editorLabel = document.createElement('label');
  editorLabel.className = 'document-editor-label';
  editorLabel.textContent = 'Markdown editor';

  const editorHint = document.createElement('p');
  editorHint.className = 'document-helper-text';
  editorHint.textContent = 'Use the formatting buttons or write markdown directly. Save to a real `.md` file.';

  editorHeader.append(editorLabel, editorHint);

  const formattingTools = document.createElement('div');
  formattingTools.className = 'markdown-tools';

  const editor = document.createElement('textarea');
  editor.className = 'document-editor';
  editor.value = content;
  editor.placeholder = '# Untitled document\n\nStart writing your markdown here.';
  editor.addEventListener('input', () => {
    void window.desktop.documents.updateDraft(editor.value);
  });

  [
    {
      label: 'H1',
      run: () => {
        prefixMarkdownSelection(editor, '# ', 'Heading');
      },
    },
    {
      label: 'Bold',
      run: () => {
        wrapMarkdownSelection(editor, '**', '**', 'bold text');
      },
    },
    {
      label: 'Italic',
      run: () => {
        wrapMarkdownSelection(editor, '*', '*', 'emphasis');
      },
    },
    {
      label: 'List',
      run: () => {
        prefixMarkdownSelection(editor, '- ', 'List item');
      },
    },
    {
      label: 'Quote',
      run: () => {
        prefixMarkdownSelection(editor, '> ', 'Quoted text');
      },
    },
    {
      label: 'Code',
      run: () => {
        const inserted = insertCodeFence(editor.value, editor.selectionStart, editor.selectionEnd);
        updateDocumentEditorValue(editor, inserted.content, inserted.selectionStart, inserted.selectionEnd);
      },
    },
    {
      label: 'Link',
      run: () => {
        insertMarkdownLink(editor);
      },
    },
  ].forEach((tool) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'markdown-tool';
    button.textContent = tool.label;
    button.addEventListener('click', tool.run);
    formattingTools.append(button);
  });

  editorCard.append(editorHeader, formattingTools, editor);

  const sidebar = document.createElement('div');
  sidebar.className = 'document-sidebar';

  const previewCard = document.createElement('article');
  previewCard.className = 'overview-card';

  const previewTitle = document.createElement('h2');
  previewTitle.className = 'document-section-title';
  previewTitle.textContent = 'Preview';

  const preview = document.createElement('div');
  preview.className = 'document-preview';
  preview.innerHTML = renderMarkdownPreview(content);

  previewCard.append(previewTitle, preview);

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
  sidebar.append(previewCard, recentCard);
  layout.append(editorCard, sidebar);
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

function unmountMapsScreen() {
  mapsPlaygroundRenderVersion += 1;
  mapsPlaygroundModule?.unmountMapsPlayground();
}

async function mountMapsScreen(screen: HTMLElement) {
  const renderVersion = mapsPlaygroundRenderVersion;
  const mountPoint = screen.querySelector<HTMLElement>('.maps-screen-root');

  if (!mountPoint) {
    return;
  }

  mapsPlaygroundModule ??= await import('./maps-playground');

  if (renderVersion !== mapsPlaygroundRenderVersion || getCurrentRoute() !== 'maps' || !mountPoint.isConnected) {
    return;
  }

  mapsPlaygroundModule.mountMapsPlayground(mountPoint);
}

function renderApp() {
  const app = document.getElementById('app');
  if (!app) {
    return;
  }

  const route = getCurrentRoute();
  const documentEditorSnapshot = route === 'documents' ? captureDocumentEditorSnapshot() : null;
  unmountMapsScreen();
  app.innerHTML = '';
  app.append(createNavbar(route, appState.preferences.hotkeys.navigation));

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
    restoreDocumentEditorSnapshot(documentEditorSnapshot);
    return;
  }

  if (route === 'uploads') {
    app.append(createUploadScreen());
    return;
  }

  if (route === 'maps') {
    const screen = createMapsScreen();
    app.append(screen);
    void mountMapsScreen(screen);
    return;
  }

  app.append(createHomeScreen());
}

function handleKeyboardShortcuts(event: KeyboardEvent) {
  if (event.repeat) {
    return;
  }

  const accelerator = normalizeKeyboardEventAccelerator(event);

  if (!accelerator) {
    return;
  }

  const matchedRoute = (
    Object.entries(appState.preferences.hotkeys.navigation) as Array<[AppRoute, string]>
  ).find(([, routeAccelerator]) => routeAccelerator === accelerator)?.[0];

  if (!matchedRoute || matchedRoute === getCurrentRoute()) {
    return;
  }

  event.preventDefault();
  navigateToRoute(matchedRoute);
}

async function bootstrap() {
  const [preferences, documents, uploads, commands] = await Promise.all([
    window.desktop.preferences.getAll(),
    window.desktop.documents.getState(),
    window.desktop.uploads.getState(),
    window.desktop.commands.list(),
  ]);

  appState.commands = commands;
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
