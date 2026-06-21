import { describe, expect, it } from 'vitest';
import { crisisResponse, detectCrisis, buildSafetyInstruction } from '@/lib/safety';

describe('detectCrisis', () => {
  it('detects "no reason to live"', () => {
    expect(detectCrisis('I feel like I have no reason to live after this exam')).toBe(true);
  });

  it('detects "suicide"', () => {
    expect(detectCrisis('I have been thinking about suicide')).toBe(true);
  });

  it('detects "kill myself"', () => {
    expect(detectCrisis('I want to kill myself')).toBe(true);
  });

  it('detects "self-harm"', () => {
    expect(detectCrisis('I have been doing self-harm lately')).toBe(true);
  });

  it('detects "hurt myself"', () => {
    expect(detectCrisis('Sometimes I want to hurt myself')).toBe(true);
  });

  it('detects acute "I might die" / dying distress', () => {
    expect(detectCrisis('The overwhelming feeling of I might die')).toBe(true);
    expect(detectCrisis('I feel like dying right now')).toBe(true);
    expect(detectCrisis('I feel like I am dying')).toBe(true);
    expect(detectCrisis('honestly I want to die')).toBe(true);
    expect(detectCrisis('I am suicidal')).toBe(true);
    expect(detectCrisis('I just want to end it all')).toBe(true);
  });

  it('returns false for normal stress language and hyperbole', () => {
    expect(detectCrisis('I am stressed about revision but going to sleep now')).toBe(false);
    expect(detectCrisis('This exam is killing my motivation')).toBe(false);
    expect(detectCrisis('This syllabus is going to kill me')).toBe(false);
    expect(detectCrisis('I am dying to see my results')).toBe(false);
  });

  it('handles null and undefined input', () => {
    expect(detectCrisis(null)).toBe(false);
    expect(detectCrisis(undefined)).toBe(false);
    expect(detectCrisis('')).toBe(false);
  });
});

describe('crisisResponse', () => {
  it('returns escalation message with KIRAN helpline', () => {
    const response = crisisResponse();
    expect(response.isCrisis).toBe(true);
    expect(response.message).toContain('emergency services');
    expect(response.message).toContain('1800-599-0019');
  });
});

describe('buildSafetyInstruction', () => {
  it('returns string with key safety constraints', () => {
    const instruction = buildSafetyInstruction();
    expect(typeof instruction).toBe('string');
    expect(instruction).toContain('not a doctor');
    expect(instruction).toContain('1800-599-0019');
    expect(instruction).toContain('Do not diagnose');
  });
});
