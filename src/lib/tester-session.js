import { cookies } from 'next/headers';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { isProduction } from './env';

export const TESTER_COOKIE = 'mindtrail_tester';
const MAX_AGE_SECONDS = 60 * 60 * 6;

function getSigningSecret() {
  return (
    process.env.TESTER_LOGIN_SECRET ||
    process.env.SESSION_SECRET ||
    process.env.CLERK_SECRET_KEY ||
    process.env.DATA_ENCRYPTION_KEY ||
    'mindtrail-local-tester-secret'
  );
}

function sign(payload) {
  return createHmac('sha256', getSigningSecret()).update(payload).digest('base64url');
}

function serializeSession(session) {
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function parseSession(value) {
  if (!value) return null;
  const [payload, signature] = value.split('.');
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!session.id || !session.expiresAt || Date.now() > session.expiresAt) return null;
    return session;
  } catch {
    return null;
  }
}

export async function createTesterSession() {
  const session = {
    id: randomUUID(),
    issuedAt: Date.now(),
    expiresAt: Date.now() + MAX_AGE_SECONDS * 1000
  };
  const store = await cookies();
  store.set(TESTER_COOKIE, serializeSession(session), {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction(),
    path: '/',
    maxAge: MAX_AGE_SECONDS
  });
  return session;
}

export async function getTesterSession() {
  const store = await cookies();
  return parseSession(store.get(TESTER_COOKIE)?.value);
}

export async function clearTesterSession() {
  const store = await cookies();
  store.set(TESTER_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction(),
    path: '/',
    maxAge: 0
  });
}
