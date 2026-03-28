'use client';

import Image from 'next/image';
import { signOut } from 'next-auth/react';
import { useState } from 'react';

import { Link } from '@/i18n/navigation';
import { buttonVariants } from '@/components/ui/button';

type ProfileMenuProps = {
  locale: string;
  profileHref: string;
  settingsHref: string;
  imageUrl: string | null;
  displayName: string;
  labels: {
    profile: string;
    settings: string;
    logout: string;
    openMenu: string;
  };
};

export function ProfileMenu({
  locale,
  profileHref,
  settingsHref,
  imageUrl,
  displayName,
  labels,
}: ProfileMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative"
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
        }
      }}
    >
      <button
        type="button"
        className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800"
        aria-label={labels.openMenu}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((current) => !current)}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={displayName}
            width={36}
            height={36}
            className="h-full w-full object-cover"
            unoptimized
          />
        ) : (
          <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-100">
            {displayName.charAt(0).toUpperCase() || 'U'}
          </span>
        )}
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-20 w-44 rounded-md border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <Link
            href={profileHref}
            onClick={() => setOpen(false)}
            className={buttonVariants({
              variant: 'ghost',
              size: 'sm',
              className: 'w-full justify-start',
            })}
          >
            {labels.profile}
          </Link>
          <Link
            href={settingsHref}
            onClick={() => setOpen(false)}
            className={buttonVariants({
              variant: 'ghost',
              size: 'sm',
              className: 'w-full justify-start',
            })}
          >
            {labels.settings}
          </Link>
          <button
            type="button"
            className={buttonVariants({
              variant: 'ghost',
              size: 'sm',
              className: 'w-full justify-start text-red-600 hover:text-red-600 dark:text-red-400 dark:hover:text-red-400',
            })}
            onClick={() => {
              void signOut({ callbackUrl: `/${locale}` });
            }}
          >
            {labels.logout}
          </button>
        </div>
      ) : null}
    </div>
  );
}
