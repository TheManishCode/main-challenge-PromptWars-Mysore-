import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { chatWithCompanion } from '@/lib/gemini';
import { getOrCreateThread, listChatMessages, listEntries, saveChatMessage } from '@/lib/db';
import { getActor } from '@/lib/auth';
import { crisisResponse, detectCrisis } from '@/lib/safety';
import { assertSameOrigin, jsonError, rateLimit } from '@/lib/security';
import { chatSchema, parseJsonBody } from '@/lib/validation';

export async function GET() {
  try {
    const actor = await getActor();
    const thread = await getOrCreateThread(actor.storageKey);
    const messages = await listChatMessages(actor.storageKey, thread.id, 50);
    return NextResponse.json({ thread, messages });
  } catch (error) {
    return jsonError(error);
  }
}

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
    let reply;
    try {
      reply = await chatWithCompanion(message, entries);
    } catch (modelError) {
      const usedUserKey = Boolean(request.headers.get('x-mindtrail-api-key'));
      const raw = String(modelError?.message || '');
      const quota = /quota|rate|exceed|billing|429/i.test(raw);
      const friendly = usedUserKey
        ? 'Could not reach the AI with the API key you added. Please check it in Settings, or remove it to use the default.'
        : quota
          ? 'The shared AI key is out of quota right now. Open Settings (gear icon) and add your own API key — any provider works — to keep chatting. It stays only on your device.'
          : 'The AI is unavailable right now. Try again, or add your own API key in Settings.';
      return NextResponse.json({ error: friendly }, { status: 503 });
    }
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
