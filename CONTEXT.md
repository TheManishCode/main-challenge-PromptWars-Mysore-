# Main Challenge Context: Mental Wellness Tracker

This file tracks the active context, implementation state, and verification logs for the **PromptWars Main Challenge**.

## Challenge Description

Build a Generative AI-powered solution that helps students monitor and improve their mental well-being during high-stakes board exams and competitive entrance tests such as NEET, JEE, CUET, CAT, GATE, and UPSC.

The solution must analyze open-ended daily journaling and mood logs to uncover hidden stress triggers and emotional patterns that standard trackers miss. It should also use conversational AI to provide contextual wellness support, such as tailored coping strategies, adaptive mindfulness exercises, and motivational encouragement, while acting safely as an empathetic digital companion.

## Current Implementation

- Next.js app router project under `main_challenge/`.
- Vercel config present in `vercel.json`.
- Gemini integration is server-side only through Vercel AI SDK and `@ai-sdk/google` in `src/lib/gemini.js`.
- Journal analysis API: `POST /api/entries`, `GET /api/entries`.
- Companion chat API: `POST /api/chat`.
- Persistence layer uses Postgres through `DATABASE_URL` in production.
- Journal text is encrypted with AES-256-GCM before storage.
- Local development without `DATABASE_URL` uses in-memory storage only and does not seed mock data.
- Production authentication uses Clerk when its environment variables are present; local development can use HttpOnly anonymous dev sessions.
- Every stored wellness entry records a hashed user key and hashed login session key so logs remain scoped to the signed-in Clerk identity and active session without storing raw session ids.
- Input validation uses Zod schemas.
- Safety layer detects crisis language before ordinary model calls.
- Security layer includes same-origin write checks and Upstash-backed production rate limiting.
- Vercel Cron hook exists at `/api/cron/patterns`.

## Required Environment

- `GEMINI_API_KEY`: required for AI journal analysis and companion chat.
- `DATABASE_URL`: required in production for persistence.
- `APP_ORIGIN`: required in production for same-origin write protection.
- `DATA_ENCRYPTION_KEY`: required in production for journal encryption.
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`: required in production for authentication.
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`: required in production for rate limiting.
- `CRON_SECRET`: required in production for cron authorization.
- `SESSION_SECRET`: optional local/import secret for session-adjacent integrations; Clerk remains the production session authority.
- `SESSION_COOKIE_NAME`: optional, defaults to `mindtrail_session`.
- `GEMINI_MODEL`: optional, defaults to `gemini-2.5-flash`.

## Local Development — Test Sessions

Local dev works **without Clerk**. When `CLERK_SECRET_KEY` and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` are absent, `getActor()` in `src/lib/auth.js` automatically falls back to an anonymous HttpOnly dev session managed by `src/lib/session.js`. A `mindtrail_session` cookie is issued on first request. No login required — any evaluator can visit `http://localhost:3000` and use all features immediately.

To test with Clerk authentication, set the four Clerk env vars in `.env.local` and use the Sign In / Sign Up buttons in the UI header.

## Implementation Progress

- [x] Correct stale challenge context from cooking app to mental wellness tracker.
- [x] Initialize production-oriented Next.js project.
- [x] Add secure server-side Gemini analysis and chat logic.
- [x] Add Postgres persistence boundary with local development fallback.
- [x] Add validation, crisis detection, same-origin checks, and rate limiting.
- [x] Add Clerk production auth, AES-GCM journal encryption, Upstash rate limiting, and Vercel Cron hook.
- [x] Update Clerk integration to current App Router pattern with `proxy.js`, `ClerkProvider` inside `<body>`, and `Show` auth controls.
- [x] Add hashed login-session tracking to persisted wellness entries.
- [x] Create ignored local test instance env files for Gemini, Neon, Clerk, Upstash, encryption, and cron secrets.
- [x] Build responsive first-screen application UI with honest empty states.
- [x] Add test session documentation to CONTEXT.md so any evaluator can use the app without configuring Clerk.
- [x] Install dependencies and generate lockfile.
- [x] Run lint, tests, and production build.

## Verification Logs

- **Last Run Verification**: 2026-06-20
- **Status**: Passed
- **Command Used**: `npm run verify`
- **Output/Results**: ESLint passed. Vitest passed with 2 test files and 4 tests. `next build` passed with routes `/`, `/api/chat`, `/api/cron/patterns`, and `/api/entries`. Build loaded ignored local `.env.local` and `.env` for the test instance.
