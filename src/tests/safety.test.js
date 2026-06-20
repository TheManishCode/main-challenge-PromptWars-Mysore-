import { describe, expect, it } from 'vitest';
import { crisisResponse, detectCrisis } from '@/lib/safety';

describe('safety', () => {
  it('detects direct crisis language before model calls', () => {
    expect(detectCrisis('I feel like I have no reason to live after this exam')).toBe(true);
    expect(detectCrisis('I am stressed about revision but going to sleep now')).toBe(false);
  });

  it('returns a human escalation message without hiding the limitation', () => {
    const response = crisisResponse();
    expect(response.isCrisis).toBe(true);
    expect(response.message).toContain('emergency services');
    expect(response.message).toContain('1800-599-0019');
  });
});
