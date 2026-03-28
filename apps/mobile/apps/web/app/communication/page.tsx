import { SiteNav } from "../site-nav";
import styles from "./page.module.css";

const communicationSections = [
  {
    id: "websockets",
    title: "Websockets",
    summary:
      "Websockets keep one long-lived connection open so clients and servers can exchange low-latency events without repeated request setup.",
    bullets: [
      "Useful for presence, chat, collaborative cursors, and streaming updates.",
      "The app usually needs a connection manager, auth refresh logic, heartbeats, and reconnection state.",
      "Message payloads should stay small and event-driven so the UI can merge updates incrementally.",
    ],
  },
  {
    id: "crdts",
    title: "CRDTs",
    summary:
      "CRDTs let multiple clients edit shared state concurrently and still converge on the same result without central lock-step coordination.",
    bullets: [
      "Useful when collaboration must keep working during offline periods or unstable connectivity.",
      "The app usually stores operation logs or document updates locally, then syncs and merges them later.",
      "Conflict resolution moves into the data structure, which reduces manual merge logic in the UI layer.",
    ],
  },
];

export default function CommunicationPage() {
  return (
    <div className={styles.page}>
      <SiteNav activePage="communication" />
      <main className={styles.main}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>Communication category</p>
          <h1>Realtime communication</h1>
          <p className={styles.description}>
            This category groups the collaboration primitives that are most relevant when multiple
            clients need to share state in near real time.
          </p>
        </header>

        <section className={styles.introCard}>
          <h2>When to look here</h2>
          <p>
            Use this page when you need a quick reminder of how socket transport differs from
            conflict-free shared state. Websockets move messages fast. CRDTs keep replicas in sync
            even when edits happen concurrently.
          </p>
        </section>

        <nav className={styles.sectionNav} aria-label="Communication sections">
          <a href="#websockets" className={styles.sectionLink}>
            Websockets
          </a>
          <a href="#crdts" className={styles.sectionLink}>
            CRDTs
          </a>
        </nav>

        <section className={styles.sectionGrid}>
          {communicationSections.map((section) => (
            <article key={section.id} id={section.id} className={styles.sectionCard}>
              <p className={styles.sectionEyebrow}>Communication topic</p>
              <h2>{section.title}</h2>
              <p className={styles.summary}>{section.summary}</p>
              <ul className={styles.list}>
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
