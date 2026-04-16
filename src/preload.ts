import { contextBridge, ipcRenderer } from 'electron';

import { createCommandsBridge } from '@moritzbrantner/electron-commands/preload';
import { createDocumentsBridge } from '@moritzbrantner/electron-documents/preload';
import { createPreferencesBridge } from '@moritzbrantner/electron-preferences/preload';

import type { DesktopPreferences } from './platform/shared/preferences';
import { createUploadsBridge } from './platform/preload/uploads';

contextBridge.exposeInMainWorld('desktop', {
  commands: createCommandsBridge(ipcRenderer),
  documents: createDocumentsBridge(ipcRenderer),
  preferences: createPreferencesBridge<DesktopPreferences>(ipcRenderer),
  uploads: createUploadsBridge(ipcRenderer),
});
