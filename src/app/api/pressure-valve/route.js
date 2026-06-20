import { NextResponse } from 'next/server';
import { processPressureValve } from '@/lib/gemini';
import { getActor } from '@/lib/auth';
import { assertSameOrigin, jsonError, rateLimit } from '@/lib/security';
import { parseJsonBody, pressureValveSchema } from '@/lib/validation';

export async function POST(request) {
  try {
    assertSameOrigin(request);
    const actor = await getActor();
    await rateLimit(`pressure-valve:${actor.storageKey}`, { limit: 8, windowMs: 60 * 60 * 1000 });

    const { text } = parseJsonBody(pressureValveSchema, await request.json());
    const clarity = await processPressureValve(text);
    return NextResponse.json({ clarity });
  } catch (error) {
    return jsonError(error);
  }
}
