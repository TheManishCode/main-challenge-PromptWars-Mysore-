import { cookies } from 'next/headers';
import { createHash, randomUUID } from 'crypto';
import { isProduction } from './env';

const DEFAULT_COOKIE = 'mindtrail_session';

export async function getSession() {
  const cookieName = process.env.SESSION_COOKIE_NAME || DEFAULT_COOKIE;
  const store = await cookies();
  let sessionId = store.get(cookieName)?.value;

  if (!sessionId) {
    sessionId = randomUUID();
    store.set(cookieName, sessionId, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction(),
      path: '/',
      maxAge: 60 * 60 * 24 * 30
    });
  }

  return {
    id: sessionId,
    hash: createHash('sha256').update(sessionId).digest('hex')
  };
}
