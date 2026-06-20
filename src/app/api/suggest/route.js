import { NextResponse } from 'next/server';
import { generateSuggestions } from '@/lib/gemini';
import { listEntries } from '@/lib/db';
import { getActor } from '@/lib/auth';
import { assertSameOrigin, jsonError, rateLimit } from '@/lib/security';
import { parseJsonBody, suggestSchema } from '@/lib/validation';

export async function POST(request) {
  try {
    assertSameOrigin(request);
    const actor = await getActor();
    await rateLimit(`suggest:${actor.storageKey}`, { limit: 5, windowMs: 60 * 60 * 1000 });

    const { count } = parseJsonBody(suggestSchema, await request.json());
    const entries = await listEntries(actor.storageKey, count);

    if (!entries.length) {
      return NextResponse.json({
        suggestions: null,
        message: 'Complete at least one check-in before requesting suggestions.'
      });
    }

    const suggestions = await generateSuggestions(entries);
    return NextResponse.json({ suggestions, message: null });
  } catch (error) {
    return jsonError(error);
  }
}
