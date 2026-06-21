import { randomUUID } from 'crypto';
import { streamCompanionReply } from '@/lib/gemini';
import { getOrCreateThread, listChatMessages, listEntries, saveChatMessage } from '@/lib/db';
import { getActor } from '@/lib/auth';
import { crisisResponse, detectCrisis } from '@/lib/safety';
import { assertSameOrigin, jsonError, rateLimit } from '@/lib/security';
import { chatSchema, parseJsonBody } from '@/lib/validation';

const STREAM_HEADERS = {
  'Content-Type': 'text/plain; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  'X-Accel-Buffering': 'no'
};

function staticStream(text) {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(text));
      controller.close();
    }
  });
}

export async function POST(request) {
  try {
    assertSameOrigin(request);
    const actor = await getActor();
    await rateLimit(`chat-voice:${actor.storageKey}`, { limit: 40, windowMs: 60 * 60 * 1000 });

    const usedUserKey = Boolean(request.headers.get('x-mindtrail-api-key'));
    const { message } = parseJsonBody(chatSchema, await request.json());

    if (detectCrisis(message)) {
      return new Response(staticStream(crisisResponse().message), {
        status: 200,
        headers: { ...STREAM_HEADERS, 'X-Crisis': '1' }
      });
    }

    const thread = await getOrCreateThread(actor.storageKey);
    // Fetch context in parallel and start the model immediately; persist the
    // student turn in the background so the first token isn't gated on a DB write.
    const [history, entries] = await Promise.all([
      listChatMessages(actor.storageKey, thread.id, 20),
      listEntries(actor.storageKey, 12, { includeJournal: true })
    ]);
    saveChatMessage(actor.storageKey, thread.id, {
      id: randomUUID(),
      role: 'student',
      content: message
    }).catch(() => {});

    const result = await streamCompanionReply(message, entries, history);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let full = '';
        let errored = false;
        try {
          for await (const delta of result.textStream) {
            full += delta;
            controller.enqueue(encoder.encode(delta));
          }
        } catch {
          errored = true;
        }
        if (!full.trim()) {
          full = usedUserKey
            ? "I couldn't reach the AI with the API key you added. Please double-check it in Settings, or remove it to use the default."
            : "The app's shared AI key is out of quota right now. Open Settings — the gear icon — and add your own API key from any provider to keep talking. It stays only on your device.";
          controller.enqueue(encoder.encode(full));
        }
        controller.close();
        const reply = full.trim();
        if (reply && !errored) {
          await saveChatMessage(actor.storageKey, thread.id, {
            id: randomUUID(),
            role: 'companion',
            content: reply
          }).catch(() => {});
        }
      }
    });

    return new Response(stream, { status: 200, headers: STREAM_HEADERS });
  } catch (error) {
    return jsonError(error);
  }
}
