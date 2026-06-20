const CRISIS_PATTERNS = [
  /\bkill myself\b/i,
  /\bend my life\b/i,
  /\bsuicide\b/i,
  /\bself[-\s]?harm\b/i,
  /\bhurt myself\b/i,
  /\bno reason to live\b/i,
  /\bnothing matters anymore\b/i,
  /\bcan'?t take it anymore\b/i,
  /\bwant to disappear\b/i,
  /\bgive up on everything\b/i,
  /\beverything is pointless\b/i,
  /\bno way out\b/i,
  /\bcan'?t go on\b/i,
  /\bwant to die\b/i,
  /\bbetter off dead\b/i,
  /\bdon'?t want to exist\b/i
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

export function getRiskLevel(analysisData) {
  if (!analysisData) {
    return { level: 'green', label: 'Healthy', actions: ['Keep up the good work!'] };
  }

  const {
    stressLevel = 'low',
    burnoutRiskScore = 0,
    anxietyIndicators = [],
    selfDoubtIndicators = [],
    emotionalIntensity = 3
  } = analysisData;

  const anxietyCount = Array.isArray(anxietyIndicators) ? anxietyIndicators.length : 0;
  const selfDoubtCount = Array.isArray(selfDoubtIndicators) ? selfDoubtIndicators.length : 0;
  const combinedIndicators = anxietyCount + selfDoubtCount;

  if (burnoutRiskScore > 75 || combinedIndicators >= 5) {
    return {
      level: 'red',
      label: 'Crisis Risk',
      actions: [
        'Please reach out to someone you trust right now.',
        'Call KIRAN helpline: 1800-599-0019 (24/7, free).',
        'Consider speaking with a school counselor or mental health professional.',
        'Take an immediate break from studying.',
        'Practice the emergency grounding exercise in the Coach tab.'
      ]
    };
  }

  if (stressLevel === 'high' || burnoutRiskScore > 55 || anxietyCount >= 3) {
    return {
      level: 'orange',
      label: 'Burnout Risk',
      actions: [
        'Your stress levels need immediate attention.',
        'Take a 30-minute complete break from all screens.',
        'Try the breathing exercise in the Coach tab.',
        'Consider talking to a trusted person about how you feel.',
        'Reduce study hours today and prioritize sleep.'
      ]
    };
  }

  if (stressLevel === 'moderate' || burnoutRiskScore > 30 || emotionalIntensity > 6) {
    return {
      level: 'yellow',
      label: 'Elevated Stress',
      actions: [
        'Your stress is elevated — this is common during exam season.',
        'Schedule short breaks every 45 minutes of study.',
        'Try a quick meditation session in the Coach tab.',
        'Make sure you are getting 7+ hours of sleep.'
      ]
    };
  }

  return {
    level: 'green',
    label: 'Healthy',
    actions: [
      'You are managing well! Keep your current routine.',
      'Continue journaling to maintain self-awareness.',
      'Stay consistent with sleep and study schedules.'
    ]
  };
}

export function getEscalationResponse(riskLevel) {
  const responses = {
    green: {
      title: 'You are doing great!',
      message: 'Your mental wellness indicators look healthy. Keep journaling and maintaining your routines. Consistency is your superpower.',
      urgency: 'none',
      resources: []
    },
    yellow: {
      title: 'Elevated stress detected',
      message: 'Your recent entries show rising stress. This is normal during exam preparation, but it is important to manage it proactively before it builds up.',
      urgency: 'moderate',
      resources: [
        'Try the 4-7-8 breathing exercise',
        'Take a 15-minute walk',
        'Talk to a friend or family member'
      ]
    },
    orange: {
      title: 'Burnout risk detected',
      message: 'Your patterns suggest you may be approaching burnout. Please take this seriously — your health is more important than any exam score.',
      urgency: 'high',
      resources: [
        'Reduce study hours by 20% today',
        'Prioritize 8 hours of sleep tonight',
        'Consider speaking with a school counselor',
        'Use the recovery plan in the Coach tab'
      ]
    },
    red: {
      title: 'We are concerned about you',
      message: 'Your recent entries indicate significant distress. You are not alone, and there are people who care about you and want to help.',
      urgency: 'critical',
      resources: [
        'KIRAN Mental Health Helpline: 1800-599-0019 (24/7, free)',
        'iCall: 9152987821',
        'Vandrevala Foundation: 1860-2662-345',
        'Talk to a trusted family member, teacher, or friend immediately',
        'If you are in immediate danger, contact emergency services'
      ]
    }
  };

  return responses[riskLevel] || responses.green;
}

export function buildSafetyInstruction() {
  return [
    'You are a supportive student wellness companion, not a doctor, therapist, or crisis service.',
    'Do not diagnose, prescribe medication, claim certainty, or replace professional care.',
    'If the student indicates self-harm, suicide, abuse, or immediate danger, tell them to contact emergency services or a trusted person and include India KIRAN helpline 1800-599-0019.',
    'Keep advice practical, non-judgmental, culturally sensitive for Indian exam pressure, and grounded in the user-provided journal only.'
  ].join('\n');
}
