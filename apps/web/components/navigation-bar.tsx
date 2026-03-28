import { getTranslations } from 'next-intl/server';
import { getServerSession } from 'next-auth';
import { cookies } from 'next/headers';

import { Link } from '@/i18n/navigation';
import { isAdmin } from '@/lib/authorization';
import { THEME_COOKIE_NAME, isTheme } from '@/lib/theme';

import { authOptions } from '@/src/auth';

import { ProfileMenu } from '@/components/profile-menu';
import { AuthNavigation } from '@/components/auth-navigation';
import { LanguageSelector } from '@/components/language-selector';
import { ThemeToggle } from '@/components/theme-toggle';
import { buttonVariants } from '@/components/ui/button';

const baseNavLinks = [
  { href: '/', key: 'home' },
  { href: '/about', key: 'about' },
  { href: '/forms', key: 'forms' },
  { href: '/story', key: 'story' },
  { href: '/communication', key: 'communication' },
  { href: '/table', key: 'table' },
  { href: '/uploads', key: 'uploads' },
] as const;

type NavigationBarProps = {
  locale: string;
};

export async function NavigationBar({ locale }: NavigationBarProps) {
  const t = await getTranslations('NavigationBar');
  const session = await getServerSession(authOptions);
  const themeCookie = (await cookies()).get(THEME_COOKIE_NAME)?.value;
  const initialTheme = isTheme(themeCookie) ? themeCookie : 'light';

  const navLinks = [
    ...baseNavLinks,
    ...(session?.user?.id ? [{ href: '/data-entry', key: 'dataEntry' as const }] : []),
    ...(isAdmin(session?.user?.role) ? [{ href: '/admin', key: 'admin' as const }] : []),
  ];

  return (
    <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
      <nav className="mx-auto flex min-h-16 w-full max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          {t('brand')}
        </Link>

        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={buttonVariants({
                variant: 'ghost',
                size: 'sm',
              })}
            >
              {t(`links.${link.key}`)}
            </Link>
          ))}
          {session?.user?.id ? (
            <ProfileMenu
              locale={locale}
              profileHref="/profile"
              settingsHref="/settings"
              imageUrl={session.user.image ?? null}
              displayName={session.user.name ?? 'User'}
              labels={{
                profile: t('menu.profile'),
                settings: t('menu.settings'),
                logout: t('menu.logout'),
                openMenu: t('menu.openMenu'),
              }}
            />
          ) : (
            <AuthNavigation
              labels={{
                login: t('auth.login'),
                register: t('auth.register'),
              }}
            />
          )}
          <LanguageSelector />
          <ThemeToggle initialTheme={initialTheme} />
        </div>
      </nav>
    </header>
  );
}
