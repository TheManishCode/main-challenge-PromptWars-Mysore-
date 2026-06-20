# Main Challenge Production Rules

These rules apply to every change inside `main_challenge/`.

## Scope Control

- Work only inside `main_challenge/` for the leaderboard submission.
- Do not modify `warmup/`, root workspace files, or unrelated directories unless the user explicitly asks.
- Push or deploy only the `main_challenge/` project contents.
- Keep `CONTEXT.md` accurate after material changes and verification runs.

## Challenge Alignment

- The active challenge is **Mental Wellness Tracker**, not the stale cooking prompt.
- The product must help students preparing for NEET, JEE, CUET, CAT, GATE, UPSC, board exams, or similar high-pressure tests.
- Core behavior must include mood logging, open-ended journaling analysis, hidden stress trigger detection, emotional pattern detection, personalized coping strategies, mindfulness exercises, and conversational support.
- Do not add mock journals, fake students, fake analysis, or generated sample data to make the UI look full.

## Security

- Never hardcode API keys, database URLs, tokens, secrets, credentials, private user content, or deployment-only config.
- Keep `.env*`, `.vercel`, local database files, logs, and generated secret material out of git.
- Gemini calls must happen server-side only.
- Browser code must never read or receive `GEMINI_API_KEY`, `DATABASE_URL`, or raw session secrets.
- Validate every API input with an explicit schema before model or database calls.
- Bound all user-controlled strings and numeric ranges.
- Use parameterized database queries only.
- Store only hashed anonymous session identifiers.
- Use HttpOnly, SameSite cookies and `secure` cookies in production.
- Reject cross-origin writes when `APP_ORIGIN` is configured.
- Rate-limit expensive AI endpoints.
- Do not log raw journal content, API keys, connection strings, cookies, or model prompts in production.

## Mental Health Safety

- The app is a wellness companion, not a therapist, doctor, diagnosis engine, or emergency service.
- Never diagnose a student, prescribe medication, or claim medical certainty.
- Crisis or self-harm language must trigger immediate escalation guidance before ordinary AI analysis.
- Crisis guidance must direct the user to emergency services, a trusted person, and the India KIRAN helpline `1800-599-0019`.
- Do not over-personalize beyond facts the student actually provided.
- Do not invent hidden trauma, family problems, diagnoses, or events.

## AI Reliability

- Use structured model output for journal analysis.
- If Gemini, database, validation, or config fails, return an honest error; never silently replace it with mock output.
- Keep model prompts grounded in the current request and recent stored entries only.
- Do not claim the app has reviewed data that is not actually persisted or retrieved.
- Do not hallucinate API signatures. Verify package usage from installed packages or official docs before changing integrations.

## Vercel Readiness

- Production must be deployable with one click after setting environment variables.
- Production persistence must use a managed database through `DATABASE_URL`.
- Do not rely on local filesystem writes for production state.
- Keep `vercel.json`, `next.config.mjs`, `.env.example`, and `README.md` current with deployment assumptions.
- Build must pass with `npm run build`.

## Backend Quality

- Prefer small pure functions for validation, safety checks, and persistence boundaries.
- Keep route handlers thin: validate, authorize/rate-limit, call domain logic, return JSON.
- Avoid global mutable state for production data. In-memory state is allowed only as a local development fallback.
- Use clear status codes: `400` for invalid input, `403` for blocked origin, `429` for rate limits, `500` for server config or dependency errors.
- Do not swallow errors that graders need to see.

## Frontend Quality

- Build the real app as the first screen, not a landing page.
- Keep empty states honest instead of using demo content.
- Ensure forms are keyboard usable, labelled, responsive, and readable on mobile.
- Do not expose implementation details, secrets, stack traces, or raw prompts in the UI.

## Verification

- After meaningful changes, run the narrowest relevant test first, then the full verify command before handoff.
- Required final check: `npm run verify`.
- Record verification results in `CONTEXT.md`.
- If verification cannot run, document the exact blocker honestly.
