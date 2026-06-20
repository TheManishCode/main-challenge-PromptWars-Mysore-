import { NextResponse } from 'next/server';
import { saveExamCountdown, listExamCountdowns, deleteExamCountdown } from '@/lib/db';
import { getActor } from '@/lib/auth';
import { assertSameOrigin, jsonError, rateLimit } from '@/lib/security';
import { parseJsonBody, examCountdownSchema } from '@/lib/validation';

export async function GET() {
  try {
    const actor = await getActor();
    const countdowns = await listExamCountdowns(actor.storageKey);
    return NextResponse.json({ countdowns });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request) {
  try {
    assertSameOrigin(request);
    const actor = await getActor();
    await rateLimit(`countdown:${actor.storageKey}`, { limit: 10, windowMs: 60 * 60 * 1000 });

    const data = parseJsonBody(examCountdownSchema, await request.json());
    const countdown = await saveExamCountdown(actor.storageKey, data);
    return NextResponse.json({ countdown }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request) {
  try {
    assertSameOrigin(request);
    const actor = await getActor();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      const error = new Error('Countdown ID is required');
      error.status = 400;
      throw error;
    }

    const deleted = await deleteExamCountdown(actor.storageKey, id);
    if (!deleted) {
      const error = new Error('Countdown not found');
      error.status = 404;
      throw error;
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    return jsonError(error);
  }
}
