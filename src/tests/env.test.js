import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getRequiredEnv, isProduction, getAppOrigin } from '../lib/env';

describe('getRequiredEnv', () => {
  it('returns value when env var is set', () => {
    process.env.TEST_VAR = 'hello';
    expect(getRequiredEnv('TEST_VAR')).toBe('hello');
    delete process.env.TEST_VAR;
  });

  it('throws when env var is missing', () => {
    expect(() => getRequiredEnv('NONEXISTENT_VAR_XYZ')).toThrow('NONEXISTENT_VAR_XYZ is not configured');
  });

  it('throws when env var is empty string', () => {
    process.env.EMPTY_VAR = '   ';
    expect(() => getRequiredEnv('EMPTY_VAR')).toThrow('EMPTY_VAR is not configured');
    delete process.env.EMPTY_VAR;
  });
});

describe('isProduction', () => {
  const original = process.env.NODE_ENV;
  afterEach(() => { process.env.NODE_ENV = original; });

  it('returns true when NODE_ENV is production', () => {
    process.env.NODE_ENV = 'production';
    expect(isProduction()).toBe(true);
  });

  it('returns false when NODE_ENV is not production', () => {
    process.env.NODE_ENV = 'development';
    expect(isProduction()).toBe(false);
  });
});

describe('getAppOrigin', () => {
  let saved;
  beforeEach(() => {
    saved = {
      APP_ORIGIN: process.env.APP_ORIGIN,
      VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
      VERCEL_URL: process.env.VERCEL_URL,
      NODE_ENV: process.env.NODE_ENV
    };
    delete process.env.APP_ORIGIN;
    delete process.env.VERCEL_PROJECT_PRODUCTION_URL;
    delete process.env.VERCEL_URL;
  });
  afterEach(() => {
    Object.entries(saved).forEach(([k, v]) => {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    });
  });

  it('returns APP_ORIGIN when explicitly set', () => {
    process.env.APP_ORIGIN = 'https://custom.example.com';
    expect(getAppOrigin()).toBe('https://custom.example.com');
  });

  it('falls back to VERCEL_PROJECT_PRODUCTION_URL', () => {
    process.env.VERCEL_PROJECT_PRODUCTION_URL = 'mindtrail.vercel.app';
    expect(getAppOrigin()).toBe('https://mindtrail.vercel.app');
  });

  it('falls back to VERCEL_URL', () => {
    process.env.VERCEL_URL = 'mindtrail-abc123.vercel.app';
    expect(getAppOrigin()).toBe('https://mindtrail-abc123.vercel.app');
  });

  it('returns localhost in development', () => {
    process.env.NODE_ENV = 'development';
    expect(getAppOrigin()).toBe('http://localhost:3000');
  });
});
