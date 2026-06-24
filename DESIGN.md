# Design

A warm, human, calm design system for MindTrail. Light by default (a soft warm off-white, deliberately not the saturated AI "cream"), with a calm eucalyptus-teal as the trust/primary color and a warm apricot as the human accent. Dark theme is a low-glare warm charcoal for late-night study. Color strategy: **Restrained** — tinted neutrals plus one calm primary and one warm accent; saturation is earned, never decorative.

## Color

OKLCH throughout. Tints are derived with `color-mix` against the brand/warm hues, never gray-on-color.

### Light (default)

| Token | OKLCH | Role |
|---|---|---|
| `--bg` | `oklch(0.984 0.008 83)` | App background (soft warm white, low chroma) |
| `--surface` / `--panel` | `oklch(0.997 0.004 83)` | Cards, panels, sheets |
| `--surface-sunken` / `--soft` | `oklch(0.949 0.012 80)` | Inputs, sunken wells, hover fills |
| `--ink` | `oklch(0.30 0.022 65)` | Primary text (≥10:1 on bg) |
| `--muted` | `oklch(0.505 0.018 68)` | Secondary text (≥4.6:1 on bg) |
| `--line` | `oklch(0.90 0.012 78)` | Hairline borders |
| `--brand` | `oklch(0.60 0.072 190)` | Primary: calm eucalyptus-teal — trust, actions, selection |
| `--brand-strong` | `oklch(0.50 0.078 192)` | Brand hover/pressed, on-light text |
| `--warm` | `oklch(0.74 0.128 47)` | Human accent: apricot — encouragement, highlights, focus moments |
| `--warm-strong` | `oklch(0.64 0.15 42)` | Warm hover, warm text on light |
| `--success` | `oklch(0.64 0.11 150)` | Positive / rest / good signals |
| `--joy` | `oklch(0.82 0.10 88)` | Wins, gentle celebration (soft, never neon) |
| `--danger` | `oklch(0.60 0.17 27)` | Errors, high burnout, crisis |

### Dark (low-glare, warm charcoal)

`--bg oklch(0.20 0.012 80)`, `--surface oklch(0.245 0.012 80)`, `--soft oklch(0.30 0.014 80)`, `--ink oklch(0.95 0.012 85)`, `--muted oklch(0.74 0.016 80)`, `--line oklch(0.36 0.014 80)`, `--brand oklch(0.78 0.08 188)`, `--warm oklch(0.80 0.11 50)`, semantics brightened to keep ≥4.5:1.

### State vocabulary

Standardized across every interactive element: default, hover (lift + slightly stronger fill), focus-visible (2px `--brand` ring at 45% + 2px offset), active (scale 0.97), disabled (62% opacity, no pointer), selected (brand-tint fill + brand border), loading (skeleton, not spinner), error (`--danger` text + tinted field).

## Typography

Three families, paired on a contrast axis (soft serif + humanist sans + handwriting), loaded via `next/font` and exposed as CSS variables.

- **Display — Fraunces** (`--font-display`): soft optical serif. Used for emotional/large headings (landing hero, section titles, check-in prompts). Carries the warmth. `font-optical-sizing: auto`, weight 400–600, letter-spacing ≥ -0.02em, `text-wrap: balance`.
- **Body / UI — Plus Jakarta Sans** (`--font-sans`): friendly humanist sans. All UI: body, labels, buttons, inputs, data. Weight 400/500/600/700. Fixed rem scale (1.2 ratio), not fluid, except the landing hero.
- **Handwriting — Caveat** (`--font-hand`): kept only for the guestbook wall's handwritten notes.

Scale (rem): 0.78 / 0.875 / 1 / 1.125 / 1.35 / 1.65 / 2.1 / 2.7. Body line-length capped 65–75ch. No all-caps body; uppercase only for ≤3-word labels.

## Motion

150–250ms, ease-out (`cubic-bezier(0.22, 1, 0.36, 1)`). Motion conveys state and softens transitions; it never performs. Section changes crossfade + small rise; cards lift 2px on hover; the brand orb breathes slowly; the "Calm Now" overlay uses a slow expand/contract breathing guide. Every animation has a `prefers-reduced-motion: reduce` fallback (crossfade or instant). No bounce, no elastic, no page-load choreography on the product shell.

## Layout

- Phone-first. App shell: soft topbar (brand + status + controls) → calm primary nav → one focused section view at a time. Generous gutters (`clamp(16px, 4vw, 32px)`), max content width ~960px for focus, ~1100px for the map.
- Cards used only as real affordances (an entry, a tool); never nested. Responsive grids via `repeat(auto-fit, minmax(min(100%, 280px), 1fr))`.
- Semantic z-index scale: base → nav (10) → sticky (20) → overlay-backdrop (100) → overlay (110) → toast (200) → pet (50).

## Components (preserved, restyled — do NOT rewire)

The oneko pet, the Settings/API auto-detect provider system, and the ChatGPT-style chat model picker keep their existing logic and storage exactly; only their styling inherits the new tokens. All existing features (journal, AI insight bubbles, canvas map, companion chat + live voice, guestbook, relief room, scan, weekly report) keep their wiring; class names stay stable so nothing breaks.

## New surfaces

- **10-second check-in**: a single calm screen — pick a mood face, optional one-tap energy/sleep — that writes a real entry. The always-available low-energy path.
- **Education + joy (not brainrot)**: gentle, real-data features that help studying and lift mood without doom-scroll mechanics — e.g. AI active-recall micro-quiz from the student's own study context, and a "Proof of Progress" wins view derived from real entries. Quiet celebration, never confetti spam.
