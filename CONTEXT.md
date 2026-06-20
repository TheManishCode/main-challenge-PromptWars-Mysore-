# Main Challenge Context: Journal + AI Companion

This file tracks the active context, implementation state, and verification logs for the PromptWars Main Challenge.

## Challenge Description

Build a Generative AI-powered solution that helps students monitor and improve their mental well-being during high-stakes board exams and competitive entrance tests such as NEET, JEE, CUET, CAT, GATE, and UPSC.

The current product direction is a private journal plus AI companion: authenticated users write daily entries, invoke per-entry AI suggestion bubbles, chat with a companion that has their full journal history as context, and leave notes on a shared handwritten guestbook wall.

## Current Implementation

- Next.js 16 App Router project under `main_challenge/`.
- Vercel config present in `vercel.json` (Mumbai region `bom1`, 30-second function timeout, cron at 02:00 UTC).
- Auth-first product shell in `src/app/page.js`: users must sign up/log in or use the tester login before app access.
- Auth screen includes a tester login button that creates a signed HttpOnly app session through `POST /api/tester`; no credentials are exposed in the frontend and tester mode does not depend on Clerk.
- Clerk is the primary auth provider. `src/app/layout.js` conditionally mounts `ClerkProvider`; `src/proxy.js` provides Clerk request context while API authorization is enforced in `getActor()`.
- `getActor()` accepts either a Clerk session or a signed tester session and returns hashed `storageKey`/`sessionKey` values.
- If Clerk env vars are missing, tester login remains available while Clerk sign-in/sign-up controls are hidden.
- Gemini integration is server-side only through Vercel AI SDK and `@ai-sdk/google` in `src/lib/gemini.js`.
- Persistence uses Postgres through `DATABASE_URL` in production. The schema auto-initializes on first DB connection.
- Local development without `DATABASE_URL` uses in-memory adapters, but API access still requires Clerk auth.
- Journal text is encrypted with AES-256-GCM before storage (`src/lib/crypto.js`).
- Input validation uses Zod schemas (`src/lib/validation.js`).
- Safety layer detects crisis language before ordinary model calls and escalates to KIRAN helpline 1800-599-0019 (`src/lib/safety.js`).
- Security layer includes same-origin write checks and Upstash-backed production rate limiting (`src/lib/security.js`).
- Vercel Cron hook exists at `/api/cron/patterns` (runs at 02:00 UTC daily).

## Product Surface

- Auth: Clerk sign-in/sign-up first screen when configured, standalone tester login, plus first-run onboarding.
- Tester login: one-click signed app session with a clearly labeled tester profile popover and sign-out control; it is intentionally independent of Clerk.
- Journal: mood, energy, sleep, exam focus, encrypted journal entry, Gemini analysis summary, and history.
- Invoke Suggestions: `POST /api/entries/[id]/insights` generates saved speech-bubble insight cards for one journal entry.
- Insight taxonomy: `Mood`, `Pattern`, `Suggestion`, `Highlight`, each with a fixed accent color.
- Bubble UI: diagonal corner tags, speech-bubble tails, variable height, and CSS masonry columns.
- Chat: `POST /api/chat` stores messages in a chat thread and calls Gemini with the user's complete available journal history, including decrypted journal text, as server-side context.
- Guestbook: `GET/POST /api/guestbook` powers a shared authenticated note wall with stored rotation, scale, offset, and note color for stable scattered layout.
- Theme: light/dark toggle implemented through CSS variables.

## Data Model

Postgres tables created in `src/lib/db.js`:

- `wellness_entries`: user-scoped journal metadata, encrypted raw text, and structured analysis.
- `journal_insights`: per-entry AI insight bubbles with category, text, and accent.
- `chat_threads`: one or more user-scoped companion chat threads.
- `chat_messages`: user-scoped stored student/companion messages.
- `guestbook_posts`: shared authenticated guestbook notes with stable layout metadata.

## Required Environment

| Variable | Required | Purpose |
|---|---|---|
| `GEMINI_API_KEY` | Always | Gemini AI calls |
| `DATABASE_URL` | Production | Postgres persistence |
| `APP_ORIGIN` | Production | Same-origin write protection |
| `DATA_ENCRYPTION_KEY` | Production | AES-256-GCM journal encryption |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Production user auth | Clerk auth |
| `CLERK_SECRET_KEY` | Production user auth | Clerk auth |
| `TESTER_LOGIN_SECRET` | Production tester access | Signs the tester session cookie |
| `UPSTASH_REDIS_REST_URL` | Production | Rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Production | Rate limiting |
| `CRON_SECRET` | Production | Cron job auth |
| `GEMINI_MODEL` | Optional | Defaults to `gemini-2.5-flash` |

OAuth provider credentials (Google Client ID/Secret, GitHub Client ID/Secret) are not app env vars. Configure them in the Clerk dashboard under Social Connections.

## Implementation Progress

- [x] Correct stale challenge context from cooking app to mental wellness tracker.
- [x] Initialize production-oriented Next.js 16 project.
- [x] Add secure server-side Gemini analysis and chat logic with structured output.
- [x] Add Postgres persistence boundary with in-memory local development adapter.
- [x] Add validation, crisis detection, same-origin checks, and rate limiting.
- [x] Add Clerk auth, AES-GCM journal encryption, Upstash rate limiting, and Vercel Cron hook.
- [x] Remove anonymous dev-session access and require Clerk auth before app/API access.
- [x] Add tester login without exposing credentials in the frontend.
- [x] Harden Gemini journal analysis schema so partial structured output is normalized instead of failing with "No object generated".
- [x] Add product-grade journal, chat, guestbook, onboarding, and navigation shell.
- [x] Add per-entry AI insight bubbles with fixed taxonomy and masonry speech-bubble UI.
- [x] Add chat thread/message persistence and full-journal context for companion chat.
- [x] Add authenticated shared guestbook with handwritten scattered note wall.
- [x] Update README and `.env.example` to match auth-first architecture.

## Verification Logs

- Last Run Verification: 2026-06-20
- Status: Passed for lint, tests, and build after AI schema hardening.
- Commands:
  - `npm run lint`
  - `npm.cmd run test`
  - `npm.cmd run build`
- Results:
  - ESLint passed.
  - Vitest passed: 6 test files, 44 tests.
  - `next build` passed.
  - Routes include `/api/tester`, `/api/entries`, `/api/entries/[id]/insights`, `/api/chat`, `/api/guestbook`, and the additional wellness APIs.

## Major Rebuild (2026-06-20)

- `auth.js`: Actor resolution requires Clerk users; anonymous dev-session fallback remains removed.
- `proxy.js`: Provides Clerk request context for app and API routes.
- `db.js`: Added `journal_insights`, `chat_threads`, `chat_messages`, and `guestbook_posts` persistence plus in-memory dev adapters.
- `gemini.js`: Added `generateEntryInsights(entry)`, expanded `chatWithCompanion()` to use full journal context, and normalized journal analysis fields so strict AI schema mismatches do not break entry creation.
- `validation.js`: Added `entryInsightSchema` and `guestbookSchema`.
- `api/entries/[id]/insights/route.js`: New per-entry AI insight generation endpoint.
- `api/guestbook/route.js`: New shared authenticated guestbook API.
- `api/chat/route.js`: Now stores chat messages and sends complete available journal history to Gemini.
- `page.js`: Complete product rebuild with auth setup state, onboarding, journal, chat, guestbook, and theme toggle.
- `page.js`: Auth screen includes tester login button that creates a standalone tester session, plus a tester profile menu with sign-out.
- `api/tester/route.js`: Creates and clears a signed HttpOnly tester session cookie.
- `globals.css`: Complete visual redesign with light/dark tokens, masonry insight bubbles, and handwritten guestbook wall.
- `lib/tester-session.js`: Signs and verifies standalone tester sessions without storing evaluator credentials or calling Clerk.
