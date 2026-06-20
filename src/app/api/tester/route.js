import { NextResponse } from 'next/server';
import { clerkClient } from '@clerk/nextjs/server';
import { assertSameOrigin, jsonError, rateLimit } from '@/lib/security';

const TESTER_EMAIL = process.env.TESTER_EMAIL || 'manishp.dev@gmail.com';

export async function POST(request) {
  try {
    assertSameOrigin(request);
    await rateLimit('tester-login', { limit: 20, windowMs: 60 * 60 * 1000 });

    const client = await clerkClient();
    const testerUserId = process.env.TESTER_CLERK_USER_ID || await findTesterUserId(client);
    if (!testerUserId) {
      const error = new Error('Tester Clerk user was not found');
      error.status = 404;
      throw error;
    }

    const signInToken = await client.signInTokens.createSignInToken({
      userId: testerUserId,
      expiresInSeconds: 60
    });

    return NextResponse.json({ ticket: signInToken.token }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

async function findTesterUserId(client) {
  const users = await client.users.getUserList({
    emailAddress: [TESTER_EMAIL],
    limit: 1
  });
  return users.data?.[0]?.id || null;
}
