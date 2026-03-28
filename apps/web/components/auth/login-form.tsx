'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Link, useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type LoginFormValues = {
  email: string;
  password: string;
};

type LoginFormProps = {
  locale: string;
  labels: {
    email: string;
    password: string;
    submit: string;
    submitting: string;
    invalidCredentials: string;
    requiredEmail: string;
    invalidEmail: string;
    requiredPassword: string;
    registerPrompt: string;
    registerCta: string;
  };
};

export function LoginForm({ locale, labels }: LoginFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormValues>({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setPending(true);

    const result = await signIn('credentials', {
      redirect: false,
      email: values.email,
      password: values.password,
      callbackUrl: `/${locale}/profile`,
    });

    if (!result || result.error) {
      setError('root', {
        type: 'server',
        message: labels.invalidCredentials,
      });
      setPending(false);
      return;
    }

    router.push('/profile');
    router.refresh();
  });

  return (
    <form className="space-y-5" onSubmit={onSubmit} noValidate>
      <div className="space-y-2">
        <Label htmlFor="email">{labels.email}</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          aria-invalid={errors.email ? 'true' : 'false'}
          {...register('email', {
            required: labels.requiredEmail,
            pattern: {
              value: /\S+@\S+\.\S+/,
              message: labels.invalidEmail,
            },
          })}
        />
        {errors.email ? <p className="text-sm text-red-600 dark:text-red-400">{errors.email.message}</p> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">{labels.password}</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          aria-invalid={errors.password ? 'true' : 'false'}
          {...register('password', {
            required: labels.requiredPassword,
          })}
        />
        {errors.password ? <p className="text-sm text-red-600 dark:text-red-400">{errors.password.message}</p> : null}
      </div>

      {errors.root?.message ? <p className="text-sm text-red-600 dark:text-red-400">{errors.root.message}</p> : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? labels.submitting : labels.submit}
      </Button>

      <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
        {labels.registerPrompt}{' '}
        <Link href="/register" className="font-medium text-zinc-900 underline underline-offset-4 dark:text-zinc-50">
          {labels.registerCta}
        </Link>
      </p>
    </form>
  );
}
