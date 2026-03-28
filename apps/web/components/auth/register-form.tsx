'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import { Link, useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type RegisterFormValues = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type RegisterFormProps = {
  locale: string;
  labels: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    submit: string;
    submitting: string;
    requiredEmail: string;
    invalidEmail: string;
    requiredPassword: string;
    weakPassword: string;
    requiredConfirmPassword: string;
    passwordMismatch: string;
    nameTooLong: string;
    genericError: string;
    loginPrompt: string;
    loginCta: string;
  };
};

const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{10,}$/;

export function RegisterForm({ locale, labels }: RegisterFormProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const password = watch('password');

  const onSubmit = handleSubmit(async (values) => {
    setPending(true);

    const response = await fetch('/api/account/signup', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: values.name.trim() || undefined,
        email: values.email,
        password: values.password,
      }),
    });

    const body = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setError('root', {
        type: 'server',
        message: body?.error ?? labels.genericError,
      });
      setPending(false);
      return;
    }

    const signInResult = await signIn('credentials', {
      redirect: false,
      email: values.email,
      password: values.password,
      callbackUrl: `/${locale}/profile`,
    });

    if (!signInResult || signInResult.error) {
      setError('root', {
        type: 'server',
        message: labels.genericError,
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
        <Label htmlFor="name">{labels.name}</Label>
        <Input
          id="name"
          autoComplete="name"
          aria-invalid={errors.name ? 'true' : 'false'}
          {...register('name', {
            maxLength: {
              value: 80,
              message: labels.nameTooLong,
            },
          })}
        />
        {errors.name ? <p className="text-sm text-red-600 dark:text-red-400">{errors.name.message}</p> : null}
      </div>

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
          autoComplete="new-password"
          aria-invalid={errors.password ? 'true' : 'false'}
          {...register('password', {
            required: labels.requiredPassword,
            pattern: {
              value: passwordPattern,
              message: labels.weakPassword,
            },
          })}
        />
        {errors.password ? <p className="text-sm text-red-600 dark:text-red-400">{errors.password.message}</p> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">{labels.confirmPassword}</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          aria-invalid={errors.confirmPassword ? 'true' : 'false'}
          {...register('confirmPassword', {
            required: labels.requiredConfirmPassword,
            validate: (value) => value === password || labels.passwordMismatch,
          })}
        />
        {errors.confirmPassword ? (
          <p className="text-sm text-red-600 dark:text-red-400">{errors.confirmPassword.message}</p>
        ) : null}
      </div>

      {errors.root?.message ? <p className="text-sm text-red-600 dark:text-red-400">{errors.root.message}</p> : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? labels.submitting : labels.submit}
      </Button>

      <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
        {labels.loginPrompt}{' '}
        <Link href="/login" className="font-medium text-zinc-900 underline underline-offset-4 dark:text-zinc-50">
          {labels.loginCta}
        </Link>
      </p>
    </form>
  );
}
