import { NextResponse } from 'next/server';
import { generateEntryInsights } from '@/lib/gemini';
import { listEntries, saveEntryInsights } from '@/lib/db';
import { getActor } from '@/lib/auth';
import { assertSameOrigin, jsonError, rateLimit } from '@/lib/security';

export async function POST(request, { params }) {
  try {
    assertSameOrigin(request);
    const actor = await getActor();
    const { id } = await params;
    await rateLimit(`entry-insights:${actor.storageKey}:${id}`, { limit: 4, windowMs: 60 * 60 * 1000 });

    const entries = await listEntries(actor.storageKey, 50, { includeJournal: true });
    const entry = entries.find((item) => item.id === id);
    if (!entry) {
      const error = new Error('Journal entry was not found');
      error.status = 404;
      throw error;
    }

    const generated = await generateEntryInsights(entry);
    const insights = await saveEntryInsights(actor.storageKey, id, generated);
    return NextResponse.json({ insights }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
