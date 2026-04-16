export const uploadsChannels = {
  addDroppedFiles: 'moritzbrantner:uploads:add-dropped-files',
  cancelUpload: 'moritzbrantner:uploads:cancel',
  clearCompleted: 'moritzbrantner:uploads:clear-completed',
  getState: 'moritzbrantner:uploads:get-state',
  pickFiles: 'moritzbrantner:uploads:pick-files',
  startAll: 'moritzbrantner:uploads:start-all',
  startUpload: 'moritzbrantner:uploads:start-upload',
  retryUpload: 'moritzbrantner:uploads:retry',
  stateDidChange: 'moritzbrantner:uploads:state-did-change',
} as const;

export type UploadStatus = 'canceled' | 'completed' | 'failed' | 'queued' | 'uploading';

export interface UploadItem {
  addedAt: string;
  attempts: number;
  completedAt: string | null;
  error: string | null;
  filePath: string;
  id: string;
  name: string;
  progress: number;
  size: number;
  status: UploadStatus;
  updatedAt: string;
}

export interface UploadsState {
  items: UploadItem[];
  statusMessage: string;
}

export interface UploadsBridge {
  addDroppedFiles(filePaths: string[]): Promise<void>;
  cancelUpload(uploadId: string): Promise<void>;
  clearCompleted(): Promise<void>;
  getState(): Promise<UploadsState>;
  pickFiles(): Promise<void>;
  retryUpload(uploadId: string): Promise<void>;
  startAll(): Promise<void>;
  startUpload(uploadId: string): Promise<void>;
  subscribe(listener: (state: UploadsState) => void): () => void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object');
}

export function isUploadItem(value: unknown): value is UploadItem {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.id === 'string' &&
    typeof value.filePath === 'string' &&
    typeof value.name === 'string' &&
    typeof value.size === 'number' &&
    typeof value.progress === 'number' &&
    typeof value.attempts === 'number' &&
    typeof value.addedAt === 'string' &&
    typeof value.updatedAt === 'string' &&
    (value.completedAt === null || typeof value.completedAt === 'string') &&
    (value.error === null || typeof value.error === 'string') &&
    (value.status === 'queued' ||
      value.status === 'uploading' ||
      value.status === 'completed' ||
      value.status === 'failed' ||
      value.status === 'canceled')
  );
}

export function isUploadsState(value: unknown): value is UploadsState {
  return (
    isRecord(value) &&
    Array.isArray(value.items) &&
    value.items.every((item) => isUploadItem(item)) &&
    typeof value.statusMessage === 'string'
  );
}

export const defaultUploadsState: UploadsState = {
  items: [],
  statusMessage: 'No uploads queued.',
};
