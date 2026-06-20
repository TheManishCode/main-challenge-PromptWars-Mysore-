import { auth } from '@clerk/nextjs/server';
import { createHash } from 'crypto';

export async function getActor() {
  const hasClerk = Boolean(process.env.CLERK_SECRET_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

  if (!hasClerk) {
    const error = new Error('Authentication is required');
    error.status = 401;
    throw error;
  }

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
