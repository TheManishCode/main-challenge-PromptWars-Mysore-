import { NextResponse } from 'next/server';
import { z } from 'zod';
import { normalizeBaseUrl } from '@/lib/gemini';
import { getActor } from '@/lib/auth';
import { assertSameOrigin, jsonError, rateLimit } from '@/lib/security';
import { parseJsonBody } from '@/lib/validation';

const listModelsSchema = z.object({
  key: z.string().trim().max(400).optional(),
  baseURL: z.string().trim().max(300).optional(),
  provider: z.string().trim().max(40).optional()
});

const NATIVE_ENDPOINTS = {
  google: {
    buildUrl: (key) => `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`,
    buildHeaders: () => ({}),
    extractIds: (data) =>
      (data.models || [])
        .map((m) => (m.name || '').replace('models/', ''))
        .filter((id) => id && !id.includes('embedding') && !id.includes('aqa') && !id.includes('tts'))
  },
  anthropic: {
    buildUrl: () => 'https://api.anthropic.com/v1/models',
    buildHeaders: (key) => ({ 'x-api-key': key, 'anthropic-version': '2023-06-01' }),
    extractIds: (data) => (data.data || []).map((m) => m.id).filter(Boolean)
  }
};

function buildOpenAICompatibleFetch(baseURL, key) {
  return {
    url: `${baseURL}/models`,
    headers: { Authorization: `Bearer ${key}` },
    extractIds: (data) => (data.data || []).map((m) => m.id).filter(Boolean)
  };
}

export async function POST(request) {
  try {
    assertSameOrigin(request);
    const actor = await getActor();
    await rateLimit(`list-models:${actor.storageKey}`, { limit: 30, windowMs: 5 * 60 * 1000 });

    const input = parseJsonBody(listModelsSchema, await request.json());
    const { key = '', baseURL, provider } = input;

    let url, fetchHeaders, extractIds;

    if (baseURL) {
      const clean = normalizeBaseUrl(baseURL);
      if (!clean) return NextResponse.json({ error: 'Invalid base URL.' }, { status: 400 });
      ({ url, headers: fetchHeaders, extractIds } = buildOpenAICompatibleFetch(clean, key));
    } else if (provider && NATIVE_ENDPOINTS[provider]) {
      const ep = NATIVE_ENDPOINTS[provider];
      url = ep.buildUrl(key);
      fetchHeaders = ep.buildHeaders(key);
      extractIds = ep.extractIds;
    } else {
      // Default: treat as OpenAI-compatible
      ({ url, headers: fetchHeaders, extractIds } = buildOpenAICompatibleFetch('https://api.openai.com/v1', key));
    }

    const res = await fetch(url, {
      headers: fetchHeaders,
      signal: AbortSignal.timeout(8000)
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Provider returned ${res.status}` }, { status: 400 });
    }

    const data = await res.json();
    const models = extractIds(data).slice(0, 200);

    return NextResponse.json({ models });
  } catch (error) {
    return jsonError(error);
  }
}
