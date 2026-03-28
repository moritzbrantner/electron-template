import { SiteNav } from "../site-nav";
import styles from "./page.module.css";

const faces = [
  styles.faceFront,
  styles.faceBack,
  styles.faceRight,
  styles.faceLeft,
  styles.faceTop,
  styles.faceBottom,
];

export default function ThreePage() {
  return (
    <div className={styles.page}>
      <SiteNav activePage="three" />
      <main className={styles.main}>
        <div className={styles.header}>
          <p className={styles.eyebrow}>Three dimensional</p>
          <h1>Three.js</h1>
          <p className={styles.description}>
            A dedicated destination for 3D experiments, motion studies, and future scene work.
          </p>
        </div>

        <section className={styles.showcase}>
          <div className={styles.orbit} />
          <div className={styles.cube}>
            {faces.map((faceClassName) => (
              <span key={faceClassName} className={`${styles.face} ${faceClassName}`} />
            ))}
          </div>
        </section>

        <section className={styles.notes}>
          <div className={styles.note}>
            <h2>Why this page exists</h2>
            <p>
              Users now have a clear navigation target for everything related to Three.js inside
              the app.
            </p>
          </div>
          <div className={styles.note}>
            <h2>What it can host next</h2>
            <p>Model viewers, lighting studies, post-processing tests, or interactive demos.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
