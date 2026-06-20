import { NextResponse } from 'next/server';
import { createTesterSession } from '@/lib/tester-session';
import { assertSameOrigin, jsonError, rateLimit } from '@/lib/security';

export async function POST(request) {
  try {
    assertSameOrigin(request);
    await rateLimit('tester-login', { limit: 20, windowMs: 60 * 60 * 1000 });
    await createTesterSession();
    return NextResponse.json({ ok: true, provider: 'tester' }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
