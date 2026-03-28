import { NextResponse } from 'next/server';

import { resetPasswordWithToken } from '@/src/auth/account-lifecycle';

export async function POST(request: Request) {
  const body = (await request.json()) as { token?: string; password?: string };

  const result = await resetPasswordWithToken(body.token ?? '', body.password ?? '');

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
