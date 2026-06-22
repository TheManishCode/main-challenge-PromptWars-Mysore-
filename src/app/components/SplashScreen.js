'use client';

import { useEffect, useRef, useState } from 'react';
import { Player } from '@remotion/player';
import MindTrailSplash from './MindTrailSplash';

const DURATION = 100; // frames
const FPS = 30;

export default function SplashScreen({ onDone }) {
  const [leaving, setLeaving] = useState(false);
  const playerRef = useRef(null);
  const doneRef = useRef(false);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    setLeaving(true);
    setTimeout(() => onDone?.(), 320);
  };

  useEffect(() => {
    // Fallback in case the player 'ended' event never fires.
    const fallback = setTimeout(finish, (DURATION / FPS) * 1000 + 400);
    return () => clearTimeout(fallback);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const p = playerRef.current;
    if (!p) return undefined;
    const onEnded = () => finish();
    p.addEventListener('ended', onEnded);
    return () => { try { p.removeEventListener('ended', onEnded); } catch {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`splash-overlay${leaving ? ' splash-leaving' : ''}`} role="status" aria-label="Loading MindTrail">
      <div className="splash-fallback" aria-hidden>
        <span className="splash-orb" />
        <div className="splash-word">Mind<span>Trail</span></div>
      </div>
      <Player
        ref={playerRef}
        component={MindTrailSplash}
        durationInFrames={DURATION}
        fps={FPS}
        compositionWidth={1280}
        compositionHeight={720}
        style={{ width: '100%', height: '100%', position: 'relative', zIndex: 1 }}
        autoPlay
        loop={false}
        controls={false}
        clickToPlay={false}
        doubleClickToFullscreen={false}
        showVolumeControls={false}
      />
      <button type="button" className="splash-skip" onClick={finish}>Skip</button>
    </div>
  );
}
