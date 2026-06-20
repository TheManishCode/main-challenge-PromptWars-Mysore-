import { cookies } from 'next/headers';
import { createHash, createHmac, randomUUID } from 'crypto';
import { isProduction } from './env';

const DEFAULT_COOKIE = 'mindtrail_session';

function hashSession(id) {
  const secret = process.env.SESSION_SECRET;
  if (secret) {
    return createHmac('sha256', secret).update(id).digest('hex');
  }
  return createHash('sha256').update(id).digest('hex');
}

export async function getSession(overrideCookieName) {
  const cookieName = overrideCookieName || process.env.SESSION_COOKIE_NAME || DEFAULT_COOKIE;
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
    hash: hashSession(sessionId)
  };
}
