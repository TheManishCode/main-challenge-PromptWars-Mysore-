import { NextResponse } from 'next/server';
import { z } from 'zod';
import { testProvider } from '@/lib/gemini';
import { getActor } from '@/lib/auth';
import { assertSameOrigin, jsonError, rateLimit } from '@/lib/security';
import { parseJsonBody } from '@/lib/validation';

const testSchema = z.object({
  provider: z.string().trim().max(40).optional(),
  key: z.string().trim().max(400).optional(),
  model: z.string().trim().max(120).optional(),
  baseURL: z.string().trim().max(300).optional()
});

export async function POST(request) {
  try {
    assertSameOrigin(request);
    const actor = await getActor();
    await rateLimit(`provider-test:${actor.storageKey}`, { limit: 20, windowMs: 10 * 60 * 1000 });

    const input = parseJsonBody(testSchema, await request.json());
    if (!input.key && !input.baseURL) {
      return NextResponse.json({ ok: false, error: 'Add a key or a base URL first.' }, { status: 400 });
    }

    const result = await testProvider(input);
    return NextResponse.json(result, { status: result.ok ? 200 : 200 });
  } catch (error) {
    return jsonError(error);
  }
}
