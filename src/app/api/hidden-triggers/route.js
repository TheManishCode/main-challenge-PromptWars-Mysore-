import { NextResponse } from 'next/server';
import { detectHiddenTriggers } from '@/lib/gemini';
import { listEntries } from '@/lib/db';
import { getActor } from '@/lib/auth';
import { assertSameOrigin, jsonError, rateLimit } from '@/lib/security';

export async function POST(request) {
  try {
    assertSameOrigin(request);
    const actor = await getActor();
    await rateLimit(`triggers:${actor.storageKey}`, { limit: 5, windowMs: 60 * 60 * 1000 });

    const entries = await listEntries(actor.storageKey, 30, { includeJournal: true });
    if (entries.length < 3) {
      return NextResponse.json({
        triggers: [],
        message: 'Need at least 3 check-ins to detect hidden patterns. Keep journaling!'
      });
    }

    const triggers = await detectHiddenTriggers(entries);
    return NextResponse.json({ triggers, message: null });
  } catch (error) {
    return jsonError(error);
  }
}
