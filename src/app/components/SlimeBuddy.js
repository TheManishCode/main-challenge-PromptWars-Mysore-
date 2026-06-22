'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const ENCOURAGEMENTS = [
  "You've got this 💪",
  'One small step is enough.',
  'Proud of you for showing up.',
  'Breathe. You’re doing fine.',
  'Progress, not perfection.',
  'Rest is productive too.',
  'I believe in you!'
];

const CALMING = [
  'Let’s take one slow breath together.',
  'Shoulders down. Unclench your jaw.',
  'You’re allowed to pause.',
  'This feeling will pass.',
  'Sip some water? I’ll wait.'
];

const FUN = [
  'Boop! You found me 👀',
  'I’m 73% jelly, 27% vibes.',
  'Wanna hear a secret? …I forgot it.',
  'Catch me if you can! 🫧',
  'Squish level: maximum.',
  'Pro tip: snacks fix 80% of problems.',
  'I followed your cursor here. No regrets.',
  'Do I bounce on command? …maybe a little.',
  'Beep boop, I am a calm little blob.'
];

const HIT_OUCH = ['Ow! Hey!', 'Oof— that tickles!', 'Eep! Gentle please 🥺', 'Hey, I felt that!', 'Ouchie!'];
const HIT_ANGRY = ['Grrr! Stop poking me!', 'Okay that is RUDE 😠', 'One more and I splat, I swear!'];
const HIT_MELT = ['Aaah… I’m meltiiing 🫠', 'You broke me… into goo.', 'Splat. This is on you.'];
const RECOVER = ['ok… ok, I’m fine 😵‍💫', 'reassembled! mostly…', 'note to self: get armor.'];

function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickMessage(burnoutRisk) {
  if (burnoutRisk != null && burnoutRisk > 60) return rand(CALMING);
  return rand(Math.random() < 0.5 ? ENCOURAGEMENTS : FUN);
}

export default function SlimeBuddy({ burnoutRisk }) {
  const [emotion, setEmotion] = useState('happy');
  const [melting, setMelting] = useState(false);
  const [speech, setSpeech] = useState('');

  const rootRef = useRef(null);
  const bodyRef = useRef(null);
  const pupilRef = useRef(null);

  const pos = useRef({ x: 140, y: 320 });
  const target = useRef({ x: 140, y: 320 });
  const cursor = useRef({ x: 140, y: 320, t: 0 });
  const vel = useRef({ x: 0, y: 0 });

  const dragging = useRef(false);
  const down = useRef(null);
  const wanderNext = useRef(0);
  const hits = useRef({ count: 0, last: 0 });
  const meltingRef = useRef(false);
  const reducedRef = useRef(false);
  const propsRef = useRef({ burnoutRisk });

  const emotionTimer = useRef(null);
  const speechTimer = useRef(null);

  useEffect(() => { propsRef.current = { burnoutRisk }; }, [burnoutRisk]);

  const setEmotionFor = useCallback((e, ms, back = 'happy') => {
    setEmotion(e);
    clearTimeout(emotionTimer.current);
    if (ms) emotionTimer.current = setTimeout(() => setEmotion(back), ms);
  }, []);

  const say = useCallback((msg, ms = 4000) => {
    setSpeech(msg);
    clearTimeout(speechTimer.current);
    speechTimer.current = setTimeout(() => setSpeech(''), ms);
  }, []);

  useEffect(() => {
    reducedRef.current = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
    const x = Math.min(window.innerWidth - 140, 140);
    const y = window.innerHeight - 170;
    pos.current = { x, y };
    target.current = { x, y };
    cursor.current = { x, y, t: 0 };
  }, []);

  useEffect(() => {
    const onMove = (e) => { cursor.current = { x: e.clientX, y: e.clientY, t: performance.now() }; };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  useEffect(() => {
    let raf = 0;
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      if (meltingRef.current) return;

      const recentlyMoved = now - cursor.current.t < 2600;
      let tx;
      let ty;
      if (dragging.current) {
        tx = target.current.x;
        ty = target.current.y;
      } else if (reducedRef.current) {
        tx = pos.current.x;
        ty = pos.current.y;
      } else if (recentlyMoved) {
        const dx = pos.current.x - cursor.current.x;
        const dy = pos.current.y - cursor.current.y;
        const dist = Math.hypot(dx, dy) || 1;
        const gap = 52;
        tx = cursor.current.x + (dx / dist) * gap;
        ty = cursor.current.y + (dy / dist) * gap;
      } else {
        if (now > wanderNext.current) {
          wanderNext.current = now + 2800 + Math.random() * 3600;
          target.current = {
            x: 70 + Math.random() * (window.innerWidth - 140),
            y: 100 + Math.random() * (window.innerHeight - 200)
          };
        }
        tx = target.current.x;
        ty = target.current.y;
      }

      const ease = dragging.current ? 0.5 : 0.085;
      const nx = pos.current.x + (tx - pos.current.x) * ease;
      const ny = pos.current.y + (ty - pos.current.y) * ease;
      vel.current = { x: nx - pos.current.x, y: ny - pos.current.y };
      pos.current = { x: nx, y: ny };

      const speed = Math.hypot(vel.current.x, vel.current.y);
      const stretch = Math.min(0.3, speed * 0.018);
      const angle = (Math.atan2(vel.current.y, vel.current.x) * 180) / Math.PI;

      if (rootRef.current) {
        rootRef.current.style.transform = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0)`;
      }
      if (bodyRef.current) {
        bodyRef.current.style.transform =
          `rotate(${angle}deg) scale(${1 + stretch}, ${1 - stretch}) rotate(${-angle}deg)`;
      }
      if (pupilRef.current) {
        const dx = cursor.current.x - pos.current.x;
        const dy = cursor.current.y - pos.current.y;
        const d = Math.hypot(dx, dy) || 1;
        pupilRef.current.style.transform = `translate(${(dx / d) * 3.4}px, ${(dy / d) * 3.4}px)`;
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      if (meltingRef.current || dragging.current) return;
      const r = Math.random();
      if (r < 0.22) setEmotionFor('curious', 1600);
      else if (r < 0.38) setEmotionFor('love', 1500);
      else if (r < 0.5) setEmotionFor('sleepy', 2400);
      if (Math.random() < 0.55) say(pickMessage(propsRef.current.burnoutRisk));
    }, 9000);
    return () => clearInterval(id);
  }, [setEmotionFor, say]);

  useEffect(() => () => {
    clearTimeout(emotionTimer.current);
    clearTimeout(speechTimer.current);
  }, []);

  const melt = useCallback(() => {
    meltingRef.current = true;
    setMelting(true);
    setEmotion('melting');
    if (bodyRef.current) bodyRef.current.style.transform = '';
    say(rand(HIT_MELT), 2000);
    setTimeout(() => {
      meltingRef.current = false;
      setMelting(false);
      hits.current.count = 0;
      setEmotionFor('dizzy', 1500, 'happy');
      say(rand(RECOVER), 1800);
    }, 2000);
  }, [say, setEmotionFor]);

  const registerHit = useCallback(() => {
    if (meltingRef.current) return;
    const now = performance.now();
    if (now - hits.current.last > 2600) hits.current.count = 0;
    hits.current.last = now;
    hits.current.count += 1;
    if (bodyRef.current) {
      bodyRef.current.classList.remove('slime-bonk');
      void bodyRef.current.offsetWidth;
      bodyRef.current.classList.add('slime-bonk');
    }
    const c = hits.current.count;
    if (c >= 4) melt();
    else if (c === 3) { setEmotionFor('angry', 1600); say(rand(HIT_ANGRY), 1700); }
    else { setEmotionFor('hurt', 800); say(rand(HIT_OUCH), 1200); }
  }, [melt, setEmotionFor, say]);

  const onPointerDown = useCallback((e) => {
    e.preventDefault();
    down.current = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 };
    dragging.current = false;
    try { bodyRef.current.setPointerCapture(e.pointerId); } catch {}
  }, []);

  const onPointerMove = useCallback((e) => {
    if (!down.current) return;
    down.current.moved = Math.hypot(e.clientX - down.current.x, e.clientY - down.current.y);
    if (down.current.moved > 6) {
      if (!dragging.current && !meltingRef.current) {
        dragging.current = true;
        setEmotionFor('surprised', 0);
        say('wheee!', 1400);
      }
      target.current = { x: e.clientX, y: e.clientY };
    }
  }, [setEmotionFor, say]);

  const onPointerUp = useCallback(() => {
    const info = down.current;
    down.current = null;
    if (!info) return;
    if (dragging.current) {
      dragging.current = false;
      setEmotionFor('happy', 1000);
    } else if (info.moved < 6 && performance.now() - info.t < 400) {
      registerHit();
    }
  }, [registerHit, setEmotionFor]);

  return (
    <div className="slime-buddy" ref={rootRef} aria-hidden="false">
      {speech && <div className="slime-speech">{speech}</div>}
      <div
        className={`slime-body${melting ? ' slime-melting' : ''}`}
        ref={bodyRef}
        data-emotion={emotion}
        role="button"
        tabIndex={-1}
        aria-label="Study buddy — drag me around or poke me to play"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <span className="slime-gloss" />
        <SlimeFace emotion={emotion} pupilRef={pupilRef} />
        {melting && <span className="slime-puddle" />}
      </div>
    </div>
  );
}

function SlimeFace({ emotion, pupilRef }) {
  const roundEyes = ['happy', 'curious', 'surprised', 'sleepy', 'melting'].includes(emotion);
  return (
    <svg className="slime-face" viewBox="0 0 100 80" aria-hidden>
      {emotion === 'love' && (
        <g fill="#ff5e7a">
          <path d="M30 26c-4-6-13-4-13 3 0 5 7 9 13 14 6-5 13-9 13-14 0-7-9-9-13-3z" />
          <path d="M70 26c-4-6-13-4-13 3 0 5 7 9 13 14 6-5 13-9 13-14 0-7-9-9-13-3z" />
        </g>
      )}
      {emotion === 'angry' && (
        <g>
          <line x1="20" y1="20" x2="38" y2="27" stroke="#3a2b1f" strokeWidth="4" strokeLinecap="round" />
          <line x1="80" y1="20" x2="62" y2="27" stroke="#3a2b1f" strokeWidth="4" strokeLinecap="round" />
          <circle cx="30" cy="34" r="5.5" fill="#2a201a" />
          <circle cx="70" cy="34" r="5.5" fill="#2a201a" />
        </g>
      )}
      {emotion === 'hurt' && (
        <g stroke="#2a201a" strokeWidth="4" strokeLinecap="round">
          <line x1="23" y1="26" x2="35" y2="38" /><line x1="35" y1="26" x2="23" y2="38" />
          <line x1="65" y1="26" x2="77" y2="38" /><line x1="77" y1="26" x2="65" y2="38" />
        </g>
      )}
      {emotion === 'dizzy' && (
        <g fill="none" stroke="#2a201a" strokeWidth="3">
          <path d="M30 32m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" />
          <path d="M70 32m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" />
          <circle cx="30" cy="32" r="2.4" fill="#2a201a" />
          <circle cx="70" cy="32" r="2.4" fill="#2a201a" />
        </g>
      )}
      {roundEyes && (
        <>
          <ellipse cx="30" cy="34" rx={emotion === 'surprised' ? 9 : 7.5} ry={emotion === 'sleepy' ? 2.5 : emotion === 'surprised' ? 11 : 9.5} fill="#fffdf8" />
          <ellipse cx="70" cy="34" rx={emotion === 'surprised' ? 9 : 7.5} ry={emotion === 'sleepy' ? 2.5 : emotion === 'surprised' ? 11 : 9.5} fill="#fffdf8" />
          {emotion !== 'sleepy' && (
            <g ref={pupilRef} className="slime-pupils">
              <circle cx="30" cy="35" r={emotion === 'surprised' ? 4.4 : 3.8} fill="#241c16" />
              <circle cx="70" cy="35" r={emotion === 'surprised' ? 4.4 : 3.8} fill="#241c16" />
              <circle cx="31.4" cy="33.4" r="1.3" fill="#fff" />
              <circle cx="71.4" cy="33.4" r="1.3" fill="#fff" />
            </g>
          )}
        </>
      )}

      {emotion === 'happy' && <path d="M36 50q14 14 28 0" fill="none" stroke="#2a201a" strokeWidth="4" strokeLinecap="round" />}
      {emotion === 'love' && <path d="M36 50q14 14 28 0" fill="none" stroke="#2a201a" strokeWidth="4" strokeLinecap="round" />}
      {emotion === 'curious' && <ellipse cx="50" cy="54" rx="6" ry="7" fill="#2a201a" />}
      {emotion === 'surprised' && <ellipse cx="50" cy="55" rx="8" ry="9" fill="#2a201a" />}
      {emotion === 'sleepy' && <path d="M44 54q6 5 12 0" fill="none" stroke="#2a201a" strokeWidth="3.5" strokeLinecap="round" />}
      {emotion === 'angry' && <path d="M37 56q13 -10 26 0" fill="none" stroke="#2a201a" strokeWidth="4" strokeLinecap="round" />}
      {emotion === 'hurt' && <ellipse cx="50" cy="55" rx="5" ry="4" fill="#2a201a" />}
      {emotion === 'dizzy' && <path d="M37 54q6 6 13 0t13 0" fill="none" stroke="#2a201a" strokeWidth="3.5" strokeLinecap="round" />}
      {emotion === 'melting' && <path d="M37 52q6 7 13 0t13 0" fill="none" stroke="#2a201a" strokeWidth="3.5" strokeLinecap="round" />}

      {emotion === 'sleepy' && <text x="78" y="20" className="slime-zzz">z</text>}
    </svg>
  );
}
