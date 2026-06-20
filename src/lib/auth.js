import { auth } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';
import { createHash } from 'crypto';
import { getSession } from './session';
import { isProduction } from './env';

const TESTER_COOKIE = 'mindtrail_tester';

async function getTesterSession() {
  const store = await cookies();
  const testerCookie = store.get(TESTER_COOKIE)?.value;
  if (!testerCookie) return null;
  const session = await getSession(TESTER_COOKIE);
  return {
    id: session.id,
    storageKey: session.hash,
    sessionKey: session.hash,
    provider: 'tester'
  };
}

export async function getActor() {
  const hasClerk = Boolean(process.env.CLERK_SECRET_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  if (hasClerk) {
    const { sessionId, userId } = await auth();
    if (userId) {
      return {
        id: userId,
        storageKey: createHash('sha256').update(userId).digest('hex'),
        sessionKey: createHash('sha256').update(sessionId || userId).digest('hex'),
        provider: 'clerk'
      };
    }

    const tester = await getTesterSession();
    if (tester) return tester;

    const error = new Error('Authentication is required');
    error.status = 401;
    throw error;
  }

  const tester = await getTesterSession();
  if (tester) return tester;

  if (isProduction()) {
    const error = new Error('Authentication is required. Sign in or continue as tester.');
    error.status = 401;
    throw error;
  }

  const session = await getSession();
  return {
    id: session.id,
    storageKey: session.hash,
    sessionKey: session.hash,
    provider: 'dev-session'
  };
}
