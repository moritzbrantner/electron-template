import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { NavigationBar } from '@/components/navigation-bar';
import { routing } from '@/i18n/routing';

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <NavigationBar locale={locale} />
      <main className="mx-auto min-h-[calc(100vh-4rem)] w-full max-w-5xl px-4 py-10">{children}</main>
    </NextIntlClientProvider>
  );
}
