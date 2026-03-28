import type { Metadata } from 'next';
import { cookies } from 'next/headers';

import { THEME_COOKIE_NAME, isTheme } from '@/lib/theme';

import './globals.css';

export const metadata: Metadata = {
  title: 'Next Template',
  description: 'A simple Next.js template with localized routing via next-intl.',
};

const themeScript = `
(() => {
  const cookieTheme = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith('theme='))
    ?.split('=')[1];
  const storedTheme = window.localStorage.getItem('theme');
  const theme = cookieTheme === 'light' || cookieTheme === 'dark'
    ? cookieTheme
    : (storedTheme === 'light' || storedTheme === 'dark'
      ? storedTheme
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));

  document.documentElement.classList.remove('light', 'dark');
  document.documentElement.classList.add(theme);
})();
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeCookie = (await cookies()).get(THEME_COOKIE_NAME)?.value;
  const initialTheme = isTheme(themeCookie) ? themeCookie : 'light';

  return (
    <html lang="en" className={initialTheme} suppressHydrationWarning>
      <body className="antialiased">
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        {children}
      </body>
    </html>
  );
}
