import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProfileFromSegment } from "../../profiles";
import { SiteNav } from "../../site-nav";
import styles from "./page.module.css";

type ProfilePageProps = {
  params: Promise<{
    profile: string;
  }>;
};

export async function generateMetadata({
  params,
}: ProfilePageProps): Promise<Metadata> {
  const { profile } = await params;
  const user = getProfileFromSegment(profile);

  if (!user) {
    return {
      title: "Profile not found",
    };
  }

  return {
    title: `@${user.username} · ${user.name}`,
    description: user.bio,
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { profile } = await params;
  const user = getProfileFromSegment(profile);

  if (!profile.startsWith("@") || !user) {
    notFound();
  }

  return (
    <div className={styles.page}>
      <SiteNav activePage="profile" />
      <main className={styles.main}>
        <section className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>User profile</p>
            <h1>{user.name}</h1>
            <p className={styles.handle}>@{user.username}</p>
          </div>
          <p className={styles.bio}>{user.bio}</p>
        </section>

        <section className={styles.grid}>
          <article className={styles.card}>
            <h2>Overview</h2>
            <dl className={styles.meta}>
              <div>
                <dt>Role</dt>
                <dd>{user.role}</dd>
              </div>
              <div>
                <dt>Location</dt>
                <dd>{user.location}</dd>
              </div>
            </dl>
            <p className={styles.about}>{user.about}</p>
          </article>

          <article className={styles.card}>
            <h2>Stats</h2>
            <div className={styles.stats}>
              <div>
                <strong>{user.stats.projects}</strong>
                <span>Projects</span>
              </div>
              <div>
                <strong>{user.stats.followers}</strong>
                <span>Followers</span>
              </div>
              <div>
                <strong>{user.stats.following}</strong>
                <span>Following</span>
              </div>
            </div>
          </article>

          <article className={`${styles.card} ${styles.fullWidth}`}>
            <h2>Focus areas</h2>
            <ul className={styles.interests}>
              {user.interests.map((interest) => (
                <li key={interest}>{interest}</li>
              ))}
            </ul>
          </article>
        </section>

        <Link href="/" className={styles.backLink}>
          Back home
        </Link>
      </main>
    </div>
  );
}
