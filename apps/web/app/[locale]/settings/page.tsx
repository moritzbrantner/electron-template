import { getTranslations } from 'next-intl/server';
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authOptions } from '@/src/auth';

import { ProfileImageForm } from '../profile/profile-image-form';

type SettingsPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function SettingsPage({ params }: SettingsPageProps) {
  const { locale } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(`/${locale}`);
  }

  const t = await getTranslations('SettingsPage');

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-base font-semibold">{t('profilePictureTitle')}</h2>
          <p className="text-sm text-zinc-600 dark:text-zinc-300">{t('profilePictureDescription')}</p>
        </div>

        <ProfileImageForm
          currentImage={session.user.image ?? null}
          labels={{
            upload: t('form.upload'),
            uploading: t('form.uploading'),
            remove: t('form.remove'),
            chooseImage: t('form.chooseImage'),
            hint: t('form.hint'),
            success: t('form.success'),
            empty: t('form.empty'),
            alt: t('form.alt'),
          }}
        />
      </CardContent>
    </Card>
  );
}
