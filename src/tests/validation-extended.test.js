import { describe, it, expect } from 'vitest';
import { chatSchema, suggestSchema, moodSchema, parseJsonBody } from '../lib/validation';

describe('chatSchema', () => {
  it('accepts valid message', () => {
    const result = chatSchema.safeParse({ message: 'I need help studying' });
    expect(result.success).toBe(true);
  });

  it('rejects too-short message', () => {
    const result = chatSchema.safeParse({ message: 'a' });
    expect(result.success).toBe(false);
  });

  it('rejects too-long message', () => {
    const result = chatSchema.safeParse({ message: 'x'.repeat(1201) });
    expect(result.success).toBe(false);
  });

  it('trims whitespace', () => {
    const result = chatSchema.safeParse({ message: '  hello there  ' });
    expect(result.success).toBe(true);
    expect(result.data.message).toBe('hello there');
  });
});

describe('suggestSchema', () => {
  it('accepts valid count', () => {
    const result = suggestSchema.safeParse({ count: 5 });
    expect(result.success).toBe(true);
  });

  it('defaults count to 5 when omitted', () => {
    const result = suggestSchema.safeParse({});
    expect(result.success).toBe(true);
    expect(result.data.count).toBe(5);
  });

  it('rejects count above 20', () => {
    const result = suggestSchema.safeParse({ count: 25 });
    expect(result.success).toBe(false);
  });

  it('coerces string to number', () => {
    const result = suggestSchema.safeParse({ count: '7' });
    expect(result.success).toBe(true);
    expect(result.data.count).toBe(7);
  });
});

describe('moodSchema coercion', () => {
  it('coerces string mood to number', () => {
    const result = moodSchema.safeParse({
      mood: '7', energy: '5', sleepHours: '8',
      exam: 'NEET', journal: 'Today was a long day of studying biology and I felt okay about it.'
    });
    expect(result.success).toBe(true);
    expect(result.data.mood).toBe(7);
  });

  it('accepts boundary values', () => {
    const result = moodSchema.safeParse({
      mood: 1, energy: 10, sleepHours: 0,
      exam: 'JEE', journal: 'Minimum mood maximum energy zero sleep grinding hard for my exam prep.'
    });
    expect(result.success).toBe(true);
  });
});

describe('parseJsonBody', () => {
  it('returns parsed data on valid input', () => {
    const data = parseJsonBody(chatSchema, { message: 'hello world' });
    expect(data.message).toBe('hello world');
  });

  it('throws with status 400 on invalid input', () => {
    try {
      parseJsonBody(chatSchema, { message: '' });
      expect.unreachable();
    } catch (e) {
      expect(e.status).toBe(400);
      expect(e.message).toContain('Invalid request');
    }
  });
});
