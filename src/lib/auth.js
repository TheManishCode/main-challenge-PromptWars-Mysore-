import { auth } from '@clerk/nextjs/server';
import { createHash } from 'crypto';
import { getSession } from './session';
import { isProduction } from './env';

export async function getActor() {
  const hasClerk = Boolean(process.env.CLERK_SECRET_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  if (hasClerk) {
    const { sessionId, userId } = await auth();
    if (!userId) {
      const error = new Error('Authentication is required');
      error.status = 401;
      throw error;
    }

    return {
      id: userId,
      storageKey: createHash('sha256').update(userId).digest('hex'),
      sessionKey: createHash('sha256').update(sessionId || userId).digest('hex'),
      provider: 'clerk'
    };
  }

  if (isProduction()) {
    const error = new Error('Clerk environment variables are required for production authentication');
    error.status = 500;
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
