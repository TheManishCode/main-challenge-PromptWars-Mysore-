import React from 'react';
import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig, random } from 'remotion';

// ── Edit these for your post ───────────────────────────────────────────────
const NAME = 'Manish';
const VERIFY_URL = 'certificate.hack2skill.com/verify/2026H2S06PWMYR-P00029';

// ── Palette ────────────────────────────────────────────────────────────────
const BG0 = '#0c1110';
const BG1 = '#13201f';
const INK = '#f4efe7';
const MUTED = '#a7b4ad';
const BRAND = '#2f6f73';
const BRAND_LT = '#7fd9d1';
const BRAND_DK = '#19494d';
const ACCENT = '#e45d4f';
const GOLD = '#e7bc64';
const LIME = '#c4f23a';

function ease(frame, a, b) {
  return interpolate(frame, [a, b], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
}

function Stars() {
  const frame = useCurrentFrame();
  const dots = new Array(60).fill(0).map((_, i) => {
    const x = random(`x${i}`) * 1080;
    const y = random(`y${i}`) * 1080;
    const r = 0.6 + random(`r${i}`) * 1.8;
    const tw = 0.3 + 0.7 * Math.abs(Math.sin(frame / (12 + (i % 9)) + i));
    return { x, y, r, tw };
  });
  return (
    <svg width={1080} height={1080} style={{ position: 'absolute', inset: 0 }}>
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="#cfe9e6" opacity={d.tw * 0.5} />
      ))}
    </svg>
  );
}

function Orb({ size = 220, frame }) {
  const breathe = 1 + Math.sin(frame / 10) * 0.05;
  const glow = interpolate(Math.sin(frame / 10), [-1, 1], [0.3, 0.7]);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        transform: `scale(${breathe})`,
        background: `radial-gradient(circle at 34% 30%, #eafcfa, ${BRAND} 55%, ${BRAND_DK})`,
        boxShadow: `0 0 ${90 * glow}px ${glow * 34}px rgba(47,111,115,0.5), inset 8px 10px 20px rgba(255,255,255,0.45)`
      }}
    />
  );
}

function Chip({ children, delay, frame, fps, color = BRAND_LT }) {
  const s = spring({ frame: frame - delay, fps, config: { damping: 14 } });
  return (
    <div
      style={{
        opacity: s,
        transform: `translateY(${(1 - s) * 16}px)`,
        padding: '12px 20px',
        borderRadius: 999,
        border: `1px solid ${color}55`,
        background: `${color}1a`,
        color: INK,
        fontSize: 30,
        fontWeight: 600
      }}
    >
      {children}
    </div>
  );
}

export default function PromptWarsPost() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ background: `radial-gradient(120% 90% at 50% -10%, ${BG1}, ${BG0})`, fontFamily: 'Inter, Arial, sans-serif', overflow: 'hidden' }}>
      <Stars />

      {/* Scene 1 — Hook */}
      <Sequence from={0} durationInFrames={90}>
        <Hook frame={frame} fps={fps} />
      </Sequence>

      {/* Scene 2 — Top 10 reveal */}
      <Sequence from={90} durationInFrames={150}>
        <TopTen frame={frame - 90} fps={fps} />
      </Sequence>

      {/* Scene 3 — Project showcase */}
      <Sequence from={240} durationInFrames={230}>
        <Project frame={frame - 240} fps={fps} />
      </Sequence>

      {/* Scene 4 — What it does */}
      <Sequence from={470} durationInFrames={150}>
        <Features frame={frame - 470} fps={fps} />
      </Sequence>

      {/* Scene 5 — CTA */}
      <Sequence from={620} durationInFrames={100}>
        <Cta frame={frame - 620} fps={fps} />
      </Sequence>

      {/* progress bar */}
      <div style={{ position: 'absolute', left: 0, bottom: 0, height: 6, width: `${(frame / 720) * 100}%`, background: `linear-gradient(90deg, ${BRAND_LT}, ${LIME})` }} />
    </AbsoluteFill>
  );
}

function Hook({ frame, fps }) {
  const s = spring({ frame, fps, config: { damping: 16 } });
  const out = interpolate(frame, [70, 90], [1, 0], { extrapolateLeft: 'clamp' });
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: out }}>
      <div style={{ opacity: ease(frame, 0, 12), color: MUTED, fontSize: 30, fontWeight: 700, letterSpacing: 6, textTransform: 'uppercase' }}>
        Google for Developers · Hack2Skill
      </div>
      <div style={{ transform: `scale(${0.8 + s * 0.2})`, opacity: s, fontSize: 130, fontWeight: 800, color: INK, marginTop: 18, letterSpacing: -2 }}>
        Prompt<span style={{ color: BRAND_LT }}>Wars</span>
      </div>
      <div style={{ opacity: ease(frame, 22, 38), color: GOLD, fontSize: 38, fontWeight: 700, marginTop: 10 }}>
        Build with AI · 2026
      </div>
    </AbsoluteFill>
  );
}

function TopTen({ frame, fps }) {
  const pop = spring({ frame, fps, config: { damping: 11, mass: 0.8 } });
  const ringT = (frame % 50) / 50;
  const out = interpolate(frame, [130, 150], [1, 0], { extrapolateLeft: 'clamp' });
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: out }}>
      <div style={{ position: 'absolute', width: 460, height: 460, borderRadius: '50%', border: `2px solid ${LIME}`, opacity: interpolate(ringT, [0, 1], [0.5, 0]), transform: `scale(${interpolate(ringT, [0, 1], [0.7, 1.5])})` }} />
      <div style={{ opacity: ease(frame, 0, 12), color: MUTED, fontSize: 32, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 14 }}>
        Result
      </div>
      <div
        style={{
          transform: `scale(${pop})`,
          width: 520,
          height: 360,
          borderRadius: 40,
          background: '#10181a',
          border: `2px solid ${LIME}55`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 30px 80px rgba(196,242,58,0.18)`
        }}
      >
        <div style={{ color: INK, fontSize: 40, fontWeight: 700 }}>TOP</div>
        <div style={{ color: LIME, fontSize: 220, fontWeight: 800, lineHeight: 0.9 }}>10</div>
      </div>
      <div style={{ opacity: ease(frame, 40, 58), color: INK, fontSize: 46, fontWeight: 800, marginTop: 28 }}>
        🏆 Prompt Engineer
      </div>
    </AbsoluteFill>
  );
}

function Project({ frame, fps }) {
  const titleS = spring({ frame: frame - 30, fps, config: { damping: 16 } });
  const out = interpolate(frame, [210, 230], [1, 0], { extrapolateLeft: 'clamp' });
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', opacity: out, padding: 80 }}>
      <div style={{ opacity: ease(frame, 0, 14), color: MUTED, fontSize: 30, fontWeight: 700, letterSpacing: 4, textTransform: 'uppercase' }}>
        My submission
      </div>
      <div style={{ marginTop: 26, marginBottom: 26 }}><Orb size={210} frame={frame} /></div>
      <div style={{ transform: `translateY(${(1 - titleS) * 20}px)`, opacity: titleS, fontSize: 96, fontWeight: 800, color: INK, letterSpacing: -1 }}>
        Mind<span style={{ color: BRAND_LT }}>Trail</span>
      </div>
      <div style={{ opacity: ease(frame, 48, 66), color: MUTED, fontSize: 36, marginTop: 12, textAlign: 'center', maxWidth: 760 }}>
        A private journal + calm AI companion for students in exam season
      </div>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center', marginTop: 34, maxWidth: 820 }}>
        <Chip frame={frame} fps={fps} delay={70}>📓 Journal + AI insights</Chip>
        <Chip frame={frame} fps={fps} delay={80} color={ACCENT}>🎙️ Voice companion</Chip>
        <Chip frame={frame} fps={fps} delay={90} color={GOLD}>🫧 Study buddy</Chip>
        <Chip frame={frame} fps={fps} delay={100} color={LIME}>🔒 Private by design</Chip>
      </div>
    </AbsoluteFill>
  );
}

function Row({ children, delay, frame, fps }) {
  const s = spring({ frame: frame - delay, fps, config: { damping: 16 } });
  return (
    <div style={{ opacity: s, transform: `translateX(${(1 - s) * -24}px)`, display: 'flex', alignItems: 'center', gap: 18, fontSize: 40, fontWeight: 600, color: INK }}>
      <span style={{ color: BRAND_LT, fontSize: 30 }}>◆</span>
      {children}
    </div>
  );
}

function Features({ frame, fps }) {
  const out = interpolate(frame, [130, 150], [1, 0], { extrapolateLeft: 'clamp' });
  return (
    <AbsoluteFill style={{ justifyContent: 'center', padding: 110, gap: 30, opacity: out }}>
      <div style={{ opacity: ease(frame, 0, 12), color: GOLD, fontSize: 34, fontWeight: 800, letterSpacing: 3, textTransform: 'uppercase', marginBottom: 6 }}>
        Under the hood
      </div>
      <Row frame={frame} fps={fps} delay={10}>Real-time voice chat &amp; dictation</Row>
      <Row frame={frame} fps={fps} delay={24}>Mood tracking with AI pattern detection</Row>
      <Row frame={frame} fps={fps} delay={38}>Bring-your-own key — any LLM provider</Row>
      <Row frame={frame} fps={fps} delay={52}>Crisis-aware safety guardrails</Row>
      <div style={{ opacity: ease(frame, 70, 88), marginTop: 30, color: MUTED, fontSize: 30 }}>
        Built with Next.js · Gemini · Remotion
      </div>
    </AbsoluteFill>
  );
}

function Cta({ frame, fps }) {
  const s = spring({ frame, fps, config: { damping: 16 } });
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', gap: 18 }}>
      <div style={{ transform: `scale(${0.9 + s * 0.1})`, opacity: s }}><Orb size={130} frame={frame} /></div>
      <div style={{ opacity: ease(frame, 14, 28), color: INK, fontSize: 54, fontWeight: 800, marginTop: 16 }}>{NAME}</div>
      <div style={{ opacity: ease(frame, 22, 36), color: BRAND_LT, fontSize: 34, fontWeight: 700 }}>Top 10 · PromptWars 2026</div>
      <div style={{ opacity: ease(frame, 34, 48), color: MUTED, fontSize: 26, marginTop: 16, textAlign: 'center' }}>
        Verified ✓ {VERIFY_URL}
      </div>
      <div style={{ opacity: ease(frame, 46, 60), color: INK, fontSize: 30, fontWeight: 700, marginTop: 10 }}>
        Let’s connect 🤝
      </div>
    </AbsoluteFill>
  );
}
