import { NextResponse } from 'next/server';
import { chatWithCompanion } from '@/lib/gemini';
import { listEntries } from '@/lib/db';
import { getActor } from '@/lib/auth';
import { crisisResponse, detectCrisis } from '@/lib/safety';
import { assertSameOrigin, jsonError, rateLimit } from '@/lib/security';
import { chatSchema, parseJsonBody } from '@/lib/validation';

export async function POST(request) {
  try {
    assertSameOrigin(request);
    const actor = await getActor();
    await rateLimit(`chat:${actor.storageKey}`, { limit: 20, windowMs: 60 * 60 * 1000 });

    const { message } = parseJsonBody(chatSchema, await request.json());
    if (detectCrisis(message)) {
      return NextResponse.json({ reply: crisisResponse().message, crisis: true }, { status: 202 });
    }

    const entries = await listEntries(actor.storageKey, 5);
    const reply = await chatWithCompanion(message, entries);
    return NextResponse.json({ reply, crisis: false });
  } catch (error) {
    return jsonError(error);
  }
}
