import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getActor } from '@/lib/auth';
import { listGuestbookPosts, saveGuestbookPost } from '@/lib/db';
import { assertSameOrigin, jsonError, rateLimit } from '@/lib/security';
import { guestbookSchema, parseJsonBody } from '@/lib/validation';

const NOTE_COLORS = ['#fff4bc', '#f6d6d6', '#d8f0df', '#d7e8ff', '#f3ddff'];

function layoutSeed() {
  const rotation = Number((Math.random() * 12 - 6).toFixed(1));
  const scale = Number((0.92 + Math.random() * 0.18).toFixed(2));
  const xOffset = Math.round(Math.random() * 28 - 14);
  const yOffset = Math.round(Math.random() * 26 - 13);
  const color = NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)];
  return { rotation, scale, xOffset, yOffset, color };
}

export async function GET() {
  try {
    await getActor();
    const posts = await listGuestbookPosts();
    return NextResponse.json({ posts });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request) {
  try {
    assertSameOrigin(request);
    const actor = await getActor();
    await rateLimit(`guestbook:${actor.storageKey}`, { limit: 12, windowMs: 60 * 60 * 1000 });

    const input = parseJsonBody(guestbookSchema, await request.json());
    const post = {
      id: randomUUID(),
      ...input,
      ...layoutSeed(),
      createdAt: new Date().toISOString()
    };

    const saved = await saveGuestbookPost(actor.storageKey, post);
    return NextResponse.json({ post: saved }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
