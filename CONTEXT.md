# Main Challenge Context: Journal + AI Companion

This file tracks the active context, implementation state, and verification logs for the PromptWars Main Challenge.

## Challenge Description

Build a Generative AI-powered solution that helps students monitor and improve their mental well-being during high-stakes board exams and competitive entrance tests such as NEET, JEE, CUET, CAT, GATE, and UPSC.

The current product direction is a private journal plus AI companion: authenticated users write daily entries, invoke per-entry AI suggestion bubbles, inspect a canvas graph map of their journal/insight connections, chat with a companion that has their full journal history as context, and leave notes on a shared handwritten guestbook wall.

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
- Map: canvas-based graph view draws journal history, entries, and generated insight bubbles as connected hoverable nodes.
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
| `GEMINI_VOICE_MODEL` | Optional | Model override for live voice conversation; defaults to `GEMINI_MODEL` (`gemini-2.5-flash`) |

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
- [x] Add canvas graph map for journal entries and insight relationships.
- [x] Add chat thread/message persistence and full-journal context for companion chat.
- [x] Add authenticated shared guestbook with handwritten scattered note wall.
- [x] Update README and `.env.example` to match auth-first architecture.

## Major Feature Update (2026-06-21)

### Empathetic AI Chat
- `chatWithCompanion()` system prompt rewritten to be Socratic and question-first.
- AI reflects what it heard, acknowledges pain before offering anything, ends every response with a genuine question.
- Never lectures, never lists tips unprompted.

### Voice Journal
- Web Speech API mic button inside the journal textarea.
- Dictates into the journal field in real-time; appends transcribed text.
- Shows "Listening..." hint with pulsing animation.

### Voice Mode Root-Cause Fix (2026-06-21)
- **Bug:** Voice (and Face Check camera) failed with `not-allowed` in *every* browser, not just Edge.
- **Root cause:** `next.config.mjs` sent a global `Permissions-Policy: camera=(), microphone=(), geolocation=()`. An empty allowlist `microphone=()` denies the mic to the origin itself, so `SpeechRecognition`/`getUserMedia` were blocked browser-wide regardless of OS or browser settings. Prior commits had mis-diagnosed this as an Edge/Windows speech setting.
- **Fix:** `Permissions-Policy: camera=(self), microphone=(self), geolocation=()` — mic and camera allowed for own origin; geolocation stays off (unused). Verified live: `curl -sI http://localhost:3001/` returns the corrected header.
- Re-enabled `interimResults = true` in `useSpeechInput` so dictation shows live word-by-word feedback (confirms recognition is working in real time).
- Hardened `start()`: detaches the previous recognizer's handlers and disables keep-alive before `abort()`, removing a race where a stale `onend` could auto-restart a discarded recognizer.
- Generalized `not-allowed`/`service-not-allowed` error messages (no longer blame Edge by default).

### Live Conversation Mode (2026-06-21)
- **Goal:** Hands-free, low-latency spoken conversation with the companion — like ChatGPT/Gemini voice — instead of one-shot dictation.
- **Launch:** "Conversation" button in the Chat section header (shown only when both `SpeechRecognition` and `speechSynthesis` are supported) opens a full-screen overlay with an animated status orb.
- **Turn loop (`ConversationMode`):** auto state machine `listening → thinking → speaking → listening`. Recognition runs single-shot per turn; on a final result it streams to the AI; the mic stays off while the AI speaks (no self-hearing); listening auto-resumes when speech ends.
- **Low latency via streaming:** new `POST /api/chat/voice` streams the reply token-by-token (`streamText` + `ReadableStream`). The client buffers incoming text into complete sentences (`takeSentence`) and feeds each sentence to TTS as soon as it is ready, so the companion starts talking ~1s in instead of waiting for the full reply.
- **Streaming TTS (`useSpeechOutput`):** queue-based `beginStream({ onEnd }).push(sentence)/end()` sink; picks a natural English voice (`pickVoice`), speaks sentence chunks back-to-back, and fires `onEnd` only after the stream ends and the queue drains. `pump` lives in a ref to satisfy the React Compiler immutability/refs lint rules.
- **Voice persona:** `streamCompanionReply()` uses a spoken-conversation system prompt — warm, validating, engaging, 1–3 sentences, offers ONE concrete small step when the student is stuck or asks, usually ends with a caring question, no markdown/lists (it is read aloud). Includes the last 8 chat turns for continuity plus recent journal context. `maxOutputTokens: 220` for snappy replies.
- **Controls:** tap orb to interrupt the AI (barge-in) and start speaking; Mute pauses listening; End closes. Crisis language is still detected server-side and the KIRAN helpline message is streamed/spoken.
- **Persistence:** the voice endpoint stores both student and companion messages in the same `chat_threads`/`chat_messages` thread as text chat; the overlay also appends turns to the shared in-memory `chatLog` so the text Chat tab stays in sync.

### Conversation Latency + Reply Quality Fixes (2026-06-21)
- **Root cause of "doesn't reply properly" + long delay:** the default model `gemini-2.5-flash` has **thinking enabled by default**. Thinking tokens (a) added 2–10s before the first word and (b) ate the small `maxOutputTokens` budget, so replies often came back empty or truncated.
- **Fix:** pass `providerOptions: { google: { thinkingConfig: { thinkingBudget: 0 } } }` on both `streamCompanionReply()` (voice) and `chatWithCompanion()` (text). Verified this is the correct option shape for the installed `@ai-sdk/google` v3. Replies are now proper, warm, and 1–3 sentences.
- **Dedicated low-latency voice model:** `getFastModel()` uses `GEMINI_VOICE_MODEL` (default `gemini-2.5-flash-lite`) for the live voice path; depth matters less than time-to-first-word there.
- **Reduced time-to-first-token in `/api/chat/voice`:** fetch chat history + journal entries in parallel and persist the student turn in the background (no longer awaited before streaming). Trimmed prompt context (last 6 turns, journal context capped at 3500 chars) to cut input tokens.
- **Chats now reload from the DB:** added `GET /api/chat` (returns the thread's stored messages); the client calls it on mount (`loadChat`) so prior conversations reappear after reload — previously messages were written to the DB but never loaded back into the UI, which made it look like nothing saved.
- **Measured (dev, tester session, fresh journal):** warm time-to-first-token ≈ 2–3s with replies streamed and spoken sentence-by-sentence; the first request after a code edit shows ~11s purely from Next dev recompiling the route (absent in production). Reply text verified non-empty and on-persona; `GET /api/chat` returns the persisted turns.

### Crisis Safety + Empathy/Helpfulness Rework (2026-06-21)
- **Safety gap fixed:** acute distress like "the overwhelming feeling of I might die" was NOT matched by `detectCrisis`, so it reached the chat model and got a casual "tell me more" reply instead of the crisis helpline. This is a serious failure for a wellness app.
- **`safety.js` crisis patterns broadened** to cover self-referential death/dying/harm: `i (might|will|could|gonna|going to) die`, `feel like dying`, `i'm dying` (excluding the idiom "dying to ..."), `suicidal`, `harm/cut myself`, `end it all`, `want to end it`, `can't live`, `not worth living`, `don't want to be here`, `kill me now`, etc. Tightened against common exam hyperbole so "this exam is killing me", "going to kill me", and "dying to see my results" stay non-crisis. Added Vitest coverage (now 45 tests).
- **Persona reworked from "Socratic deflection" to "empathetic + genuinely helpful":** the old prompts forbade advice and forced every reply to end with a probing question, producing hollow, theatrical validation ("oh wow, absolutely terrifying") and never helping the student. Both `streamCompanionReply()` (voice) and `chatWithCompanion()` (text) now: acknowledge feeling once, sincerely, without melodrama; then ANSWER the question or give one concrete, doable next step that lowers stress; help the student decide what/how to study (one topic, one ~25-min block); offer a brief grounding idea when panic shows; and only ask a follow-up when it truly moves them forward.
- **Verified live (tester session):** "What should I study today?" now yields a real plan-making reply; "I don't know" yields a concrete 25-minute starting suggestion; "I might die" now returns the KIRAN crisis message with the `X-Crisis` header. The voice route already runs `detectCrisis` before the model on every turn.

### Persona Tuned to Guided Discovery (2026-06-21)
- **Feedback:** the helpful-but-direct version handed students a finished plan ("do 25 minutes of Physics") — too much of a final-answer chatbot. The wanted behavior is a coach that talks with the student, asks useful/meaningful questions, understands their mindset, and walks them to their OWN answer.
- **Both personas (`streamCompanionReply` voice + `chatWithCompanion` text) retuned to purposeful guided discovery:** brief sincere empathy, then lead with curiosity that has a purpose — one meaningful, specific question per reply that deepens understanding of their situation/mindset and narrows them one step toward clarity. Explicitly forbids both hollow aimless questions ("tell me more", "what is underneath that") AND jumping straight to a finished plan. Builds on what they said so they feel understood; lets the student name the next step, which the coach then gently confirms or shapes. Still comforts/grounds first when panic shows. Voice replies 1–3 sentences; text 1–3 short paragraphs.
- **Verified live (4-turn flow):** "What should I study today?" → "which exam is closest for you?"; "I don't know" → "what feels like the biggest hurdle right now?"; "NEET in two months, biology scares me" → "what specifically about biology feels most overwhelming?"; "I keep forgetting what I read" → "what kind of things do you usually try to do?" — progressive, meaningful questions that build understanding instead of dispensing answers.

### Natural Turn-Taking + Barge-In + Fluid UI (2026-06-21)
- **Gemini/ChatGPT-style endpointing:** the conversation no longer loops the mic open forever. `useSpeechInput` now runs continuous recognition with an `onInterim` callback; `ConversationMode` drives its own endpointing — after ~1.3s of silence following speech it stops and responds (`SILENCE_MS`), and if nothing is said at all for ~9s it goes to a calm **idle** state ("Tap the orb when you want to talk", `NO_SPEECH_MS`) instead of sitting open and looking broken.
- **Barge-in (interrupt the AI):** while the companion is speaking, after a short delay (`BARGE_START_DELAY`) a listener opens so the user can talk over it; on real speech the AI's TTS is cancelled and the turn switches straight to listening. An echo filter (`looksLikeEcho`, word-overlap vs the AI's own streamed words, plus a min-length guard) prevents the AI from interrupting itself when the mic picks up its own voice on laptop speakers. Headphones still give the cleanest experience (hinted in the UI).
- **Model reliability fix:** the live voice path briefly used `gemini-2.5-flash-lite`, which returned empty streams once its free-tier quota was exhausted. `getFastModel()` now defaults to `GEMINI_MODEL` (`gemini-2.5-flash`, proven reliable); `GEMINI_VOICE_MODEL` still overrides. Verified voice replies non-empty across a 4-turn flow.
- **Conversation UI:** reactive orb with a live equalizer (animates while listening and speaking), idle/listening/thinking/speaking states, prominent live interim transcript, and a subhint about talking over the AI / using headphones.
- **Site-wide fluid motion (palette unchanged):** added a global motion layer in `globals.css` — animated section transitions (`.section-view` keyed by active section), card/stat/guest-note hover lift, button press/lift feedback, animated nav-pill active state, soft input focus glow, chat-bubble slide-in, smooth theme color transitions, and a `prefers-reduced-motion` guard that disables it all.

### Reusable Real-Time Voice Dictation (2026-06-22)
- Replaced the old append-only `useVoiceDictation`/`useFieldVoice` helpers with one canonical reusable hook: `useVoiceDictation({ targetInputRef, onChange, language, continuous })`.
- **True live dictation:** reads the field's value + caret position on start (`anchor = {before, after}`), then on each `onresult` commits finals and streams interim words, calling `onChange(before + committed + interim + after)` — so partial words appear in the field as you speak and finals replace interim cleanly, inserted at the caret without overwriting the rest. `interimResults` + `continuous` true, keep-alive restart, `network`-error retry, graceful unsupported fallback.
- New `<MicButton targetRef onChange>` component (idle 🎤 / live 🔴, "not supported" glyph fallback) dropped into every text field: journal, chat input, guestbook note, Pressure Valve, Worry Parking Lot. Reuses `.journal-textarea-wrap`/`.chat-input-wrap` relative wrappers; added `.mic-btn` styles.
- Chat input no longer batch-records-then-sends; it dictates live into the box and the user sends normally. `useSpeechRecognitionSupported()` gates the Conversation launch button.
- Verified: lint, 45 tests, build pass.

### Remotion LinkedIn Project Video (2026-06-23)
- Added a standalone Remotion video for the PromptWars Top 10 / LinkedIn post under `video/` (`index.js` registerRoot, `Root.jsx` Composition, `PromptWarsPost.jsx` the 1080×1080 / 30fps / 24s scene set: PromptWars hook → TOP 10 reveal → MindTrail showcase → feature bullets → CTA with verify link). Installed `@remotion/cli` (dev).
- Scripts: `npm run video:studio` (preview/edit) and `npm run video:render` (→ `out/promptwars-linkedin.mp4`, gitignored). Rendered output ~2.9 MB.
- **Important gotcha:** the folder must NOT be named `remotion/` — the project's `@/` path alias sets `baseUrl: "."`, so a bare `import 'remotion'` resolves to a top-level `remotion/` folder instead of the npm package, breaking the app build. Named it `video/` to avoid the collision. Editable post fields (`NAME`, `VERIFY_URL`) are constants at the top of `PromptWarsPost.jsx`.

### Hugging Face Provider Added (2026-06-23)
- Audited the universal provider/API-key/voice-dictation system against a spec that mandated a HuggingFace provider with `hf_` key detection. Everything else in the spec was already implemented (16+ provider presets, `/v1/models` dynamic fetch in `/api/list-models`, `selectBestModel` priority free → flash/mini/haiku/small/lite → first, full streaming chat, and the reusable `useVoiceDictation({ targetInputRef, onChange, language, continuous })` hook with caret-anchored live insertion).
- **Gap closed:** added a `huggingface` preset (kind `compat`, base URL `https://router.huggingface.co/v1` — HF's OpenAI-compatible Inference Providers router, default model `meta-llama/Llama-3.1-8B-Instruct`, key link `https://huggingface.co/settings/tokens`) and `hf_` prefix detection in `detectProviderFromKey`. No server change needed: the router routes through the existing `createOpenAICompatible` path and its `/v1/models` listing works with the current `list-models` OpenAI-compatible fetch.
- Verified: `npm run verify` → lint clean, 45/45 tests pass, build succeeds (EXIT=0).

### Splash Fix, Hydration Fix, Slime=Oneko Movement, Bolder UI (2026-06-22)
- **Splash now actually shows:** it was gated by `sessionStorage` (which persists across reloads in a tab), so after the first view it never reappeared. Removed the gate — the Remotion splash plays on every load. Added a CSS-animated brand fallback (orb + wordmark) behind the `<Player>` so a branded animation shows even if the player is slow to mount.
- **Hydration errors fixed:** `buddyOn`/`petSkin` were lazy `useState` initializers reading `localStorage` (server rendered defaults, client rendered stored values → mismatch). Now they start at fixed defaults (match SSR) and sync from `localStorage` in a `requestAnimationFrame` effect. Audited all other state: `showSplash` (rAF), `theme` (default), `getPreferredLang()` (runtime fn), and the settings-modal lazy reads (only render when opened) are all SSR-safe.
- **Soft slime moves like the oneko pets:** replaced its eased-follow + wander physics with the oneko stepping algorithm (10px step toward the cursor every 100ms, idle in place when within 48px) — identical pacing to cat/dog/pixel skins — plus a 100ms linear transition so the soft blob glides between steps. Squash, emotions, melt, drag, and speech all preserved.
- **Bolder, clearly-different UI:** rebuilt the auth/landing screen into a glassy split hero (animated orb + rings, gradient backdrop, feature pills, new CTAs); richer fixed multi-radial app background; nav active state is now a brand gradient with white text + glow; softer radii + layered shadows from the earlier token pass.
- Verified: lint, 45 tests, build pass; home serves 200 (no SSR crash). Note: the in-environment browser preview is unresponsive (screenshot times out), so visual output is unverified here — needs a real browser.

### Remotion Splash + Visual Refresh (2026-06-22)
- **Remotion splash/loader:** added `remotion` + `@remotion/player`. `MindTrailSplash.js` is a Remotion composition (breathing brand orb, radiating rings, "MindTrail" wordmark reveal, tagline, color-dot trail) using the app's exact palette. `SplashScreen.js` plays it once via `<Player>` on a full-screen overlay, then fades out (with a Skip button + an ended/timeout fallback). Shown once per session (`sessionStorage` `mindtrail-splash-seen`).
- **SSR-safe:** the splash only mounts client-side via `requestAnimationFrame` (showSplash starts false), so Remotion's Player never runs during SSR — avoids the common Remotion-in-Next hydration/window pitfall. Verified home serves 200, lint + build pass.
- **Visual refresh (palette unchanged):** softer modern radii via new tokens (`--radius` 8→16 for cards, new `--radius-sm` 11 for buttons/inputs), layered two-step shadows (`--shadow`, `--shadow-sm`) in light + dark, and a breathing brand orb beside the MindTrail wordmark in the topbar. These cascade across every screen since all surfaces share the tokens/classes — full look refresh with zero feature changes.

### Tester Login Rate-Limit Fix (2026-06-22)
- **Bug:** tester login used a single GLOBAL rate-limit key `'tester-login'` (20/hour shared across all clients). Heavy automated testing exhausted the shared bucket, so every tester login returned 429 "Too many requests" — appearing as "tester login not working."
- **Fix:** rate-limit per client via new `getClientId(request)` (x-forwarded-for / x-real-ip, falls back to `local`) and raised the limit to 60/hour per client. `POST /api/tester` now keys on `tester-login:${clientId}`.
- Audited every other route: all already key rate limits per `actor.storageKey`, so none had this issue.
- Verified live: 25 consecutive tester logins all return 201; home renders 200; core GET endpoints (entries/guestbook/worry/chat) 200; provider endpoints fail gracefully (400/`ok:false`). Lint, 45 tests, build pass.

### Soft Slime Restored as a Pet Option (2026-06-22)
- Brought back the original soft (non-pixel) CSS slime as a selectable pet **alongside** the oneko skins, with its original cursor-follow movement, squash/stretch, emotions (happy/curious/love/sleepy/surprised/angry/hurt/dizzy/melting), drag, and poke-to-melt.
- Pet picker now lists Cat, Dog, Maia, Tora, Vaporwave, **Slime (pixel)**, and **Slime (soft)** (`classic`). `page.js` renders `SlimeBuddy` for `classic`, `OnekoPet` otherwise. Restored `SlimeBuddy.js` and its `.slime-*` CSS.
- Richer speech bubbles: not just supportive — added a FUN pool (playful one-liners) mixed into idle chatter, and poke reactions now speak escalating **hurt** lines (ouch → angry → melt) plus recovery quips, matching the on-face emotions.
- Verified: lint, 45 tests, build pass.

### Oneko Pixel Pet + Quota Messaging (2026-06-22)
- **Chatbot "not replying" diagnosed:** the shared env Gemini key hit its free-tier **quota** ("You exceeded your current quota"). The code was fine — text returned the quota error, voice streamed its fallback. Fix: clearer, actionable errors that point users to add their own key (which works via the universal BYO-key system). `/api/chat` now catches model errors and returns a friendly 503 ("shared AI key is out of quota — add your own in Settings"); the voice route's empty-stream fallback says the same. The real cure is BYO key (already shipped).
- **Replaced the CSS slime with a faithful oneko pixel pet** (`src/app/components/OnekoPet.js`). Ported the original oneko.js movement engine (cursor-follow, 8-direction run frames, idle → alert → tired → sleeping, wall-scratch) verbatim, plus drag. Real 256×128 sprite sheets downloaded into `public/oneko/` from the spicetify-oneko project: **cat (classic), dog, maia, tora, vaporwave**. Skin swap is live (no remount).
- **Slime is now a selectable skin** — small, pixelated, cute. Drawn as an inline pixel SVG sprite sheet (no binary asset) with its own sprite map that bobs between two frames in every direction; keeps oneko's exact movement.
- **Settings:** the buddy section now has an on/off toggle plus a skin picker (Cat/Dog/Maia/Tora/Vaporwave/Slime), persisted in `localStorage` (`mindtrail-pet-skin`). Removed `SlimeBuddy.js` and all slime CSS; added `.oneko` + `.pet-grid` styles (image-rendering pixelated, reduced-motion hides it).
- Verified: all five gif sheets serve 200; lint, 45 tests, build pass. Pet movement is client-side (mic/cursor) so not exercised headlessly.

### Universal Provider Support + Settings Modal Rebuild (2026-06-21)
- **Any provider, no exceptions.** Almost every LLM provider exposes an OpenAI-compatible API, so `buildModelFor()` in `gemini.js` routes any base URL through `@ai-sdk/openai-compatible`. Native SDKs are used for Gemini / OpenAI / Anthropic; everything else (OpenRouter, Groq, DeepSeek, Mistral, Cerebras, Fireworks, Together, NVIDIA NIM, xAI, Perplexity, Moonshot/Kimi, Z.ai, …) and local servers (Ollama, LM Studio, llama.cpp) work via base URL. A **Custom** option accepts literally any base URL + model.
- **Headers:** client now also sends `x-mindtrail-base-url` (plus key/provider/model), same-origin `/api/` only, transient, never stored/logged. Server `normalizeBaseUrl()` requires http(s) and only allows plain http for localhost (light SSRF guard); https elsewhere.
- **New endpoint `POST /api/provider-test`** validates a draft provider/key/model/baseURL with a tiny round-trip (auth + same-origin + rate-limited). Powers the Test button. `testProvider()` added to `gemini.js`.
- **Settings rebuilt as a product-grade modal** (`SettingsModal`): a fluid provider chip grid (16+ presets + Custom), key/model/base-URL fields that adapt per provider (local presets need no key; custom shows base URL), a Test button with live status pill, Insert↔Remove, an active-provider card, "Get a key" deep links, plus the language selector and study-buddy toggle. Replaced the cramped popover. Stored in `localStorage` (`mindtrail-gemini-key`, `mindtrail-provider`, `mindtrail-model`, `mindtrail-base-url`, `mindtrail-preset`). Removed the dead popover/key-grid CSS.
- Added deps `@ai-sdk/openai-compatible` (and previously `@ai-sdk/openai`, `@ai-sdk/anthropic`).
- **Verified live:** Test against Groq's base URL with a bogus key returned a real "Invalid API Key" from Groq (proves the universal OpenAI-compatible path actually connects); invalid base URLs fail gracefully; env Gemini path still replies. Lint, 45 tests, build pass.

### Multi-Provider BYO Keys + Conversation Robustness (2026-06-21)
- **Any LLM provider, not just Gemini.** `resolveModel()` in `gemini.js` detects the provider from the user's key shape (`AIza…` → Google, `sk-ant-…` → Anthropic, `sk-…` → OpenAI) and builds the matching AI-SDK model (`@ai-sdk/google` / `@ai-sdk/openai` / `@ai-sdk/anthropic`). Per-provider default models: Gemini `gemini-2.5-flash`, OpenAI `gpt-4o-mini`, Anthropic `claude-3-5-haiku-latest`; the user may override the model. Falls back to the env Gemini key when no user key is set. Works uniformly for `generateText`, `generateObject`, and `streamText` (the google-only `thinkingConfig` providerOption is ignored by other providers).
- **Headers:** client sends `x-mindtrail-api-key` plus optional `x-mindtrail-provider` and `x-mindtrail-model`, attached only to same-origin `/api/` requests. Read transiently via `next/headers`; never stored or logged.
- **Settings UI:** the key panel now accepts a key from any provider with an Insert↔Remove toggle, an auto-detect provider dropdown, an optional model field, and shows the detected/active provider. Stored only in `localStorage` (`mindtrail-gemini-key`, `mindtrail-provider`, `mindtrail-model`).
- **Why:** the shared env Gemini key can hit free-tier quota (caused the "no response / totally broken" reports); users can now plug in their own working key from any provider.
- **Conversation robustness:** the browser SpeechRecognition `network` error (which can fire even with working internet) now auto-retries up to 4 times via keep-alive before surfacing a calmer, accurate message ("the browser's speech service keeps dropping — you can still type, or tap to try again") instead of the misleading "needs internet." The voice route already emits a clear spoken fallback when a stream returns empty (bad key / quota).
- Verified live: env-Gemini path replies normally; OpenAI- and Anthropic-shaped keys route to the right provider and fail gracefully with the in-voice fallback.

### Slime Buddy, BYO API Key, Multilingual + Greeting Fix (2026-06-21)

**Interactive slime buddy** (`src/app/components/SlimeBuddy.js`)
- A draggable, cursor-following slime creature that roams the whole site (fixed overlay, `requestAnimationFrame` movement with jelly squash-and-stretch; pupils track the cursor).
- Facial expressions via inline SVG: happy, curious, sleepy, love, surprised, angry, hurt, dizzy, melting. Idle moods rotate and it shows supportive speech bubbles (calming lines when burnout risk is high, else encouragements).
- Play: drag to fling it; poke it (quick tap) → hurt → angry → after repeated hits it MELTS into a puddle, then reforms dizzy. Honors `prefers-reduced-motion`.
- Toggleable via Settings; preference persisted in `localStorage` (`mindtrail-buddy-on`).

**Bring-your-own Gemini API key** (never stored in our DB)
- Settings popover (gear icon in topbar) with an insert box; the button shows **Insert**, switches to **Remove** once a key is saved, and back to **Insert** after removal.
- Stored only in the browser `localStorage` (`mindtrail-gemini-key`) — survives session end, removed only by the user. Never written to the database or logged.
- Client patches `window.fetch` once (`installApiKeyHeader`) to attach `x-mindtrail-api-key` ONLY to same-origin `/api/` requests (hardened against leaking the key to third parties).
- Server: `resolveApiKey()` in `gemini.js` reads the header via `next/headers` and uses it transiently; falls back to `GEMINI_API_KEY`. `getModel()`/`getFastModel()` are now async; all call sites awaited; `streamCompanionReply` is async.
- Invalid user key → the voice route now emits a clear spoken fallback telling the user to check/remove the key in Settings.

**Multilingual** (Indian languages)
- Both chat + voice system prompts now instruct the companion to detect the student's language and reply in the same language/script (English, Hindi, Hinglish, Tamil, Telugu, Bengali, Marathi, etc.), switching when they switch.
- Speech recognition language is selectable (Settings → Conversation language; `mindtrail-lang`), defaulting to Auto (browser locale). `useSpeechInput.start({ lang })` applies it.
- TTS picks a voice matching the reply's language — detected per sentence from the script (Devanagari/Bengali/Tamil/etc. → matching BCP-47 voice), falling back to the selected language.
- Verified live: Hindi prompt → Hindi reply; Hinglish → Hindi reply; English → English.

**Greeting fix**
- The persona projected distress onto plain greetings ("Hi" → "It sounds like you're going through a lot"). Both prompts now MATCH THE USER'S ENERGY: a greeting/small talk gets a warm casual reply that invites sharing; empathy only appears when the student shares something real. Verified: "Hi" → "Hi there! How are you doing today?"

### Relief Room (new section)
Four tools replacing generic breathing advice:
- **Pressure Valve**: 60-second unfiltered writing dump → AI extracts the real underlying concern, names the emotion precisely, gives one 10-minute next step. Stateless (no DB).
- **Worry Parking Lot**: Park loop-thoughts with AI acknowledgment + review date. Persisted in `worry_items` DB table. Mark as resolved.
- **Tomorrow's Letter**: AI generates a letter from the student's future self, using real journal data. Deeply personalized.
- **Alternate Timeline Generator**: Computes burnout risk at current pace vs +1hr sleep vs balanced study hours. Detects Stress Contagion (external stressors from journal trigger analysis).

### Scan Section (new section)
- Study Desk Analysis: upload desk photo → Gemini Vision identifies stress signals (clutter, caffeine count, late-night setup).
- Handwriting Analysis: upload handwriting sample → AI observes pressure, speed, corrections.
- Face Check: camera capture → AI observes tiredness, visible tension.
- Client-side image compression (max 768px) before upload. Route: `/api/analyze-image`.

### Graph Improvements
- Physics-based force simulation (repulsion + spring edges + center gravity).
- Nodes colored by mood: red ≤3, amber 4-6, green 7+.
- High-burnout entries (>60%) pulse with a red ring animation.
- Simulation runs continuously (settles over ~200 ticks).

### New API Routes
- `POST /api/analyze-image` — Gemini Vision multimodal analysis
- `GET/POST/PATCH /api/worry` — Worry parking lot
- `POST /api/future-letter` — Letter from future self
- `POST /api/pressure-valve` — Pressure valve clarity
- `POST /api/chat/voice` — streaming companion reply for live conversation mode (text/plain stream, auth-protected, persists both turns)
- `GET /api/chat` — returns the user's stored companion thread + messages (loaded on mount so conversations persist across reloads)

### New DB Table
- `worry_items`: id, user_key, worry_text, acknowledgment, is_in_their_control, what_they_can_control, park_until, park_message, resolved, created_at

### New Gemini Functions
- `generateFutureLetter(entries)` — returns letter + keyStrengths + reminder
- `processPressureValve(rawDump)` — returns realConcern + whatYouFeel + oneNextStep + validation
- `analyzeWorry(worryText)` — returns acknowledgment + isInTheirControl + whatTheyCanControl + parkUntil + parkMessage
- `analyzeImage(buffer, mimeType, type)` — multimodal desk/handwriting/face analysis

## Verification Logs

- Last Run Verification: 2026-06-21 (live conversation mode + streaming voice)
- Status: Passed lint, test, and build. New streaming voice endpoint verified live (200 home, 401 unauthenticated on `/api/chat/voice`).
- Commands:
  - `npm run lint`
  - `npm run test`
  - `npm run build`
  - `Invoke-WebRequest http://localhost:3000/` and `POST /api/chat/voice` (auth gate check)
- Results:
  - ESLint passed (including React Compiler `react-hooks/refs`, `set-state-in-effect`, and `immutability` rules — `pump` moved to a ref, loop closures assigned in an effect, displayed phase derived instead of set in effects).
  - Vitest passed: 6 test files, 44 tests.
  - `next build` passed; `/api/chat/voice` registered as a dynamic route.
  - Dev server returns HTTP 200 and renders the MindTrail home; `POST /api/chat/voice` returns 401 unauthenticated, confirming the route loads, validates, and enforces `getActor()` auth + same-origin protection.
  - Note: the full hands-free loop (live mic capture, `SpeechRecognition`, and `speechSynthesis` playback) needs a real microphone, a user-granted permission prompt, and spoken audio, so it cannot be exercised end-to-end by the automated preview harness. The streaming pipeline is verified up to the auth boundary and the client wiring builds/lints clean.

## Major Rebuild (2026-06-20)

- `auth.js`: Actor resolution requires Clerk users; anonymous dev-session fallback remains removed.
- `proxy.js`: Provides Clerk request context for app and API routes.
- `db.js`: Added `journal_insights`, `chat_threads`, `chat_messages`, and `guestbook_posts` persistence plus in-memory dev adapters.
- `gemini.js`: Added `generateEntryInsights(entry)`, expanded `chatWithCompanion()` to use full journal context, and normalized journal analysis fields so strict AI schema mismatches do not break entry creation.
- `validation.js`: Added `entryInsightSchema` and `guestbookSchema`.
- `api/entries/[id]/insights/route.js`: New per-entry AI insight generation endpoint.
- `api/guestbook/route.js`: New shared authenticated guestbook API.
- `api/chat/route.js`: Now stores chat messages and sends complete available journal history to Gemini.
- `page.js`: Complete product rebuild with auth setup state, onboarding, journal, canvas map, chat, guestbook, and theme toggle.
- `page.js`: Auth screen includes tester login button that creates a standalone tester session, plus a tester profile menu with sign-out.
- `api/tester/route.js`: Creates and clears a signed HttpOnly tester session cookie.
- `globals.css`: Complete visual redesign with light/dark tokens, canvas graph map, masonry insight bubbles, and handwritten guestbook wall.
- `lib/tester-session.js`: Signs and verifies standalone tester sessions without storing evaluator credentials or calling Clerk.
