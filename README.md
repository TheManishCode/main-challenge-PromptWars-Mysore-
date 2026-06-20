# MindTrail

MindTrail is the main PromptWars challenge submission for the **Mental Wellness Tracker** problem statement. It helps students preparing for high-stakes exams log daily mood and journal entries, then uses Gemini server-side to identify stress triggers, emotional patterns, coping strategies, mindfulness resets, and motivational support.

## Production Features

- Next.js app router ready for one-click Vercel deployment.
- Vercel AI SDK with the Google provider; Gemini runs server-side only and the API key is never exposed to the browser.
- Validated journal and chat inputs with bounded lengths and numeric ranges.
- Clerk authentication in production; local development can run with an anonymous dev session.
- Postgres persistence through `DATABASE_URL`; production fails honestly if the database is missing.
- AES-256-GCM encryption for journal text before storage.
- Upstash-backed rate limiting in production for journal analysis and companion chat routes.
- Same-origin write protection through `APP_ORIGIN`.
- Crisis-language pre-check that escalates to real human support instead of sending unsafe content to the model.
- Vercel Cron hook at `/api/cron/patterns` for scheduled pattern analysis expansion.
- No mock wellness data, seeded examples, or hardcoded secrets.

## Environment

Create Vercel environment variables from `.env.example`:

```bash
GEMINI_API_KEY=your_key
DATABASE_URL=your_postgres_connection_string
APP_ORIGIN=https://your-vercel-domain.vercel.app
SESSION_COOKIE_NAME=mindtrail_session
DATA_ENCRYPTION_KEY=base64_32_byte_key
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
UPSTASH_REDIS_REST_URL=your_upstash_rest_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_rest_token
CRON_SECRET=your_random_cron_secret
```

`GEMINI_MODEL` is optional and defaults to `gemini-2.5-flash`.

Generate a valid encryption key with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Deploy

Push only this `main_challenge/` project to the deployment repository, then import that repo in Vercel. Add the Neon or Supabase Postgres, Clerk, Upstash Redis, and Gemini environment variables above before the first production deploy.

## Local Development

```bash
npm install
npm run dev
```

Without `DATABASE_URL`, local development uses process memory only. Production requires `DATABASE_URL`.

## Verification

```bash
npm run verify
```

This runs linting, unit tests, and the production build.
