const CRISIS_PATTERNS = [
  /\bkill myself\b/i,
  /\bend my life\b/i,
  /\bsuicide\b/i,
  /\bself[-\s]?harm\b/i,
  /\bhurt myself\b/i,
  /\bno reason to live\b/i
];

export function detectCrisis(text) {
  return CRISIS_PATTERNS.some((pattern) => pattern.test(text || ''));
}

export function crisisResponse() {
  return {
    isCrisis: true,
    message:
      'I am really sorry you are feeling this much pain. Please contact emergency services now if you may hurt yourself, or reach a trusted person immediately. In India, you can call KIRAN at 1800-599-0019. This app cannot provide crisis care, but you deserve real human support right now.'
  };
}

export function buildSafetyInstruction() {
  return [
    'You are a supportive student wellness companion, not a doctor, therapist, or crisis service.',
    'Do not diagnose, prescribe medication, claim certainty, or replace professional care.',
    'If the student indicates self-harm, suicide, abuse, or immediate danger, tell them to contact emergency services or a trusted person and include India KIRAN helpline 1800-599-0019.',
    'Keep advice practical, non-judgmental, culturally sensitive for Indian exam pressure, and grounded in the user-provided journal only.'
  ].join('\n');
}
