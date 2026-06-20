import { NextResponse } from 'next/server';
import { analyzeEntry } from '@/lib/gemini';
import { saveEntry, listEntries } from '@/lib/db';
import { getActor } from '@/lib/auth';
import { crisisResponse, detectCrisis } from '@/lib/safety';
import { assertSameOrigin, jsonError, rateLimit } from '@/lib/security';
import { moodSchema, parseJsonBody } from '@/lib/validation';

export async function GET() {
  try {
    const actor = await getActor();
    const entries = await listEntries(actor.storageKey);
    return NextResponse.json({ entries });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request) {
  try {
    assertSameOrigin(request);
    const actor = await getActor();
    await rateLimit(`entries:${actor.storageKey}`, { limit: 12, windowMs: 60 * 60 * 1000 });

    const input = parseJsonBody(moodSchema, await request.json());
    if (detectCrisis(input.journal)) {
      return NextResponse.json({ entry: null, crisis: crisisResponse() }, { status: 202 });
    }

    const entry = await analyzeEntry(input);
    const savedEntry = await saveEntry(actor.storageKey, entry);
    return NextResponse.json({ entry: savedEntry, crisis: null }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
