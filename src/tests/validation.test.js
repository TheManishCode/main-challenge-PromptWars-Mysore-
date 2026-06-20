import { describe, expect, it } from 'vitest';
import { moodSchema } from '@/lib/validation';

describe('moodSchema', () => {
  it('accepts a complete bounded wellness log', () => {
    const result = moodSchema.safeParse({
      mood: 7,
      energy: 6,
      sleepHours: 7.5,
      exam: 'JEE Advanced',
      journal: 'I studied physics today and noticed that timed mock tests made me tense, but a walk helped me reset.'
    });

    expect(result.success).toBe(true);
  });

  it('rejects unsafe or low-signal input', () => {
    const result = moodSchema.safeParse({
      mood: 11,
      energy: 0,
      sleepHours: 19,
      exam: 'J',
      journal: 'short'
    });

    expect(result.success).toBe(false);
    expect(result.error.issues.length).toBeGreaterThan(0);
  });
});
