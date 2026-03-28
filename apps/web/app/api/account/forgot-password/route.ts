import { NextResponse } from 'next/server';

import { requestPasswordReset } from '@/src/auth/account-lifecycle';

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string };

  await requestPasswordReset(body.email ?? '');

  return NextResponse.json({ ok: true });
}
