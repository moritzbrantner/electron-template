import Link from "next/link";
import { currentUser } from "./profiles";
import styles from "./site-nav.module.css";

type NavPage =
  | "home"
  | "communication"
  | "settings"
  | "three"
  | "reactHookForm"
  | "uploads"
  | "profile";

type SiteNavProps = {
  activePage: NavPage;
};

export function SiteNav({ activePage }: SiteNavProps) {
  const librariesOpen =
    activePage === "three" ||
    activePage === "reactHookForm" ||
    activePage === "uploads";
  const communicationOpen = activePage === "communication";
  const personalOpen = activePage === "settings" || activePage === "profile";

  return (
    <nav className={styles.nav} aria-label="Primary">
      <Link
        href="/"
        className={`${styles.trigger} ${activePage === "home" ? styles.active : ""}`}
      >
        Home
      </Link>

      <details className={styles.menu} open={librariesOpen}>
        <summary
          className={`${styles.trigger} ${librariesOpen ? styles.active : ""}`}
        >
          Libraries
        </summary>
        <div className={styles.panel}>
          <Link
            href="/react-hook-form"
            className={`${styles.menuLink} ${activePage === "reactHookForm" ? styles.menuLinkActive : ""}`}
          >
            Forms
          </Link>
          <Link
            href="/three"
            className={`${styles.menuLink} ${activePage === "three" ? styles.menuLinkActive : ""}`}
          >
            Three.js
          </Link>
          <Link
            href="/uploads"
            className={`${styles.menuLink} ${activePage === "uploads" ? styles.menuLinkActive : ""}`}
          >
            Uploads
          </Link>
        </div>
      </details>

      <details className={styles.menu} open={communicationOpen}>
        <summary
          className={`${styles.trigger} ${communicationOpen ? styles.active : ""}`}
        >
          Communication
        </summary>
        <div className={styles.panel}>
          <Link
            href="/communication#websockets"
            className={`${styles.menuLink} ${activePage === "communication" ? styles.menuLinkActive : ""}`}
          >
            Websockets
          </Link>
          <Link
            href="/communication#crdts"
            className={`${styles.menuLink} ${activePage === "communication" ? styles.menuLinkActive : ""}`}
          >
            CRDTs
          </Link>
        </div>
      </details>

      <details className={styles.menu} open={personalOpen}>
        <summary
          className={`${styles.trigger} ${personalOpen ? styles.active : ""}`}
        >
          Personal
        </summary>
        <div className={styles.panel}>
          <Link
            href={`/profile/@${currentUser.username}`}
            className={`${styles.menuLink} ${activePage === "profile" ? styles.menuLinkActive : ""}`}
          >
            My profile
          </Link>
          <Link
            href="/settings"
            className={`${styles.menuLink} ${activePage === "settings" ? styles.menuLinkActive : ""}`}
          >
            Settings
          </Link>
        </div>
      </details>
    </nav>
  );
}
