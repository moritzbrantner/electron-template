import { getTranslations } from 'next-intl/server';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

import { authOptions } from '@/src/auth';
import { getTablePermissionViews } from '@/src/domain/data-entry/use-cases';

import { TableEntryForm } from './table-entry-form';

type DataEntryPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function DataEntryPage({ params }: DataEntryPageProps) {
  const { locale } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.role) {
    redirect(`/${locale}`);
  }

  const t = await getTranslations('DataEntryPage');
  const readableTables = getTablePermissionViews(session.user.role);

  return (
    <section className="mx-auto max-w-4xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">{t('description')}</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {readableTables.map((table) => (
          <article key={table.table} className="space-y-2">
            <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {t('permissions.read')}: {table.readRoles.join(', ')} · {t('permissions.write')}: {table.writeRoles.join(', ')}
            </p>
            {table.canWrite ? (
              <TableEntryForm
                table={table}
                labels={{
                  creating: t('form.creating'),
                  createRow: t('form.createRow', { table: table.label }),
                  fields: {
                    bio: t('form.fields.bio'),
                    locale: t('form.fields.locale'),
                    timezone: t('form.fields.timezone'),
                    email: t('form.fields.email'),
                    name: t('form.fields.name'),
                    role: t('form.fields.role'),
                    action: t('form.fields.action'),
                    outcome: t('form.fields.outcome'),
                    statusCode: t('form.fields.statusCode'),
                    metadataJson: t('form.fields.metadataJson'),
                    key: t('form.fields.key'),
                    count: t('form.fields.count'),
                    resetAt: t('form.fields.resetAt'),
                  },
                }}
              />
            ) : (
              <div className="rounded-lg border p-4 text-sm dark:border-zinc-800">{t('permissions.noWrite')}</div>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
