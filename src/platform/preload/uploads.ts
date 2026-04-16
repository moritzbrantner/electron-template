import type { IpcRenderer } from 'electron';

import type { UploadsBridge } from '../shared/uploads.ts';
import { uploadsChannels } from '../shared/uploads.ts';

export function createUploadsBridge(ipcRenderer: IpcRenderer): UploadsBridge {
  return {
    async addDroppedFiles(filePaths: string[]) {
      await ipcRenderer.invoke(uploadsChannels.addDroppedFiles, filePaths);
    },
    async cancelUpload(uploadId: string) {
      await ipcRenderer.invoke(uploadsChannels.cancelUpload, uploadId);
    },
    async clearCompleted() {
      await ipcRenderer.invoke(uploadsChannels.clearCompleted);
    },
    async getState() {
      return ipcRenderer.invoke(uploadsChannels.getState);
    },
    async pickFiles() {
      await ipcRenderer.invoke(uploadsChannels.pickFiles);
    },
    async retryUpload(uploadId: string) {
      await ipcRenderer.invoke(uploadsChannels.retryUpload, uploadId);
    },
    async startAll() {
      await ipcRenderer.invoke(uploadsChannels.startAll);
    },
    async startUpload(uploadId: string) {
      await ipcRenderer.invoke(uploadsChannels.startUpload, uploadId);
    },
    subscribe(listener) {
      const wrappedListener = (_event: unknown, state: Parameters<typeof listener>[0]) => {
        listener(state);
      };

      ipcRenderer.on(uploadsChannels.stateDidChange, wrappedListener);

      return () => {
        ipcRenderer.removeListener(uploadsChannels.stateDidChange, wrappedListener);
      };
    },
  };
}
