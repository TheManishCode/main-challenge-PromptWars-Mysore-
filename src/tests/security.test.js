import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { assertSameOrigin, rateLimit, jsonError } from '../lib/security';

function mockRequest(origin) {
  return {
    headers: {
      get(name) {
        if (name === 'origin') return origin;
        return null;
      }
    }
  };
}

describe('assertSameOrigin', () => {
  let saved;
  beforeEach(() => {
    saved = {
      APP_ORIGIN: process.env.APP_ORIGIN,
      NODE_ENV: process.env.NODE_ENV
    };
    process.env.NODE_ENV = 'development';
  });
  afterEach(() => {
    Object.entries(saved).forEach(([k, v]) => {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    });
  });

  it('passes when origin matches APP_ORIGIN', () => {
    process.env.APP_ORIGIN = 'https://app.example.com';
    expect(() => assertSameOrigin(mockRequest('https://app.example.com'))).not.toThrow();
  });

  it('throws 403 when origin mismatches', () => {
    process.env.APP_ORIGIN = 'https://app.example.com';
    try {
      assertSameOrigin(mockRequest('https://evil.com'));
      expect.unreachable();
    } catch (e) {
      expect(e.status).toBe(403);
      expect(e.message).toBe('Request origin is not allowed');
    }
  });

  it('passes when no origin header is sent', () => {
    process.env.APP_ORIGIN = 'https://app.example.com';
    expect(() => assertSameOrigin(mockRequest(null))).not.toThrow();
  });

  it('passes in dev when neither origin nor APP_ORIGIN is set', () => {
    delete process.env.APP_ORIGIN;
    expect(() => assertSameOrigin(mockRequest(null))).not.toThrow();
  });
});

describe('rateLimit', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'development';
  });

  it('allows requests under the limit', async () => {
    await expect(rateLimit('test-key-ok', { limit: 5, windowMs: 60000 })).resolves.toBeUndefined();
  });

  it('throws 429 when limit is exceeded', async () => {
    const key = `test-key-exceed-${Date.now()}`;
    for (let i = 0; i < 3; i++) {
      await rateLimit(key, { limit: 3, windowMs: 60000 });
    }
    try {
      await rateLimit(key, { limit: 3, windowMs: 60000 });
      expect.unreachable();
    } catch (e) {
      expect(e.status).toBe(429);
    }
  });
});

describe('jsonError', () => {
  it('returns correct status and body for known error', () => {
    const err = new Error('Bad input');
    err.status = 400;
    const response = jsonError(err);
    expect(response.status).toBe(400);
  });

  it('defaults to 500 for errors without status', () => {
    const response = jsonError(new Error('Unexpected'));
    expect(response.status).toBe(500);
  });
});
