import { NextResponse } from 'next/server';
import { analyzeWorry } from '@/lib/gemini';
import { listWorries, resolveWorry, saveWorry } from '@/lib/db';
import { getActor } from '@/lib/auth';
import { assertSameOrigin, jsonError, rateLimit } from '@/lib/security';
import { parseJsonBody, worrySchema } from '@/lib/validation';

export async function GET() {
  try {
    const actor = await getActor();
    const worries = await listWorries(actor.storageKey);
    return NextResponse.json({ worries });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request) {
  try {
    assertSameOrigin(request);
    const actor = await getActor();
    await rateLimit(`worry:${actor.storageKey}`, { limit: 10, windowMs: 60 * 60 * 1000 });

    const { worry } = parseJsonBody(worrySchema, await request.json());
    const analysis = await analyzeWorry(worry);
    const saved = await saveWorry(actor.storageKey, {
      worryText: worry,
      acknowledgment: analysis.acknowledgment,
      isInTheirControl: analysis.isInTheirControl,
      whatTheyCanControl: analysis.whatTheyCanControl,
      parkUntil: analysis.parkUntil,
      parkMessage: analysis.parkMessage
    });

    return NextResponse.json({ worry: saved });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request) {
  try {
    assertSameOrigin(request);
    const actor = await getActor();
    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const updated = await resolveWorry(actor.storageKey, id);
    return NextResponse.json({ worry: updated });
  } catch (error) {
    return jsonError(error);
  }
}
