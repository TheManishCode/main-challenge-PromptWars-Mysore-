'use client';

import { useEffect, useRef } from 'react';

// Classic oneko sprite map (32x32 cells on a 256x128 sheet). Used by every
// real skin (cat / dog / maia / tora / vaporwave).
const ONEKO_SPRITES = {
  idle: [[-3, -3]],
  alert: [[-7, -3]],
  scratchSelf: [[-5, 0], [-6, 0], [-7, 0]],
  scratchWallN: [[0, 0], [0, -1]],
  scratchWallS: [[-7, -1], [-6, -2]],
  scratchWallE: [[-2, -2], [-2, -3]],
  scratchWallW: [[-4, 0], [-4, -1]],
  tired: [[-3, -2]],
  sleeping: [[-2, 0], [-2, -1]],
  N: [[-1, -2], [-1, -3]],
  NE: [[0, -2], [0, -3]],
  E: [[-3, 0], [-3, -1]],
  SE: [[-5, -1], [-5, -2]],
  S: [[-6, -3], [-7, -2]],
  SW: [[-5, -3], [-6, -1]],
  W: [[-4, -2], [-4, -3]],
  NW: [[-1, 0], [-1, -1]]
};

// ── Custom pixel slime sheet (drawn as an SVG so no binary asset is needed) ──
const SLIME_BODY = '#5fc98a';
const SLIME_DARK = '#2f8f73';
const SLIME_EYE = '#1b2a23';
const SLIME_HI = '#cdebd7';
const PX = 4; // 8x8 logical grid per 32px cell

// pose maps: '.' empty, 'b' body, 'd' base, 'e' eye, 'h' highlight
const SLIME_POSES = {
  idle: ['........', '..bbbb..', '.hbbbbb.', 'bbbbbbbb', 'bbebbebb', 'bbbbbbbb', 'dbbbbbbd', '.dddddd.'],
  bob: ['........', '........', '..bbbb..', '.hbbbbb.', 'bbebbebb', 'bbbbbbbb', 'bbbbbbbb', '.dddddd.'],
  sleep1: ['........', '........', '........', '..bbbb..', '.bbbbbb.', 'bbebbebb', 'bbbbbbbb', '.dddddd.'],
  sleep2: ['........', '........', '........', '........', '..bbbb..', '.bbbbbb.', 'bbebbebb', 'dbbbbbbd'],
  alert: ['..bbbb..', '.hbbbbb.', 'bbbbbbbb', 'beebbeeb', 'bbbbbbbb', 'bbbbbbbb', 'dbbbbbbd', '.dddddd.']
};
const SLIME_COLS = ['idle', 'bob', 'sleep1', 'sleep2', 'alert']; // columns 0..4

function colorFor(ch) {
  if (ch === 'b') return SLIME_BODY;
  if (ch === 'd') return SLIME_DARK;
  if (ch === 'e') return SLIME_EYE;
  if (ch === 'h') return SLIME_HI;
  return null;
}

function buildSlimeSheet() {
  let rects = '';
  SLIME_COLS.forEach((pose, col) => {
    const ox = col * 32;
    SLIME_POSES[pose].forEach((row, r) => {
      for (let c = 0; c < 8; c++) {
        const fill = colorFor(row[c]);
        if (fill) rects += `<rect x="${ox + c * PX}" y="${r * PX}" width="${PX}" height="${PX}" fill="${fill}"/>`;
      }
    });
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="128" viewBox="0 0 256 128" shape-rendering="crispEdges">${rects}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// slime keeps oneko's movement but bobs (cols 0/1) in every direction.
const SLIME_SPRITES = (() => {
  const move = [[0, 0], [-1, 0]];
  const sleep = [[-2, 0], [-3, 0]];
  return {
    idle: [[0, 0]],
    alert: [[-4, 0]],
    tired: [[-2, 0]],
    sleeping: sleep,
    scratchSelf: move,
    scratchWallN: move, scratchWallS: move, scratchWallE: move, scratchWallW: move,
    N: move, NE: move, E: move, SE: move, S: move, SW: move, W: move, NW: move
  };
})();

const SKINS = {
  cat: { url: '/oneko/classic.gif', sprites: ONEKO_SPRITES, pixel: true },
  dog: { url: '/oneko/dog.gif', sprites: ONEKO_SPRITES, pixel: true },
  maia: { url: '/oneko/maia.gif', sprites: ONEKO_SPRITES, pixel: true },
  tora: { url: '/oneko/tora.gif', sprites: ONEKO_SPRITES, pixel: true },
  vaporwave: { url: '/oneko/vaporwave.gif', sprites: ONEKO_SPRITES, pixel: true },
  slime: { url: buildSlimeSheet(), sprites: SLIME_SPRITES, pixel: true }
};

export const PET_SKINS = [
  { code: 'cat', label: 'Cat' },
  { code: 'dog', label: 'Dog' },
  { code: 'maia', label: 'Maia' },
  { code: 'tora', label: 'Tora' },
  { code: 'vaporwave', label: 'Vaporwave' },
  { code: 'slime', label: 'Slime' }
];

export default function OnekoPet({ skin = 'cat' }) {
  const ref = useRef(null);
  const skinRef = useRef(SKINS[skin] || SKINS.cat);

  // Swap skin without restarting the movement loop.
  useEffect(() => {
    const cfg = SKINS[skin] || SKINS.cat;
    skinRef.current = cfg;
    if (ref.current) ref.current.style.backgroundImage = `url("${cfg.url}")`;
  }, [skin]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    let nekoPosX = 32;
    let nekoPosY = 32;
    let mousePosX = window.innerWidth / 2;
    let mousePosY = window.innerHeight / 2;
    let frameCount = 0;
    let idleTime = 0;
    let idleAnimation = null;
    let idleAnimationFrame = 0;
    const nekoSpeed = 10;
    const dragging = { on: false };

    el.style.backgroundImage = `url("${skinRef.current.url}")`;
    el.style.left = `${nekoPosX - 16}px`;
    el.style.top = `${nekoPosY - 16}px`;

    function setSprite(name, frame) {
      const sets = skinRef.current.sprites;
      const set = sets[name] || sets.idle;
      const sprite = set[frame % set.length];
      el.style.backgroundPosition = `${sprite[0] * 32}px ${sprite[1] * 32}px`;
    }

    function resetIdleAnimation() {
      idleAnimation = null;
      idleAnimationFrame = 0;
    }

    function idle() {
      idleTime += 1;
      if (idleTime > 10 && Math.random() < 0.005 && idleAnimation == null) {
        const avail = ['sleeping', 'scratchSelf'];
        if (nekoPosX < 32) avail.push('scratchWallW');
        if (nekoPosY < 32) avail.push('scratchWallN');
        if (nekoPosX > window.innerWidth - 32) avail.push('scratchWallE');
        if (nekoPosY > window.innerHeight - 32) avail.push('scratchWallS');
        idleAnimation = avail[Math.floor(Math.random() * avail.length)];
      }
      switch (idleAnimation) {
        case 'sleeping':
          if (idleAnimationFrame < 8) setSprite('tired', 0);
          else setSprite('sleeping', Math.floor(idleAnimationFrame / 4));
          if (idleAnimationFrame > 192) resetIdleAnimation();
          break;
        case 'scratchWallN':
        case 'scratchWallS':
        case 'scratchWallE':
        case 'scratchWallW':
        case 'scratchSelf':
          setSprite(idleAnimation, idleAnimationFrame);
          if (idleAnimationFrame > 9) resetIdleAnimation();
          break;
        default:
          setSprite('idle', 0);
          return;
      }
      idleAnimationFrame += 1;
    }

    function frame() {
      frameCount += 1;
      if (dragging.on) { setSprite('alert', 0); return; }
      const diffX = nekoPosX - mousePosX;
      const diffY = nekoPosY - mousePosY;
      const distance = Math.sqrt(diffX ** 2 + diffY ** 2);

      if (distance < nekoSpeed || distance < 48) {
        idle();
        return;
      }

      resetIdleAnimation();

      if (idleTime > 1) {
        setSprite('alert', 0);
        idleTime = Math.min(idleTime, 7);
        idleTime -= 1;
        return;
      }

      let direction = '';
      direction += diffY / distance > 0.5 ? 'N' : '';
      direction += diffY / distance < -0.5 ? 'S' : '';
      direction += diffX / distance > 0.5 ? 'W' : '';
      direction += diffX / distance < -0.5 ? 'E' : '';
      setSprite(direction, frameCount);

      nekoPosX -= (diffX / distance) * nekoSpeed;
      nekoPosY -= (diffY / distance) * nekoSpeed;
      nekoPosX = Math.min(Math.max(16, nekoPosX), window.innerWidth - 16);
      nekoPosY = Math.min(Math.max(16, nekoPosY), window.innerHeight - 16);

      el.style.left = `${nekoPosX - 16}px`;
      el.style.top = `${nekoPosY - 16}px`;
    }

    const onMove = (e) => { mousePosX = e.clientX; mousePosY = e.clientY; };

    const onPointerDown = (e) => {
      dragging.on = true;
      try { el.setPointerCapture(e.pointerId); } catch {}
      el.style.cursor = 'grabbing';
    };
    const onPointerMove = (e) => {
      if (!dragging.on) return;
      nekoPosX = Math.min(Math.max(16, e.clientX), window.innerWidth - 16);
      nekoPosY = Math.min(Math.max(16, e.clientY), window.innerHeight - 16);
      mousePosX = nekoPosX;
      mousePosY = nekoPosY;
      el.style.left = `${nekoPosX - 16}px`;
      el.style.top = `${nekoPosY - 16}px`;
    };
    const onPointerUp = () => { dragging.on = false; el.style.cursor = 'grab'; };

    window.addEventListener('mousemove', onMove, { passive: true });
    el.addEventListener('pointerdown', onPointerDown);
    el.addEventListener('pointermove', onPointerMove);
    el.addEventListener('pointerup', onPointerUp);
    el.addEventListener('pointercancel', onPointerUp);

    const interval = reduced ? null : setInterval(frame, 100);
    setSprite('idle', 0);

    return () => {
      if (interval) clearInterval(interval);
      window.removeEventListener('mousemove', onMove);
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerUp);
    };
  }, []);

  return <div className="oneko" ref={ref} aria-hidden="true" />;
}
