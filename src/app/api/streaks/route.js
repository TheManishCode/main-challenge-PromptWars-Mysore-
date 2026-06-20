import { NextResponse } from 'next/server';
import { getStreaks, updateStreak } from '@/lib/db';
import { getActor } from '@/lib/auth';
import { assertSameOrigin, jsonError } from '@/lib/security';

export async function GET() {
  try {
    const actor = await getActor();
    const streaks = await getStreaks(actor.storageKey);
    return NextResponse.json({ streaks });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request) {
  try {
    assertSameOrigin(request);
    const actor = await getActor();
    const body = await request.json();
    const type = body.type;

    if (!['journal', 'checkin', 'meditation'].includes(type)) {
      const error = new Error('Invalid streak type. Must be: journal, checkin, or meditation');
      error.status = 400;
      throw error;
    }

    const streaks = await updateStreak(actor.storageKey, type);
    return NextResponse.json({ streaks });
  } catch (error) {
    return jsonError(error);
  }
}
