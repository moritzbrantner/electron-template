'use client';

import { Link } from '@/i18n/navigation';

import { buttonVariants } from '@/components/ui/button';

type AuthNavigationProps = {
  labels: {
    login: string;
    register: string;
  };
};

export function AuthNavigation({ labels }: AuthNavigationProps) {
  return (
    <>
      <Link href="/login" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
        {labels.login}
      </Link>
      <Link href="/register" className={buttonVariants({ size: 'sm' })}>
        {labels.register}
      </Link>
    </>
  );
}
