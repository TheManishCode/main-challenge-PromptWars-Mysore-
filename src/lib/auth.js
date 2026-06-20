import { auth } from '@clerk/nextjs/server';
import { createHash } from 'crypto';
import { getTesterSession } from './tester-session';

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
  }

  const tester = await getTesterSession();
  if (tester) {
    const stableTesterId = `tester:${tester.id}`;
    return {
      id: stableTesterId,
      storageKey: createHash('sha256').update(stableTesterId).digest('hex'),
      sessionKey: createHash('sha256').update(`${stableTesterId}:${tester.issuedAt}`).digest('hex'),
      provider: 'tester'
    };
  }

  const error = new Error('Authentication is required');
  error.status = 401;
  throw error;
}
