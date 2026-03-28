"use client";

import { useRef, useState, type DragEvent } from "react";
import {
  formatFileSize,
  getAllUploadGuides,
  getUploadGuide,
  getUploadManagementHint,
  inferUploadKind,
  uploadLifecycle,
  uploadTypeGroups,
} from "@repo/upload-playbook";
import { SiteNav } from "../site-nav";
import styles from "./page.module.css";

type UploadQueueItem = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeInBytes: number;
  kind: string;
  source: string;
  managementLabel: string;
  managementDetail: string;
};

function buildQueueItems(fileList: FileList | File[], source: string): UploadQueueItem[] {
  return Array.from(fileList).map((file) => {
    const kind = inferUploadKind(file.name, file.type);
    const management = getUploadManagementHint(kind, file.size);

    return {
      id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
      fileName: file.name,
      mimeType: file.type || "unknown",
      sizeInBytes: file.size,
      kind,
      source,
      managementLabel: management.label,
      managementDetail: management.detail,
    };
  });
}

export default function UploadsPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const uploadGuide = getUploadGuide("web");

  function appendFiles(fileList: FileList | null, source: string) {
    if (!fileList?.length) {
      return;
    }

    setQueue((currentQueue) => [...buildQueueItems(fileList, source), ...currentQueue]);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    appendFiles(event.dataTransfer.files, "drag and drop");
  }

  return (
    <div className={styles.page}>
      <SiteNav activePage="uploads" />
      <main className={styles.main}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Cross-app upload reference</p>
          <h1>Uploads</h1>
          <p className={styles.description}>
            This web route uses the browser file input and drag-and-drop to show how files are
            normalized into one queue, then compared with desktop and mobile handling.
          </p>
        </header>

        <section className={styles.heroCard}>
          <div>
            <p className={styles.cardEyebrow}>{uploadGuide.title}</p>
            <h2>How the web app should manage uploads</h2>
          </div>
          <div className={styles.copyStack}>
            <p>{uploadGuide.picker}</p>
            <p>{uploadGuide.queue}</p>
            <p>{uploadGuide.storage}</p>
          </div>
        </section>

        <section className={styles.surfaceGrid}>
          <label
            className={styles.dropzone}
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
          >
            <input
              ref={inputRef}
              type="file"
              multiple
              className={styles.hiddenInput}
              accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.txt,.md,.csv,.json,.zip"
              onChange={(event) => appendFiles(event.target.files, "file input")}
            />
            <span className={styles.dropzoneEyebrow}>Web intake</span>
            <strong>Drop files here or open the browser picker</strong>
            <p>
              The queue below classifies images, documents, media, and data files the same way
              regardless of how the browser delivered them.
            </p>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => inputRef.current?.click()}
            >
              Choose files
            </button>
          </label>

          <article className={styles.queueCard}>
            <div className={styles.queueHeader}>
              <div>
                <p className={styles.cardEyebrow}>Normalized queue</p>
                <h2>Current upload items</h2>
              </div>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setQueue([])}
                disabled={queue.length === 0}
              >
                Clear queue
              </button>
            </div>

            {queue.length === 0 ? (
              <p className={styles.emptyState}>
                No files yet. Add a few files to see how the web app classifies and manages them.
              </p>
            ) : (
              <div className={styles.queueList}>
                {queue.map((item) => (
                  <article key={item.id} className={styles.queueItem}>
                    <div className={styles.queueMeta}>
                      <div>
                        <h3>{item.fileName}</h3>
                        <p>
                          {item.kind} · {formatFileSize(item.sizeInBytes)} · {item.source}
                        </p>
                      </div>
                      <span className={styles.badge}>{item.managementLabel}</span>
                    </div>
                    <p className={styles.queueDetail}>{item.managementDetail}</p>
                    <p className={styles.queueType}>MIME: {item.mimeType}</p>
                  </article>
                ))}
              </div>
            )}
          </article>
        </section>

        <section className={styles.guideGrid}>
          {getAllUploadGuides().map((guide) => (
            <article
              key={guide.platform}
              className={`${styles.platformCard} ${
                guide.platform === "web" ? styles.platformCardActive : ""
              }`}
            >
              <p className={styles.cardEyebrow}>{guide.platform}</p>
              <h2>{guide.title}</h2>
              <p>{guide.picker}</p>
              <p>{guide.queue}</p>
              <ul className={styles.noteList}>
                {guide.notes.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        <section className={styles.bottomGrid}>
          <article className={styles.infoCard}>
            <p className={styles.cardEyebrow}>Accepted groups</p>
            <div className={styles.infoStack}>
              {uploadTypeGroups.map((group) => (
                <div key={group.title} className={styles.infoRow}>
                  <h2>{group.title}</h2>
                  <p>{group.examples}</p>
                  <p>{group.handling}</p>
                </div>
              ))}
            </div>
          </article>

          <article className={styles.infoCard}>
            <p className={styles.cardEyebrow}>Lifecycle</p>
            <div className={styles.infoStack}>
              {uploadLifecycle.map((step, index) => (
                <div key={step.title} className={styles.infoRow}>
                  <h2>
                    {index + 1}. {step.title}
                  </h2>
                  <p>{step.detail}</p>
                </div>
              ))}
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}
