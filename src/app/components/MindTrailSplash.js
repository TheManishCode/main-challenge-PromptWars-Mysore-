'use client';

import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Sequence } from 'remotion';

// Palette (matches the app's light tokens; kept identical on purpose).
const BG = '#f7f4ee';
const PAPER = '#fffdf8';
const INK = '#25211d';
const MUTED = '#726b62';
const BRAND = '#2f6f73';
const BRAND_DARK = '#19494d';
const ACCENT = '#e45d4f';
const GREEN = '#4b8f63';
const GOLD = '#d89b2b';

function Orb({ frame, fps }) {
  const pop = spring({ frame, fps, config: { damping: 14, mass: 0.7 } });
  const breathe = 1 + Math.sin(frame / 9) * 0.05;
  const scale = pop * breathe;
  const glow = interpolate(Math.sin(frame / 9), [-1, 1], [0.35, 0.7]);
  return (
    <div
      style={{
        width: 150,
        height: 150,
        borderRadius: '50%',
        transform: `scale(${scale})`,
        background: `radial-gradient(circle at 34% 30%, #eafcfa, ${BRAND} 55%, ${BRAND_DARK})`,
        boxShadow: `0 0 ${60 * glow}px ${glow * 26}px rgba(47,111,115,0.45), inset 6px 8px 16px rgba(255,255,255,0.5)`
      }}
    />
  );
}

function Ring({ frame, delay }) {
  const local = frame - delay;
  if (local < 0) return null;
  const t = (local % 50) / 50;
  return (
    <div
      style={{
        position: 'absolute',
        width: 150,
        height: 150,
        borderRadius: '50%',
        border: `2px solid ${BRAND}`,
        opacity: interpolate(t, [0, 1], [0.5, 0]),
        transform: `scale(${interpolate(t, [0, 1], [1, 2.4])})`
      }}
    />
  );
}

export default function MindTrailSplash() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleY = interpolate(spring({ frame: frame - 14, fps, config: { damping: 16 } }), [0, 1], [24, 0]);
  const titleO = interpolate(frame, [14, 30], [0, 1], { extrapolateRight: 'clamp' });
  const tagO = interpolate(frame, [34, 50], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(frame, [86, 100], [1, 0], { extrapolateLeft: 'clamp' });

  // little trail dots that march in under the wordmark
  const dots = [ACCENT, GOLD, GREEN, BRAND];

  return (
    <AbsoluteFill style={{ background: BG, alignItems: 'center', justifyContent: 'center', opacity: fadeOut, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Ring frame={frame} delay={6} />
        <Ring frame={frame} delay={22} />
        <Ring frame={frame} delay={38} />
      </AbsoluteFill>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26 }}>
        <Orb frame={frame} fps={fps} />

        <div style={{ transform: `translateY(${titleY}px)`, opacity: titleO, textAlign: 'center' }}>
          <div style={{ fontSize: 76, fontWeight: 800, letterSpacing: -1, color: INK }}>
            Mind<span style={{ color: BRAND }}>Trail</span>
          </div>
        </div>

        <Sequence from={34}>
          <div style={{ opacity: tagO, color: MUTED, fontSize: 24, fontWeight: 500 }}>
            Your calm companion through exam season
          </div>
        </Sequence>

        <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
          {dots.map((c, i) => {
            const d = spring({ frame: frame - (44 + i * 6), fps, config: { damping: 12 } });
            return (
              <div
                key={c}
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  background: c,
                  transform: `scale(${d})`,
                  boxShadow: `0 4px 10px ${PAPER}`
                }}
              />
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
}
