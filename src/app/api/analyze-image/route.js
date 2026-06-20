import { NextResponse } from 'next/server';
import { analyzeImage } from '@/lib/gemini';
import { getActor } from '@/lib/auth';
import { assertSameOrigin, jsonError, rateLimit } from '@/lib/security';
import { imageAnalysisSchema, parseJsonBody } from '@/lib/validation';

export async function POST(request) {
  try {
    assertSameOrigin(request);
    const actor = await getActor();
    await rateLimit(`analyze-image:${actor.storageKey}`, { limit: 10, windowMs: 60 * 60 * 1000 });

    const { imageDataUrl, type } = parseJsonBody(imageAnalysisSchema, await request.json());

    const match = imageDataUrl.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return NextResponse.json({ error: 'Invalid image format' }, { status: 400 });

    const mimeType = match[1];
    const base64Data = match[2];
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(mimeType)) {
      return NextResponse.json({ error: 'Unsupported image type. Use JPEG, PNG, or WebP.' }, { status: 400 });
    }

    const imageBuffer = Buffer.from(base64Data, 'base64');
    const result = await analyzeImage(imageBuffer, mimeType, type);
    return NextResponse.json({ analysis: result, type });
  } catch (error) {
    return jsonError(error);
  }
}
