import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';

import { buttonVariants } from '@/components/ui/button';

export default async function Home() {
  const t = await getTranslations('HomePage');

  return (
    <section className="space-y-8">
      <div className="rounded-[2rem] border border-zinc-200 bg-[radial-gradient(circle_at_top_left,#fde68a,transparent_26%),radial-gradient(circle_at_right,#bfdbfe,transparent_24%),linear-gradient(145deg,#ffffff,#f4f4f5)] p-8 dark:border-zinc-800 dark:bg-[radial-gradient(circle_at_top_left,#854d0e,transparent_26%),radial-gradient(circle_at_right,#1d4ed8,transparent_24%),linear-gradient(145deg,#09090b,#18181b)]">
        <div className="space-y-4">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-zinc-500 dark:text-zinc-400">
            {t('eyebrow')}
          </p>
          <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            {t('title')}
          </h1>
          <p className="max-w-3xl text-base leading-7 text-zinc-700 dark:text-zinc-300">{t('description')}</p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/forms" className={buttonVariants({ variant: 'default' })}>
            {t('visitForm')}
          </Link>
          <Link href="/story" className={buttonVariants({ variant: 'ghost' })}>
            {t('visitStory')}
          </Link>
          <Link href="/communication" className={buttonVariants({ variant: 'ghost' })}>
            {t('visitCommunication')}
          </Link>
          <Link href="/uploads" className={buttonVariants({ variant: 'ghost' })}>
            {t('visitUploads')}
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {(['foundation', 'interaction', 'delivery'] as const).map((section) => (
          <article
            key={section}
            className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
          >
            <h2 className="text-xl font-semibold text-zinc-950 dark:text-zinc-50">{t(`sections.${section}.title`)}</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              {t(`sections.${section}.description`)}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
