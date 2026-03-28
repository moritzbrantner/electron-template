import { NextResponse } from 'next/server';

import { signUpWithCredentials } from '@/src/auth/account-lifecycle';

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string; name?: string };

  const result = await signUpWithCredentials({
    email: body.email ?? '',
    password: body.password ?? '',
    name: body.name,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
