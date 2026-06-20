# MindTrail — Project Rules

> **Always read `rules.md` and `CONTEXT.md` before starting any task. Update `CONTEXT.md` after every meaningful change or verification run.**

---

## Prime Directives

1. **No hard coding.** No API keys, URLs, secrets, credentials, or config values in source files.
2. **No mock data.** No fake journals, fake users, fake analysis, or seeded sample data at any layer.
3. **Auth — provide test sessions.** Local dev must support anonymous HttpOnly dev sessions so any tester can visit and use all features without setting up Clerk. Document test session behavior in CONTEXT.md.
4. **No hallucination.** Do not invent API shapes, package signatures, or behavior. Verify from installed packages or official docs before use.
5. **Test every aspect thoroughly.** No feature is complete without covering the happy path and key failure paths. Production must be smooth.
6. **Update context at each phase.** After any material implementation step or verification run, update CONTEXT.md with what changed and the latest verification result.
7. **Docs stay current.** README, CONTEXT.md, .env.example, and architecture notes must reflect the actual running state, not a past or planned state.
8. **Always push to GitHub after commits.** Remote: `git@github-work:TheManishCode/main-challenge-PromptWars-Mysore-.git` (SSH alias `github-work` → `github.com` using `~/.ssh/id_ed25519_themanishcode`). Run `git push origin main` from inside `main_challenge/` after every commit.

---

## Architecture

- Maintain a clean monorepo structure.
- No duplicate implementations of the same feature.
- No dead code, unused files, unused packages, unused components, or unused APIs. Remove them immediately.
- Refactor aggressively when duplication appears.
- Strict separation of concerns: UI, business logic, AI logic, database access, authentication, and infrastructure must remain isolated.
- No direct database access from UI components.
- No AI SDK calls from client components.
- All sensitive operations must execute server-side.

---

## Challenge Alignment

- The active challenge is **Mental Wellness Tracker** for high-stakes exam students (NEET, JEE, CUET, CAT, GATE, UPSC, board exams).
- Core behavior: mood logging, journaling analysis, hidden stress trigger detection, emotional pattern detection, personalized coping strategies, mindfulness exercises, and conversational support.
- Do not add mock journals, fake students, fake analysis, or generated sample data.

---

## Code Quality

- TypeScript strict mode must remain enabled where applicable.
- No `any`. No `ts-ignore` unless absolutely unavoidable.
- All functions must be typed.
- All API responses must have schemas.
- Use Zod for runtime validation. Fail fast on invalid inputs.
- Prefer composition over inheritance.
- Keep files focused and small.
- Remove obsolete code immediately.
- Default to writing no comments. Only add one when the WHY is non-obvious.

---

## Security

- Never expose secrets to the client.
- Never commit `.env*` files.
- Validate every request at the API boundary.
- Validate all environment variables on startup (or on first use).
- Use secure HttpOnly, SameSite cookies.
- Use CSRF-equivalent same-origin write protection (`assertSameOrigin`).
- Use rate limiting on all AI endpoints.
- Sanitize and bound all user-controlled strings and numeric ranges.
- Use parameterized queries only — no raw SQL string interpolation.
- Prevent XSS, SQL injection, SSRF, open redirects, privilege escalation, and prompt injection.
- Apply least-privilege access everywhere.
- Do not log raw journal content, API keys, connection strings, cookies, or model prompts in production.
- `GEMINI_API_KEY`, `DATABASE_URL`, `CLERK_SECRET_KEY`, and `DATA_ENCRYPTION_KEY` must never reach the browser.
- Security headers applied globally: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.

---

## Authentication

- Support Clerk-based Google OAuth and email auth in production.
- Support anonymous HttpOnly dev sessions in local development so testers can visit without Clerk configured.
- Store only hashed anonymous session identifiers — never the raw session ID.
- Use refresh token rotation; invalidate compromised sessions.
- Implement session expiration (30-day max-age for dev sessions).
- Protect all authenticated routes; enforce role-based authorization.
- Document test session behavior in CONTEXT.md so any evaluator can use the app immediately.

---

## AI Safety

- AI must never claim to be a therapist, doctor, or crisis service.
- AI must never provide medical diagnosis or prescribe medication.
- Detect crisis language (self-harm, suicidal ideation, abuse) before any model call.
- Crisis response must direct the user to emergency services, a trusted person, and India KIRAN helpline `1800-599-0019`.
- Do not over-personalize beyond facts the student actually provided in the current session.
- Do not invent hidden trauma, family problems, diagnoses, or events.
- Use structured model output (`generateObject` with Zod schema) for journal analysis.
- Log AI failures; never silently replace a failure with mock output.
- Prevent prompt injection: bound and sanitize all user-supplied text sent into prompts.

---

## Database

- PostgreSQL only in production.
- Use parameterized queries (`pg` Pool with `$1` placeholders).
- Run schema init on first connection; no manual migration step required for dev.
- No raw SQL string interpolation.
- Use transactions for critical multi-step operations.
- Add indexes for frequently queried fields (e.g., `user_key, created_at DESC`).
- Encrypt sensitive user content (journal text) with AES-256-GCM before storage.
- Local dev without `DATABASE_URL` uses an in-memory `Map` fallback (no filesystem writes).
- Production must use a managed Postgres service (Neon, Supabase, etc.) via `DATABASE_URL`.

---

## API Standards

- Return consistent JSON response shapes: `{ data }` on success, `{ error }` on failure.
- Use clear status codes: `400` invalid input, `401` unauthenticated, `403` forbidden origin, `429` rate limited, `500` server/config error.
- Implement centralized error handling via `jsonError` — never expose stack traces to callers.
- Implement same-origin write protection on all mutation endpoints.
- Implement rate limiting on all AI endpoints.
- Validate every request body with a Zod schema before any downstream call.
- Never expose internal error details, connection strings, or prompt content in error responses.

---

## Performance

- Server components by default; minimize client-side JavaScript.
- Lazy load heavy modules where possible.
- Optimize AI calls: bound prompt length, cap output tokens.
- Cache aggressively where safe (Upstash Redis for rate limit state).
- Eliminate unnecessary re-renders.

---

## Monitoring (production targets)

- Sentry for error tracking.
- PostHog for product analytics.
- Structured logging required.
- Health checks required.
- Uptime monitoring required.
- Audit logging for sensitive operations.

---

## Testing

- Critical business logic must be tested (validation schemas, safety detection).
- API route behavior must be tested.
- Authentication flows must be tested.
- AI safety flows must be tested (crisis detection, escalation).
- No feature is considered complete without tests.
- Required verify command before handoff: `npm run verify` (lint + test + build).
- Record verification results in CONTEXT.md.

---

## Accessibility

- WCAG compliance.
- Keyboard navigation support for all interactive elements.
- Proper semantic HTML (labels, headings, landmarks).
- ARIA labels where required.
- Color contrast compliance.
- Forms must be keyboard usable, labelled, responsive, and mobile readable.

---

## Deployment

- Production builds must pass without warnings: `npm run build`.
- No hardcoded URLs. No `localhost` references in production paths.
- All environment variables validated before use; fail loudly if missing in production.
- Vercel-ready: one-click deploy after setting env vars.
- No local filesystem writes for production state.
- Health checks pass before deployment.
- Rollback strategy: redeploy prior Vercel build.

---

## Documentation

- Keep `README.md` updated with setup, env vars, and deploy instructions.
- Keep `CONTEXT.md` accurate after every material change or verification run.
- Keep `.env.example` current with all required and optional variables.
- Document architecture decisions inline in CONTEXT.md.
- Document AI workflow and safety guardrails.

---

## Clean Code Enforcement

- If code becomes redundant, remove it.
- If a file becomes obsolete, delete it.
- If a dependency is unused, uninstall it.
- If two implementations exist, consolidate them.
- Prefer the simplest production-ready solution.
- Always leave the codebase cleaner than before.

---

## Mental Wellness Domain Rules

- Privacy-first design.
- User data ownership — users can delete all their data.
- Explicit consent for AI analysis.
- Explain why AI generated each insight where possible.
- Allow users to export all their data.
- Store minimum necessary personal information.
- Never use user journals for model training.
- Journal text encrypted at rest with AES-256-GCM.

---

## Scope Control

- Work only inside `main_challenge/` for the leaderboard submission.
- Do not modify `warmup/`, root workspace files, or unrelated directories unless explicitly asked.
- Push or deploy only `main_challenge/` project contents.
