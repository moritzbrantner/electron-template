import Link from "next/link";
import { SiteNav } from "../site-nav";
import { ThemeToggle } from "../theme-toggle";
import styles from "./page.module.css";

export default function SettingsPage() {
  return (
    <div className={styles.page}>
      <SiteNav activePage="settings" />
      <main className={styles.main}>
        <div className={styles.header}>
          <p className={styles.eyebrow}>Application settings</p>
          <h1>Settings</h1>
          <p className={styles.description}>
            Use this page to adjust how the web app looks and behaves.
          </p>
        </div>

        <section className={styles.card}>
          <div className={styles.cardCopy}>
            <h2>Appearance</h2>
            <p>Your theme preference is saved in this browser.</p>
          </div>
          <ThemeToggle />
        </section>

        <Link href="/" className={styles.backLink}>
          Back home
        </Link>
      </main>
    </div>
  );
}
