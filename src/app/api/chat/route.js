import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { chatWithCompanion } from '@/lib/gemini';
import { getOrCreateThread, listChatMessages, listEntries, saveChatMessage } from '@/lib/db';
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

    const thread = await getOrCreateThread(actor.storageKey);
    await saveChatMessage(actor.storageKey, thread.id, {
      id: randomUUID(),
      role: 'student',
      content: message
    });

    const entries = await listEntries(actor.storageKey, 50, { includeJournal: true });
    const reply = await chatWithCompanion(message, entries);
    await saveChatMessage(actor.storageKey, thread.id, {
      id: randomUUID(),
      role: 'companion',
      content: reply
    });
    const messages = await listChatMessages(actor.storageKey, thread.id, 30);

    return NextResponse.json({ reply, crisis: false, thread, messages });
  } catch (error) {
    return jsonError(error);
  }
}
