import { cookies } from 'next/headers';
import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { isProduction } from '@/lib/env';
import { jsonError } from '@/lib/security';

const TESTER_COOKIE = 'mindtrail_tester';

export async function POST() {
  try {
    const store = await cookies();
    const existing = store.get(TESTER_COOKIE)?.value;
    if (existing) {
      return NextResponse.json({ ok: true, provider: 'tester' });
    }

    store.set(TESTER_COOKIE, randomUUID(), {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction(),
      path: '/',
      maxAge: 60 * 60 * 24
    });

    return NextResponse.json({ ok: true, provider: 'tester' }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
