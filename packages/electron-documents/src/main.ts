import { promises as fs } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import type { BrowserWindow, IpcMain, WebContents } from 'electron';

import type { JsonStore } from '@moritzbrantner/electron-json-store/main';

import { documentsChannels, type DocumentState, type RecentDocument } from './shared.ts';

const require = createRequire(import.meta.url);

function cloneValue<TValue>(value: TValue): TValue {
  return structuredClone(value);
}

interface StoredRecentDocumentsState {
  items: RecentDocument[];
  lastOpenedPath: string | null;
}

interface LoadedDocument {
  content: string;
}

export interface DocumentSerializer {
  deserialize(raw: string, filePath: string): LoadedDocument;
  extension: string;
  name: string;
  serialize(value: LoadedDocument, filePath?: string): string;
}

export interface DocumentDialogAdapter {
  showOpenDialog(browserWindow: BrowserWindow): Promise<{
    canceled: boolean;
    filePaths: string[];
  }>;
  showSaveDialog(
    browserWindow: BrowserWindow,
    currentFilePath: string | null,
    suggestedFileName: string,
  ): Promise<{
    canceled: boolean;
    filePath?: string;
  }>;
  showUnsavedChangesDialog(browserWindow: BrowserWindow): Promise<'cancel' | 'discard' | 'save'>;
}

export interface DocumentsServiceOptions {
  defaultContent?: string;
  dialogAdapter: DocumentDialogAdapter;
  getBroadcastTargets: (browserWindow: BrowserWindow | null) => WebContents[];
  initialFileName?: string;
  recentStore: JsonStore<StoredRecentDocumentsState>;
  serializer: DocumentSerializer;
}

interface InternalDocumentState {
  content: string;
  filePath: string | null;
  lastSavedAt: string | null;
  lastSavedContent: string;
  statusMessage: string;
}

function deriveDisplayName(filePathValue: string | null) {
  if (!filePathValue) {
    return 'Untitled';
  }

  return path.basename(filePathValue);
}

export function createDocumentsService(options: DocumentsServiceOptions) {
  const defaultContent = options.defaultContent ?? '';
  const initialFileName = options.initialFileName ?? `Untitled.${options.serializer.extension}`;
  const sessionState = new Map<string, InternalDocumentState>();

  function createInitialState(): InternalDocumentState {
    return {
      content: defaultContent,
      filePath: null,
      lastSavedAt: null,
      lastSavedContent: defaultContent,
      statusMessage: 'Ready',
    };
  }

  function getSessionKey(browserWindow: BrowserWindow | null) {
    return typeof browserWindow?.id === 'number' ? `window:${browserWindow.id}` : 'window:default';
  }

  function getInternalState(browserWindow: BrowserWindow | null) {
    const sessionKey = getSessionKey(browserWindow);
    const existingState = sessionState.get(sessionKey);

    if (existingState) {
      return existingState;
    }

    const nextState = createInitialState();
    sessionState.set(sessionKey, nextState);
    return nextState;
  }

  function setInternalState(browserWindow: BrowserWindow | null, nextState: InternalDocumentState) {
    sessionState.set(getSessionKey(browserWindow), nextState);
    return nextState;
  }

  async function buildPublicState(browserWindow: BrowserWindow | null): Promise<DocumentState> {
    const state = getInternalState(browserWindow);
    const recentDocuments = (await options.recentStore.load()).items;

    return {
      content: state.content,
      displayName: deriveDisplayName(state.filePath),
      filePath: state.filePath,
      isDirty: state.content !== state.lastSavedContent,
      lastSavedAt: state.lastSavedAt,
      recentDocuments: cloneValue(recentDocuments),
      statusMessage: state.statusMessage,
    };
  }

  async function broadcast(browserWindow: BrowserWindow | null) {
    const publicState = await buildPublicState(browserWindow);

    options.getBroadcastTargets(browserWindow).forEach((target) => {
      if (!target.isDestroyed()) {
        target.send(documentsChannels.stateDidChange, cloneValue(publicState));
      }
    });
  }

  async function rememberRecent(filePathValue: string) {
    const timestamp = new Date().toISOString();

    await options.recentStore.update((current) => {
      const nextItem: RecentDocument = {
        filePath: filePathValue,
        lastOpenedAt: timestamp,
        name: path.basename(filePathValue),
      };
      const remainingItems = current.items.filter((item) => item.filePath !== filePathValue);

      return {
        items: [nextItem].concat(remainingItems).slice(0, 8),
        lastOpenedPath: filePathValue,
      };
    });
  }

  async function persistToPath(filePathValue: string, browserWindow: BrowserWindow | null) {
    const state = getInternalState(browserWindow);
    const serialized = options.serializer.serialize({ content: state.content }, filePathValue);

    await fs.mkdir(path.dirname(filePathValue), { recursive: true });
    await fs.writeFile(filePathValue, serialized, 'utf8');

    setInternalState(browserWindow, {
      content: state.content,
      filePath: filePathValue,
      lastSavedAt: new Date().toISOString(),
      lastSavedContent: state.content,
      statusMessage: `Saved ${path.basename(filePathValue)}`,
    });

    await rememberRecent(filePathValue);
    await broadcast(browserWindow);
  }

  async function maybeConfirmLosingChanges(browserWindow: BrowserWindow | null) {
    const state = getInternalState(browserWindow);

    if (!browserWindow || state.content === state.lastSavedContent) {
      return true;
    }

    const decision = await options.dialogAdapter.showUnsavedChangesDialog(browserWindow);

    if (decision === 'cancel') {
      setInternalState(browserWindow, {
        ...state,
        statusMessage: 'Canceled',
      });
      await broadcast(browserWindow);
      return false;
    }

    if (decision === 'save') {
      await save(browserWindow);
      const currentState = getInternalState(browserWindow);
      return currentState.content === currentState.lastSavedContent;
    }

    return true;
  }

  async function loadFile(filePathValue: string, browserWindow: BrowserWindow | null) {
    const raw = await fs.readFile(filePathValue, 'utf8');
    const loaded = options.serializer.deserialize(raw, filePathValue);
    const metadata = await fs.stat(filePathValue);

    setInternalState(browserWindow, {
      content: loaded.content,
      filePath: filePathValue,
      lastSavedAt: metadata.mtime.toISOString(),
      lastSavedContent: loaded.content,
      statusMessage: `Opened ${path.basename(filePathValue)}`,
    });

    await rememberRecent(filePathValue);
    await broadcast(browserWindow);
  }

  async function getState(browserWindow: BrowserWindow | null = null) {
    return buildPublicState(browserWindow);
  }

  async function listRecent() {
    return (await buildPublicState(null)).recentDocuments;
  }

  async function newDocument(browserWindow: BrowserWindow | null) {
    const canContinue = await maybeConfirmLosingChanges(browserWindow);

    if (!canContinue) {
      return;
    }

    setInternalState(browserWindow, {
      content: defaultContent,
      filePath: null,
      lastSavedAt: null,
      lastSavedContent: defaultContent,
      statusMessage: 'Started a new document',
    });
    await broadcast(browserWindow);
  }

  async function open(browserWindow: BrowserWindow | null) {
    if (!browserWindow) {
      return;
    }

    const canContinue = await maybeConfirmLosingChanges(browserWindow);

    if (!canContinue) {
      return;
    }

    const result = await options.dialogAdapter.showOpenDialog(browserWindow);

    if (result.canceled || result.filePaths.length === 0) {
      const state = getInternalState(browserWindow);
      setInternalState(browserWindow, {
        ...state,
        statusMessage: 'Open canceled',
      });
      await broadcast(browserWindow);
      return;
    }

    await loadFile(result.filePaths[0], browserWindow);
  }

  async function openRecent(filePathValue: string, browserWindow: BrowserWindow | null) {
    const canContinue = await maybeConfirmLosingChanges(browserWindow);

    if (!canContinue) {
      return;
    }

    await loadFile(filePathValue, browserWindow);
  }

  async function save(browserWindow: BrowserWindow | null) {
    const state = getInternalState(browserWindow);

    if (state.filePath) {
      await persistToPath(state.filePath, browserWindow);
      return;
    }

    await saveAs(browserWindow);
  }

  async function saveAs(browserWindow: BrowserWindow | null) {
    if (!browserWindow) {
      return;
    }

    const state = getInternalState(browserWindow);
    const result = await options.dialogAdapter.showSaveDialog(
      browserWindow,
      state.filePath,
      initialFileName,
    );

    if (result.canceled || !result.filePath) {
      const state = getInternalState(browserWindow);
      setInternalState(browserWindow, {
        ...state,
        statusMessage: 'Save canceled',
      });
      await broadcast(browserWindow);
      return;
    }

    await persistToPath(result.filePath, browserWindow);
  }

  async function updateDraft(content: string, browserWindow: BrowserWindow | null = null) {
    const state = getInternalState(browserWindow);

    setInternalState(browserWindow, {
      ...state,
      content,
      statusMessage:
        content === state.lastSavedContent ? 'All changes saved' : 'Unsaved changes',
    });
    await broadcast(browserWindow);
  }

  async function confirmBeforeClose(browserWindow: BrowserWindow) {
    return maybeConfirmLosingChanges(browserWindow);
  }

  async function reopenLastDocument(browserWindow: BrowserWindow | null) {
    const recentState = await options.recentStore.load();

    if (!recentState.lastOpenedPath) {
      return false;
    }

    try {
      await openRecent(recentState.lastOpenedPath, browserWindow);
      return true;
    } catch (_error) {
      return false;
    }
  }

  function installIpc(ipcMain: IpcMain) {
    const { BrowserWindow: ElectronBrowserWindow } = require('electron') as typeof import('electron');

    ipcMain.handle(documentsChannels.getState, async (event) =>
      getState(ElectronBrowserWindow.fromWebContents(event.sender)),
    );
    ipcMain.handle(documentsChannels.listRecent, async () => listRecent());
    ipcMain.handle(documentsChannels.newDocument, async (event) => {
      await newDocument(ElectronBrowserWindow.fromWebContents(event.sender));
    });
    ipcMain.handle(documentsChannels.open, async (event) => {
      await open(ElectronBrowserWindow.fromWebContents(event.sender));
    });
    ipcMain.handle(documentsChannels.openRecent, async (event, filePathValue: string) => {
      await openRecent(filePathValue, ElectronBrowserWindow.fromWebContents(event.sender));
    });
    ipcMain.handle(documentsChannels.save, async (event) => {
      await save(ElectronBrowserWindow.fromWebContents(event.sender));
    });
    ipcMain.handle(documentsChannels.saveAs, async (event) => {
      await saveAs(ElectronBrowserWindow.fromWebContents(event.sender));
    });
    ipcMain.handle(documentsChannels.updateDraft, async (_event, content: string) => {
      await updateDraft(content, ElectronBrowserWindow.fromWebContents(_event.sender));
    });

    return () => {
      ipcMain.removeHandler(documentsChannels.getState);
      ipcMain.removeHandler(documentsChannels.listRecent);
      ipcMain.removeHandler(documentsChannels.newDocument);
      ipcMain.removeHandler(documentsChannels.open);
      ipcMain.removeHandler(documentsChannels.openRecent);
      ipcMain.removeHandler(documentsChannels.save);
      ipcMain.removeHandler(documentsChannels.saveAs);
      ipcMain.removeHandler(documentsChannels.updateDraft);
    };
  }

  return {
    confirmBeforeClose,
    getState,
    installIpc,
    listRecent,
    newDocument,
    open,
    openRecent,
    reopenLastDocument,
    save,
    saveAs,
    updateDraft,
  };
}
