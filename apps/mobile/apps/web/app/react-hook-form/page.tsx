import { SiteNav } from "../site-nav";
import styles from "./page.module.css";

const overviewItems = [
  {
    title: "useForm",
    description:
      "Creates the form API, default values, validation mode, and the state object everything else reads from.",
  },
  {
    title: "register",
    description:
      "Connects native inputs to the form and attaches rules such as required validation without extra wrappers.",
  },
  {
    title: "Controller",
    description:
      "Bridges controlled UI components into the same form state when a field cannot be registered directly.",
  },
  {
    title: "reset",
    description:
      "Restores defaults, clears errors, and can optionally keep parts of the current state when needed.",
  },
];

const interactionRows = [
  {
    action: "Initial render",
    required: "Rules are registered but untouched fields usually do not show errors yet.",
    dirty: "`isDirty` is false because current values still match defaults.",
    validity: "`isValid` depends on the configured validation mode.",
    reset: "`reset()` returns to this baseline.",
  },
  {
    action: "User enters a valid value",
    required: "The required rule is satisfied.",
    dirty: "Dirty state turns true because the value changed from its default.",
    validity: "Validity flips true once validation runs and no other errors remain.",
    reset: "`reset()` puts the original value back and clears dirty state.",
  },
  {
    action: "User clears a required field",
    required: "The field now fails the required rule.",
    dirty: "The field stays dirty until it matches the default again.",
    validity: "`isValid` becomes false after validation runs.",
    reset: "`reset()` clears the error when the defaults are valid.",
  },
  {
    action: "reset(newValues)",
    required: "Rules stay attached to the field definitions.",
    dirty: "Dirty tracking is re-based against the new defaults.",
    validity: "Validity is recalculated from the new reset state.",
    reset: "This becomes the new clean snapshot for the form.",
  },
];

export default function ReactHookFormPage() {
  return (
    <div className={styles.page}>
      <SiteNav activePage="reactHookForm" />
      <main className={styles.main}>
        <div className={styles.header}>
          <p className={styles.eyebrow}>Form state overview</p>
          <h1>React Hook Form</h1>
          <p className={styles.description}>
            A quick reference for the main building blocks of React Hook Form and how they affect
            required validation, dirty tracking, validity, and reset behavior.
          </p>
        </div>

        <section className={styles.grid}>
          {overviewItems.map((item) => (
            <article key={item.title} className={styles.card}>
              <h2>{item.title}</h2>
              <p>{item.description}</p>
            </article>
          ))}
        </section>

        <section className={styles.tableCard}>
          <h2>State interactions</h2>
          <div className={styles.table}>
            {interactionRows.map((row) => (
              <article key={row.action} className={styles.row}>
                <h3>{row.action}</h3>
                <p><strong>Required:</strong> {row.required}</p>
                <p><strong>Dirty:</strong> {row.dirty}</p>
                <p><strong>Validity:</strong> {row.validity}</p>
                <p><strong>Reset:</strong> {row.reset}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
