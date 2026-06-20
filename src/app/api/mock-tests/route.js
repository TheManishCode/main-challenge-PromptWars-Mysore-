import { NextResponse } from 'next/server';
import { analyzeMockTest } from '@/lib/gemini';
import { saveMockTest, listMockTests, listEntries } from '@/lib/db';
import { getActor } from '@/lib/auth';
import { assertSameOrigin, jsonError, rateLimit } from '@/lib/security';
import { parseJsonBody, mockTestSchema } from '@/lib/validation';

export async function GET() {
  try {
    const actor = await getActor();
    const tests = await listMockTests(actor.storageKey);
    return NextResponse.json({ tests });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request) {
  try {
    assertSameOrigin(request);
    const actor = await getActor();
    await rateLimit(`mocktest:${actor.storageKey}`, { limit: 10, windowMs: 60 * 60 * 1000 });

    const testData = parseJsonBody(mockTestSchema, await request.json());
    const entries = await listEntries(actor.storageKey, 10);

    const aiAnalysis = await analyzeMockTest(testData, entries);
    const saved = await saveMockTest(actor.storageKey, testData, aiAnalysis);

    return NextResponse.json({ test: saved }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
