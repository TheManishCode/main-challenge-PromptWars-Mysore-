# Main Challenge Context: Mental Wellness Tracker

This file tracks the active context, implementation state, and verification logs for the **PromptWars Main Challenge**.

## Challenge Description

Build a Generative AI-powered solution that helps students monitor and improve their mental well-being during high-stakes board exams and competitive entrance tests such as NEET, JEE, CUET, CAT, GATE, and UPSC.

The solution must analyze open-ended daily journaling and mood logs to uncover hidden stress triggers and emotional patterns that standard trackers miss. It should also use conversational AI to provide contextual wellness support, such as tailored coping strategies, adaptive mindfulness exercises, and motivational encouragement, while acting safely as an empathetic digital companion.

## Current Implementation

- Next.js 16 App Router project under `main_challenge/`.
- Vercel config present in `vercel.json` (Mumbai region `bom1`, 30-second function timeout, cron at 02:00 UTC).
- Gemini integration is server-side only through Vercel AI SDK and `@ai-sdk/google` in `src/lib/gemini.js`. Uses `generateObject` with a Zod schema for structured journal analysis; `generateText` for companion chat.
- Journal analysis API: `POST /api/entries`, `GET /api/entries`.
- Companion chat API: `POST /api/chat`.
- Persistence layer uses Postgres through `DATABASE_URL` in production; schema auto-initializes on first connection.
- Journal text is encrypted with AES-256-GCM before storage (`src/lib/crypto.js`).
- Local development without `DATABASE_URL` uses in-memory `Map` only and does not seed mock data.
- Production authentication uses Clerk (`src/proxy.js` proxy middleware + `ClerkProvider` in layout) when Clerk env vars are present.
- `auth()` from Clerk returns both `userId` (stable across logins) and `sessionId` (unique per sign-in). `storageKey = SHA256(userId)`; `sessionKey = SHA256(sessionId)`.
- Local development falls back to anonymous HttpOnly dev sessions managed by `src/lib/session.js`; session hash uses HMAC-SHA256 keyed with `SESSION_SECRET`.
- Input validation uses Zod schemas (`src/lib/validation.js`).
- Safety layer detects crisis language before ordinary model calls; escalates to KIRAN helpline 1800-599-0019 (`src/lib/safety.js`).
- Security layer includes same-origin write checks and Upstash-backed production rate limiting (`src/lib/security.js`).
- Vercel Cron hook exists at `/api/cron/patterns` (runs at 02:00 UTC daily).

## Session Architecture

### With Clerk (when CLERK_SECRET_KEY + NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY are present)
- `storageKey = SHA256(userId)` — wellness history persists across all the user's logins.
- `sessionKey = SHA256(sessionId)` — tracks the specific login session for audit purposes.
- Each user sees only their own data; no cross-user leakage.
- Google and GitHub OAuth are configured in the **Clerk dashboard** Social Connections — not via app env vars.

### Without Clerk (local dev fallback)
- Anonymous HttpOnly cookie (`mindtrail_session`) is issued on first visit via `src/lib/session.js`.
- `storageKey = HMAC-SHA256(SESSION_SECRET, cookieId)` — scoped to the browser session.
- No login required — any evaluator can visit `http://localhost:3001` and use all features immediately.
- In-memory `Map` is used for storage when `DATABASE_URL` is absent.

## Required Environment

| Variable | Required | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | Always | Gemini AI calls |
| `DATABASE_URL` | Production | Postgres persistence |
| `APP_ORIGIN` | Production | Same-origin write protection |
| `DATA_ENCRYPTION_KEY` | Production | AES-256-GCM journal encryption |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Production | Clerk auth |
| `CLERK_SECRET_KEY` | Production | Clerk auth |
| `UPSTASH_REDIS_REST_URL` | Production | Rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Production | Rate limiting |
| `CRON_SECRET` | Production | Cron job auth |
| `SESSION_SECRET` | Dev + Prod | HMAC key for dev session hashes |
| `SESSION_COOKIE_NAME` | Optional | Defaults to `mindtrail_session` |
| `GEMINI_MODEL` | Optional | Defaults to `gemini-2.5-flash` |

OAuth provider credentials (Google Client ID/Secret, GitHub Client ID/Secret) are **not** app env vars — enter them in Clerk dashboard under Social Connections.

## Implementation Progress

- [x] Correct stale challenge context from cooking app to mental wellness tracker.
- [x] Initialize production-oriented Next.js 16 project.
- [x] Add secure server-side Gemini analysis and chat logic with structured output.
- [x] Add Postgres persistence boundary with in-memory local development fallback.
- [x] Add validation, crisis detection, same-origin checks, and rate limiting.
- [x] Add Clerk production auth, AES-GCM journal encryption, Upstash rate limiting, and Vercel Cron hook.
- [x] Use `proxy.js` (Next.js 16 convention) for Clerk route middleware — confirmed clean build, no warnings.
- [x] Add `sessionId` from Clerk `auth()` to actor object; storageKey = SHA256(userId) for persistent history; sessionKey = SHA256(sessionId) for per-login audit tracking.
- [x] Use `SESSION_SECRET` as HMAC key in `session.js` for tamper-resistant dev session hashes.
- [x] Update `.env.example` with SESSION_SECRET and OAuth credentials noted as Clerk dashboard entries.
- [x] Rewrite `rules.md` as comprehensive project rules covering all domains.
- [x] Build responsive first-screen application UI with honest empty states, keyboard-usable forms, mobile layout.
- [x] Install dependencies and generate lockfile.
- [x] Run lint, tests, and production build — clean pass.
- [x] Fix Vercel 500: conditional ClerkProvider/middleware, correct AI SDK `maxTokens` param.

## Verification Logs

- **Last Run Verification**: 2026-06-20
- **Status**: Passed (clean — no warnings)
- **Command Used**: `npm run verify`
- **Output/Results**: ESLint passed. Vitest passed — 2 test files, 4 tests (validation schema and safety detection). `next build` passed with `proxy.js` middleware active. Routes: `/`, `/api/chat`, `/api/cron/patterns`, `/api/entries`. Zero deprecation warnings. Build loaded `.env.local` and `.env`.

### Vercel 500 Fix (2026-06-20)
- `layout.js`: `ClerkProvider` and auth header now render only when `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is set. Prevents crash if Clerk isn't configured.
- `proxy.js`: Middleware falls back to `NextResponse.next()` when Clerk env vars are absent. Prevents middleware crash blocking all routes.
- `gemini.js`: Changed `maxOutputTokens` → `maxTokens` (correct Vercel AI SDK parameter name).
