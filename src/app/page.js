'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { SignInButton, SignUpButton, UserButton, useUser } from '@clerk/nextjs';
import OnekoPet, { PET_SKINS } from './components/OnekoPet';

const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

const SECTIONS = [
  { id: 'journal', label: 'Journal' },
  { id: 'relief', label: 'Relief Room' },
  { id: 'map', label: 'Map' },
  { id: 'chat', label: 'Chat' },
  { id: 'scan', label: 'Scan' },
  { id: 'guestbook', label: 'Guestbook' }
];

const INITIAL_FORM = { mood: 5, energy: 5, sleepHours: 7, exam: '', journal: '' };

const API_KEY_STORAGE = 'mindtrail-gemini-key';
const PROVIDER_STORAGE = 'mindtrail-provider';
const MODEL_STORAGE = 'mindtrail-model';
const BASEURL_STORAGE = 'mindtrail-base-url';
const PRESET_STORAGE = 'mindtrail-preset';
const BUDDY_STORAGE = 'mindtrail-buddy-on';
const PET_SKIN_STORAGE = 'mindtrail-pet-skin';
const LANG_STORAGE = 'mindtrail-lang';

// Almost every LLM provider exposes an OpenAI-compatible API. Native SDKs are
// used for Gemini / OpenAI / Anthropic; everything else routes through a base
// URL. "Custom" lets the user point at literally any provider or self-host.
const PRESETS = [
  { code: 'gemini', label: 'Google Gemini', kind: 'native', server: 'google', model: 'gemini-2.5-flash', keyUrl: 'https://aistudio.google.com/app/apikey' },
  { code: 'openai', label: 'OpenAI', kind: 'native', server: 'openai', model: 'gpt-4o-mini', keyUrl: 'https://platform.openai.com/api-keys' },
  { code: 'anthropic', label: 'Anthropic Claude', kind: 'native', server: 'anthropic', model: 'claude-3-5-haiku-latest', keyUrl: 'https://console.anthropic.com/settings/keys' },
  { code: 'openrouter', label: 'OpenRouter', kind: 'compat', baseURL: 'https://openrouter.ai/api/v1', model: 'openai/gpt-4o-mini', keyUrl: 'https://openrouter.ai/keys' },
  { code: 'groq', label: 'Groq', kind: 'compat', baseURL: 'https://api.groq.com/openai/v1', model: 'llama-3.3-70b-versatile', keyUrl: 'https://console.groq.com/keys' },
  { code: 'deepseek', label: 'DeepSeek', kind: 'compat', baseURL: 'https://api.deepseek.com/v1', model: 'deepseek-chat', keyUrl: 'https://platform.deepseek.com/api_keys' },
  { code: 'mistral', label: 'Mistral', kind: 'compat', baseURL: 'https://api.mistral.ai/v1', model: 'mistral-small-latest', keyUrl: 'https://console.mistral.ai/api-keys' },
  { code: 'cerebras', label: 'Cerebras', kind: 'compat', baseURL: 'https://api.cerebras.ai/v1', model: 'llama3.1-8b', keyUrl: 'https://cloud.cerebras.ai' },
  { code: 'fireworks', label: 'Fireworks', kind: 'compat', baseURL: 'https://api.fireworks.ai/inference/v1', model: 'accounts/fireworks/models/llama-v3p1-8b-instruct', keyUrl: 'https://fireworks.ai/account/api-keys' },
  { code: 'together', label: 'Together AI', kind: 'compat', baseURL: 'https://api.together.xyz/v1', model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', keyUrl: 'https://api.together.ai/settings/api-keys' },
  { code: 'nvidia', label: 'NVIDIA NIM', kind: 'compat', baseURL: 'https://integrate.api.nvidia.com/v1', model: 'meta/llama-3.1-8b-instruct', keyUrl: 'https://build.nvidia.com' },
  { code: 'xai', label: 'xAI Grok', kind: 'compat', baseURL: 'https://api.x.ai/v1', model: 'grok-2-latest', keyUrl: 'https://console.x.ai' },
  { code: 'perplexity', label: 'Perplexity', kind: 'compat', baseURL: 'https://api.perplexity.ai', model: 'sonar', keyUrl: 'https://www.perplexity.ai/settings/api' },
  { code: 'moonshot', label: 'Moonshot / Kimi', kind: 'compat', baseURL: 'https://api.moonshot.ai/v1', model: 'moonshot-v1-8k', keyUrl: 'https://platform.moonshot.ai/console/api-keys' },
  { code: 'zai', label: 'Z.ai (GLM)', kind: 'compat', baseURL: 'https://api.z.ai/api/paas/v4', model: 'glm-4-flash', keyUrl: 'https://z.ai' },
  { code: 'ollama', label: 'Ollama (local)', kind: 'local', baseURL: 'http://localhost:11434/v1', model: 'llama3.2', keyless: true },
  { code: 'lmstudio', label: 'LM Studio (local)', kind: 'local', baseURL: 'http://localhost:1234/v1', model: '', keyless: true },
  { code: 'llamacpp', label: 'llama.cpp (local)', kind: 'local', baseURL: 'http://localhost:8080/v1', model: '', keyless: true },
  { code: 'custom', label: 'Custom / Any provider', kind: 'custom', baseURL: '', model: '' }
];

function presetByCode(code) {
  return PRESETS.find((p) => p.code === code) || null;
}

function serverProviderFor(preset) {
  if (!preset) return 'openai-compatible';
  if (preset.kind === 'native') return preset.server;
  return 'openai-compatible';
}

const LANGUAGES = [
  { code: 'auto', label: 'Auto-detect' },
  { code: 'en-IN', label: 'English' },
  { code: 'hi-IN', label: 'हिन्दी Hindi' },
  { code: 'bn-IN', label: 'বাংলা Bengali' },
  { code: 'ta-IN', label: 'தமிழ் Tamil' },
  { code: 'te-IN', label: 'తెలుగు Telugu' },
  { code: 'mr-IN', label: 'मराठी Marathi' },
  { code: 'kn-IN', label: 'ಕನ್ನಡ Kannada' },
  { code: 'gu-IN', label: 'ગુજરાતી Gujarati' },
  { code: 'ml-IN', label: 'മലയാളം Malayalam' },
  { code: 'pa-IN', label: 'ਪੰਜਾਬੀ Punjabi' },
  { code: 'ur-IN', label: 'اردو Urdu' }
];

function getPreferredLang() {
  try {
    const stored = localStorage.getItem(LANG_STORAGE);
    if (stored && stored !== 'auto') return stored;
  } catch {}
  if (typeof navigator !== 'undefined' && navigator.language) return navigator.language;
  return 'en-US';
}

// Map Indic script ranges to a BCP-47 tag so TTS picks a matching voice.
const SCRIPT_LANG = [
  [/[ऀ-ॿ]/, 'hi-IN'],
  [/[ঀ-৿]/, 'bn-IN'],
  [/[஀-௿]/, 'ta-IN'],
  [/[ఀ-౿]/, 'te-IN'],
  [/[ಀ-೿]/, 'kn-IN'],
  [/[ഀ-ൿ]/, 'ml-IN'],
  [/[઀-૿]/, 'gu-IN'],
  [/[਀-੿]/, 'pa-IN'],
  [/[؀-ۿ]/, 'ur-IN']
];

function detectLang(text, fallback) {
  for (const [re, lang] of SCRIPT_LANG) {
    if (re.test(text)) return lang;
  }
  return fallback;
}

// Inject a user-supplied Gemini key (stored only in this browser) as a header on
// our own /api requests. Patches fetch once; never touches third-party requests.
function installApiKeyHeader() {
  if (typeof window === 'undefined' || window.__mindtrailFetchPatched) return;
  const original = window.fetch.bind(window);
  window.fetch = (input, init = {}) => {
    try {
      const key = localStorage.getItem(API_KEY_STORAGE);
      const rawUrl = typeof input === 'string' ? input : input?.url;
      if (key && typeof rawUrl === 'string') {
        const url = new URL(rawUrl, window.location.origin);
        // Only ever attach the key to our own same-origin API — never to third parties.
        if (url.origin === window.location.origin && url.pathname.startsWith('/api/')) {
          const headers = new Headers(init.headers || (typeof input !== 'string' ? input.headers : undefined));
          headers.set('x-mindtrail-api-key', key);
          const provider = localStorage.getItem(PROVIDER_STORAGE);
          const model = localStorage.getItem(MODEL_STORAGE);
          const baseURL = localStorage.getItem(BASEURL_STORAGE);
          if (provider && provider !== 'auto') headers.set('x-mindtrail-provider', provider);
          if (model) headers.set('x-mindtrail-model', model);
          if (baseURL) headers.set('x-mindtrail-base-url', baseURL);
          return original(input, { ...init, headers });
        }
      }
    } catch {}
    return original(input, init);
  };
  window.__mindtrailFetchPatched = true;
}

function formatDate(dateStr) {
  if (!dateStr) return 'Just now';
  return new Date(dateStr).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function stressClass(level) {
  if (level === 'high') return 'tone-high';
  if (level === 'moderate') return 'tone-mid';
  return 'tone-low';
}

function moodToColor(mood) {
  const m = Number(mood) || 5;
  if (m <= 3) return '#e45d4f';
  if (m <= 5) return '#f2a93b';
  if (m <= 7) return '#d89b2b';
  return '#4b8f63';
}

export default function Home() {
  if (!hasClerk) {
    return <AuthenticatedApp auth={{ isLoaded: true, isSignedIn: false, user: null }} clerkEnabled={false} />;
  }
  return <ClerkAuthenticatedApp />;
}

function ClerkAuthenticatedApp() {
  const { isLoaded, isSignedIn, user } = useUser();
  return <AuthenticatedApp auth={{ isLoaded, isSignedIn, user }} clerkEnabled />;
}

function AuthenticatedApp({ auth, clerkEnabled }) {
  const { isLoaded, isSignedIn, user } = auth;
  const [testerMode, setTesterMode] = useState(false);
  const [section, setSection] = useState('journal');
  const [theme, setTheme] = useState('light');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [entries, setEntries] = useState([]);
  const [worries, setWorries] = useState([]);
  const [guestbook, setGuestbook] = useState([]);
  const [form, setForm] = useState(INITIAL_FORM);
  const [chatText, setChatText] = useState('');
  const [chatLog, setChatLog] = useState([]);
  const [guestForm, setGuestForm] = useState({ authorName: '', message: '' });
  const [loading, setLoading] = useState('');
  const [error, setError] = useState('');
  const [buddyOn, setBuddyOn] = useState(() => { try { return localStorage.getItem(BUDDY_STORAGE) !== 'off'; } catch { return true; } });
  const [petSkin, setPetSkin] = useState(() => { try { return localStorage.getItem(PET_SKIN_STORAGE) || 'cat'; } catch { return 'cat'; } });
  const chatEndRef = useRef(null);

  useEffect(() => { installApiKeyHeader(); }, []);

  const toggleBuddy = useCallback(() => {
    setBuddyOn((prev) => {
      const next = !prev;
      try { localStorage.setItem(BUDDY_STORAGE, next ? 'on' : 'off'); } catch {}
      return next;
    });
  }, []);

  const changePetSkin = useCallback((code) => {
    setPetSkin(code);
    try { localStorage.setItem(PET_SKIN_STORAGE, code); } catch {}
  }, []);

  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);

  const loadEntries = useCallback(async () => {
    const res = await fetch('/api/entries');
    if (!res.ok) throw new Error('Unable to load your journal');
    const data = await res.json();
    setEntries(data.entries || []);
  }, []);

  const loadWorries = useCallback(async () => {
    const res = await fetch('/api/worry');
    if (res.ok) {
      const data = await res.json();
      setWorries(data.worries || []);
    }
  }, []);

  const loadGuestbook = useCallback(async () => {
    const res = await fetch('/api/guestbook');
    if (!res.ok) throw new Error('Unable to load the guestbook');
    const data = await res.json();
    setGuestbook(data.posts || []);
  }, []);

  const loadChat = useCallback(async () => {
    const res = await fetch('/api/chat');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.messages)) setChatLog(data.messages);
    }
  }, []);

  const hasAppAccess = isSignedIn || testerMode;

  useEffect(() => {
    if (!isLoaded || isSignedIn || testerMode) return;
    fetch('/api/entries').then((res) => { if (res.ok) setTesterMode(true); }).catch(() => {});
  }, [isLoaded, isSignedIn, testerMode]);

  useEffect(() => {
    if (!hasAppAccess) return;
    const seenKey = `mindtrail-onboarding-${user?.id || 'tester'}`;
    Promise.resolve()
      .then(() => {
        setShowOnboarding(!localStorage.getItem(seenKey));
        setError('');
        return Promise.all([loadEntries(), loadGuestbook(), loadWorries(), loadChat()]);
      })
      .catch((err) => setError(err.message));
  }, [hasAppAccess, loadEntries, loadGuestbook, loadWorries, loadChat, user?.id]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatLog]);

  const metrics = useMemo(() => {
    if (!entries.length) return { count: 0, mood: '-', sleep: '-', burnoutRisk: null };
    const avg = (field) => (entries.reduce((sum, item) => sum + Number(item[field]), 0) / entries.length).toFixed(1);
    const recent = entries.slice(0, 7);
    const avgBurnout = recent.reduce((sum, e) => sum + (e.analysis?.burnoutRiskScore || 40), 0) / recent.length;
    return { count: entries.length, mood: avg('mood'), sleep: `${avg('sleepHours')}h`, burnoutRisk: Math.round(avgBurnout) };
  }, [entries]);

  function finishOnboarding() {
    localStorage.setItem(`mindtrail-onboarding-${user?.id || 'tester'}`, 'true');
    setShowOnboarding(false);
  }

  function updateForm(name, value) {
    setForm((c) => ({ ...c, [name]: typeof value === 'function' ? value(c[name]) : value }));
  }

  async function submitEntry(event) {
    event.preventDefault();
    setLoading('entry');
    setError('');
    try {
      const res = await fetch('/api/entries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to save this journal entry');
      if (data.crisis) throw new Error(data.crisis.message);
      setEntries((c) => [data.entry, ...c]);
      setForm(INITIAL_FORM);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading('');
    }
  }

  async function invokeInsights(entryId) {
    setLoading(`insights-${entryId}`);
    setError('');
    try {
      const res = await fetch(`/api/entries/${entryId}/insights`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to invoke suggestions');
      setEntries((c) => c.map((e) => e.id === entryId ? { ...e, insightBubbles: data.insights } : e));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading('');
    }
  }

  async function dispatchChat(text) {
    const outgoing = text.trim();
    if (!outgoing) return null;
    setChatText('');
    setChatLog((c) => [...c, { role: 'student', content: outgoing }]);
    setLoading('chat');
    setError('');
    try {
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: outgoing }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to reach the companion');
      setChatLog(data.messages?.length ? data.messages : (c) => [...c, { role: 'companion', content: data.reply }]);
      return data.reply || null;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading('');
    }
  }

  function sendChat(event) {
    event.preventDefault();
    dispatchChat(chatText);
  }

  const appendChatMessage = useCallback((message) => {
    setChatLog((c) => [...c, message]);
  }, []);

  async function submitGuestbook(event) {
    event.preventDefault();
    setLoading('guestbook');
    setError('');
    try {
      const res = await fetch('/api/guestbook', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(guestForm) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to add guestbook note');
      setGuestbook((c) => [data.post, ...c]);
      setGuestForm({ authorName: '', message: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading('');
    }
  }

  async function handleTesterSignOut() {
    setLoading('signout');
    setError('');
    try {
      const res = await fetch('/api/tester', { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Unable to sign out');
      setTesterMode(false);
      setEntries([]);
      setWorries([]);
      setGuestbook([]);
      setChatLog([]);
      setForm(INITIAL_FORM);
      setGuestForm({ authorName: '', message: '' });
      setSection('journal');
    } catch (err) {
      setError(err.message || 'Unable to sign out');
    } finally {
      setLoading('');
    }
  }

  if (!isLoaded) return <LoadingScreen />;
  if (!hasAppAccess) return <AuthScreen clerkEnabled={clerkEnabled} onTesterReady={() => setTesterMode(true)} />;

  const burnoutRisk = metrics.burnoutRisk;
  const burnoutClass = burnoutRisk === null ? '' : burnoutRisk > 65 ? 'risk-high' : burnoutRisk > 40 ? 'risk-mid' : 'risk-low';

  return (
    <main className="product-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Journal companion</p>
          <h1>MindTrail</h1>
        </div>
        <div className="topbar-actions">
          {burnoutRisk !== null && (
            <div className={`burnout-badge ${burnoutClass}`} title="Burnout risk from recent entries">
              <span>Burnout risk</span>
              <strong>{burnoutRisk}%</strong>
            </div>
          )}
          <SettingsMenu buddyOn={buddyOn} onToggleBuddy={toggleBuddy} petSkin={petSkin} onChangePetSkin={changePetSkin} />
          <button className="icon-button" type="button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} title="Toggle theme">
            {theme === 'light' ? 'Dark' : 'Light'}
          </button>
          {isSignedIn ? <UserButton /> : <TesterProfileMenu onSignOut={handleTesterSignOut} loading={loading === 'signout'} />}
        </div>
      </header>

      {showOnboarding && <OnboardingCard name={user?.firstName || (testerMode ? 'Tester' : 'there')} onDone={finishOnboarding} />}

      <section className="status-strip" aria-label="Journal summary">
        <Stat label="Entries" value={metrics.count} />
        <Stat label="Avg mood" value={metrics.mood} />
        <Stat label="Avg sleep" value={metrics.sleep} />
        {burnoutRisk !== null && <Stat label="Burnout risk" value={`${burnoutRisk}%`} highlight={burnoutRisk > 60} />}
      </section>

      <nav className="section-nav" aria-label="Primary">
        {SECTIONS.map((item) => (
          <button key={item.id} className="nav-pill" data-active={section === item.id} onClick={() => setSection(item.id)} type="button">
            {item.label}
          </button>
        ))}
      </nav>

      {error && <p className="notice">{error}</p>}

      <div className="section-view" key={section}>
        {section === 'journal' && (
          <JournalSection
            form={form}
            entries={entries}
            loading={loading}
            onUpdate={updateForm}
            onSubmit={submitEntry}
            onInvoke={invokeInsights}
          />
        )}
        {section === 'relief' && (
          <ReliefRoomSection
            entries={entries}
            worries={worries}
            setWorries={setWorries}
            loading={loading}
            setLoading={setLoading}
            setError={setError}
          />
        )}
        {section === 'map' && <GraphMapSection entries={entries} />}
        {section === 'chat' && (
          <ChatSection
            chatLog={chatLog}
            chatText={chatText}
            loading={loading === 'chat'}
            chatEndRef={chatEndRef}
            onText={setChatText}
            onSubmit={sendChat}
            onSendText={dispatchChat}
            onAppendMessage={appendChatMessage}
          />
        )}
        {section === 'scan' && <ScanSection />}
        {section === 'guestbook' && (
          <GuestbookSection
            posts={guestbook}
            form={guestForm}
            loading={loading === 'guestbook'}
            onForm={setGuestForm}
            onSubmit={submitGuestbook}
          />
        )}
      </div>

      {buddyOn && <OnekoPet skin={petSkin} />}
    </main>
  );
}

/* ─── Relief Room ─────────────────────────────────────────────────────────── */

function ReliefRoomSection({ entries, worries, setWorries, loading, setLoading, setError }) {
  const [reliefTab, setReliefTab] = useState('valve');
  const [valveText, setValveText] = useState('');
  const [valveSeconds, setValveSeconds] = useState(0);
  const [valveRunning, setValveRunning] = useState(false);
  const [valveClarity, setValveClarity] = useState(null);
  const [worryText, setWorryText] = useState('');
  const [letter, setLetter] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!valveRunning) return;
    timerRef.current = setInterval(() => {
      setValveSeconds((s) => {
        if (s >= 60) {
          clearInterval(timerRef.current);
          setValveRunning(false);
          return 60;
        }
        return s + 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [valveRunning]);

  function startValve() {
    setValveText('');
    setValveClarity(null);
    setValveSeconds(0);
    setValveRunning(true);
  }

  async function submitValve() {
    if (!valveText.trim()) return;
    setLoading('valve');
    setError('');
    try {
      const res = await fetch('/api/pressure-valve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: valveText })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to process');
      setValveClarity(data.clarity);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading('');
    }
  }

  async function submitWorry(e) {
    e.preventDefault();
    if (!worryText.trim()) return;
    setLoading('worry');
    setError('');
    try {
      const res = await fetch('/api/worry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ worry: worryText })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to park this worry');
      setWorries((c) => [data.worry, ...c]);
      setWorryText('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading('');
    }
  }

  async function resolveWorry(id) {
    try {
      const res = await fetch('/api/worry', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (!res.ok) return;
      setWorries((c) => c.map((w) => w.id === id ? { ...w, resolved: true } : w));
    } catch {
      // ignore
    }
  }

  async function fetchLetter() {
    setLoading('letter');
    setError('');
    setLetter(null);
    try {
      const res = await fetch('/api/future-letter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to generate letter');
      setLetter(data.letter);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading('');
    }
  }

  const timeline = computeAlternateTimelines(entries);

  return (
    <section className="relief-section">
      <div className="section-heading">
        <p className="eyebrow">Relief Room</p>
        <h2>Tools that actually help</h2>
      </div>

      <nav className="relief-tabs" aria-label="Relief tools">
        {[['valve', 'Pressure Valve'], ['worry', 'Worry Parking Lot'], ['letter', "Tomorrow's Letter"], ['timeline', 'Alternate Timeline']].map(([id, label]) => (
          <button key={id} type="button" className="relief-tab" data-active={reliefTab === id} onClick={() => setReliefTab(id)}>{label}</button>
        ))}
      </nav>

      {reliefTab === 'valve' && (
        <div className="valve-panel">
          <div className="valve-header">
            <h3>Pressure Valve</h3>
            <p className="muted">60 seconds. No filter. No judgment. Type everything in your head — panic, rage, fear, loop-thoughts. All of it. Then let the AI find what&apos;s really going on.</p>
          </div>
          {!valveRunning && !valveClarity && valveSeconds === 0 && (
            <button className="valve-start-btn" type="button" onClick={startValve}>
              Open the valve
            </button>
          )}
          {(valveRunning || (valveSeconds > 0 && !valveClarity)) && (
            <div className="valve-active">
              <div className="valve-timer" data-urgent={valveSeconds >= 50}>
                {60 - valveSeconds}s
              </div>
              <textarea
                className="input valve-textarea"
                value={valveText}
                onChange={(e) => setValveText(e.target.value)}
                placeholder="Write everything. Don't think. Just type."
                autoFocus
                maxLength={4000}
              />
              {!valveRunning && valveSeconds >= 60 && (
                <button className="primary-button" type="button" onClick={submitValve} disabled={loading === 'valve'}>
                  {loading === 'valve' ? 'Reading your mind...' : 'See what this is really about'}
                </button>
              )}
              {valveRunning && valveText.length > 20 && (
                <button className="secondary-button" type="button" onClick={() => { setValveRunning(false); }}>
                  Done early
                </button>
              )}
            </div>
          )}
          {valveClarity && (
            <div className="valve-clarity">
              <div className="clarity-card">
                <p className="clarity-label">What this is really about</p>
                <p className="clarity-concern">{valveClarity.realConcern}</p>
              </div>
              <div className="clarity-card">
                <p className="clarity-label">What you&apos;re feeling</p>
                <p>{valveClarity.whatYouFeel}</p>
              </div>
              <div className="clarity-card clarity-green">
                <p className="clarity-label">One next step (next 10 minutes)</p>
                <p><strong>{valveClarity.oneNextStep}</strong></p>
              </div>
              <div className="clarity-card clarity-muted">
                <p>{valveClarity.validation}</p>
              </div>
              <button className="secondary-button" type="button" onClick={() => { setValveClarity(null); setValveSeconds(0); }}>
                Open valve again
              </button>
            </div>
          )}
        </div>
      )}

      {reliefTab === 'worry' && (
        <div className="worry-panel">
          <div className="valve-header">
            <h3>Worry Parking Lot</h3>
            <p className="muted">Can&apos;t stop thinking about something? Park it here. The AI acknowledges it, tells you what you can control, and holds it so your brain can let go.</p>
          </div>
          <form className="worry-form" onSubmit={submitWorry}>
            <textarea
              className="input"
              value={worryText}
              onChange={(e) => setWorryText(e.target.value)}
              placeholder="What thought keeps looping? Write it here..."
              maxLength={500}
              required
            />
            <button className="primary-button" type="submit" disabled={loading === 'worry'}>
              {loading === 'worry' ? 'Parking...' : 'Park this worry'}
            </button>
          </form>
          <div className="worry-lot">
            {!worries.length && <EmptyState title="Lot is empty" text="Park a worry above and your brain gets permission to move on." />}
            {worries.map((w) => (
              <div key={w.id} className={`worry-card ${w.resolved ? 'worry-resolved' : ''}`}>
                <p className="worry-text">{w.worryText}</p>
                <p className="worry-ack">{w.acknowledgment}</p>
                <div className="worry-meta">
                  <span className="worry-park-tag">📍 Parked until: {w.parkUntil}</span>
                  {!w.resolved && (
                    <button className="worry-resolve-btn" type="button" onClick={() => resolveWorry(w.id)}>
                      Mark resolved
                    </button>
                  )}
                  {w.resolved && <span className="worry-done-tag">✓ Resolved</span>}
                </div>
                {w.whatTheyCanControl && (
                  <p className="worry-control"><strong>In your control:</strong> {w.whatTheyCanControl}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {reliefTab === 'letter' && (
        <div className="letter-panel">
          <div className="valve-header">
            <h3>Tomorrow&apos;s Letter</h3>
            <p className="muted">Read what your future self — the one who survived this exam season — wrote back to you. Based on your actual journal entries.</p>
          </div>
          {!letter && (
            <button className="primary-button" type="button" onClick={fetchLetter} disabled={loading === 'letter'}>
              {loading === 'letter' ? 'Writing from the future...' : entries.length ? 'Read your letter' : 'Write a journal entry first'}
            </button>
          )}
          {letter && (
            <div className="letter-card">
              <div className="letter-header">
                <span className="letter-from">From: You (someday)</span>
                <span className="letter-to">To: You (right now)</span>
              </div>
              <div className="letter-body">
                {letter.letter.split('\n\n').map((para, i) => <p key={i}>{para}</p>)}
              </div>
              {letter.keyStrengths?.length > 0 && (
                <div className="letter-strengths">
                  <p className="clarity-label">Your future self sees these strengths in you</p>
                  <ul>
                    {letter.keyStrengths.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}
              {letter.reminder && (
                <div className="letter-reminder">
                  <p>{letter.reminder}</p>
                </div>
              )}
              <button className="secondary-button" type="button" onClick={() => setLetter(null)} style={{ marginTop: '16px' }}>
                Read again
              </button>
            </div>
          )}
        </div>
      )}

      {reliefTab === 'timeline' && (
        <div className="timeline-panel">
          <div className="valve-header">
            <h3>Alternate Timeline</h3>
            <p className="muted">Based on your real journal data — see how small changes would shift your burnout risk over the next 2 weeks.</p>
          </div>
          {!timeline ? (
            <EmptyState title="No data yet" text="Save at least 2 journal entries to generate your alternate timelines." />
          ) : (
            <div className="timeline-scenarios">
              <ScenarioBar
                label="Current path"
                risk={timeline.currentRisk}
                description={`At your current pace — avg sleep ${timeline.avgSleep}h, stress ${timeline.avgStress}/10`}
                color="var(--accent)"
              />
              <ScenarioBar
                label="+1 hour sleep each night"
                risk={timeline.sleepImprovedRisk}
                description={`Sleep is the #1 burnout buffer. Even one hour shifts your trajectory.`}
                color="var(--brand)"
              />
              <ScenarioBar
                label="20% fewer study hours + real breaks"
                risk={timeline.balancedRisk}
                description="Paradoxically, studying smarter reduces burnout without reducing learning."
                color="var(--green)"
              />
              {timeline.contagionSources.length > 0 && (
                <div className="contagion-card">
                  <h4>Stress Contagion Detected</h4>
                  <p className="muted">Your journal mentions external stress sources. These are likely amplifying your internal load:</p>
                  <ul>
                    {timeline.contagionSources.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                  <p className="contagion-tip">Tip: You cannot control their stress. You can choose what you absorb.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function ScenarioBar({ label, risk, description, color }) {
  const risk100 = Math.min(100, Math.max(0, risk));
  return (
    <div className="scenario-bar-card">
      <div className="scenario-bar-header">
        <span className="scenario-label">{label}</span>
        <span className="scenario-risk" style={{ color }}>{Math.round(risk100)}% risk</span>
      </div>
      <div className="scenario-bar-track">
        <div className="scenario-bar-fill" style={{ width: `${risk100}%`, background: color }} />
      </div>
      <p className="scenario-desc">{description}</p>
    </div>
  );
}

function computeAlternateTimelines(entries) {
  if (entries.length < 2) return null;
  const recent = entries.slice(0, 7);
  const avgBurnout = recent.reduce((sum, e) => sum + (e.analysis?.burnoutRiskScore || 45), 0) / recent.length;
  const avgSleep = Number((recent.reduce((sum, e) => sum + Number(e.sleepHours || 6), 0) / recent.length).toFixed(1));
  const avgStress = Number((recent.reduce((sum, e) => sum + Number(e.stress || 6), 0) / recent.length).toFixed(1));

  const sleepDeficit = Math.max(0, 7.5 - avgSleep);
  const stressLoad = Math.max(0, avgStress - 4);

  const currentRisk = Math.min(100, avgBurnout);
  const sleepImprovedRisk = Math.max(0, currentRisk - (sleepDeficit > 0.5 ? 22 : 8));
  const balancedRisk = Math.max(0, currentRisk - (stressLoad > 2 ? 18 : 10));

  const contagionKeywords = ['parent', 'peer', 'friend', 'batch', 'topper', 'teacher', 'compared', 'everyone', 'classmate', 'rank', 'others'];
  const contagionSources = [];
  entries.slice(0, 6).forEach((e) => {
    [...(e.analysis?.stressTriggers || []), ...(e.analysis?.hiddenTriggers || [])].forEach((t) => {
      const lower = String(t).toLowerCase();
      if (contagionKeywords.some((k) => lower.includes(k))) {
        contagionSources.push(t);
      }
    });
  });

  return { currentRisk, sleepImprovedRisk, balancedRisk, avgSleep, avgStress, contagionSources: [...new Set(contagionSources)].slice(0, 4) };
}

/* ─── Scan Section ────────────────────────────────────────────────────────── */

function ScanSection() {
  const [scanTab, setScanTab] = useState('desk');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);
  const videoRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const streamRef = useRef(null);

  async function handleFile(file) {
    if (!file) return;
    setError('');
    setAnalysis(null);
    setLoading(true);
    try {
      const dataUrl = await compressImage(file);
      const res = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrl: dataUrl, type: scanTab })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      setAnalysis(data.analysis);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraActive(true);
    } catch {
      setError('Camera access denied. Please allow camera permission in your browser.');
    }
  }

  async function captureCamera() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    canvas.getContext('2d').drawImage(video, 0, 0, 640, 480);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    stopCamera();
    setAnalysis(null);
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageDataUrl: dataUrl, type: 'face' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');
      setAnalysis(data.analysis);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }

  useEffect(() => () => stopCamera(), []);

  const tabs = [
    ['desk', 'Study Desk'],
    ['handwriting', 'Handwriting'],
    ['face', 'Face Check']
  ];

  const tabDescriptions = {
    desk: 'Upload a photo of your study desk. The AI reads your environment for stress signals — clutter, late-night setup, caffeine count.',
    handwriting: 'Upload a sample of your handwriting. The AI observes pressure, speed, and clarity as gentle signals of your current state.',
    face: 'Take a quick photo. The AI observes visible signs of tiredness or tension — just like a caring friend checking in on you.'
  };

  return (
    <section className="scan-section">
      <div className="section-heading">
        <p className="eyebrow">Environment & Wellbeing Scan</p>
        <h2>What your surroundings reveal</h2>
      </div>
      <nav className="relief-tabs" aria-label="Scan types">
        {tabs.map(([id, label]) => (
          <button key={id} type="button" className="relief-tab" data-active={scanTab === id}
            onClick={() => { setScanTab(id); setAnalysis(null); setError(''); stopCamera(); }}>
            {label}
          </button>
        ))}
      </nav>
      <p className="scan-desc">{tabDescriptions[scanTab]}</p>

      {scanTab === 'face' ? (
        <div className="scan-face">
          {!cameraActive && !analysis && (
            <button className="primary-button" type="button" onClick={startCamera}>
              Enable camera
            </button>
          )}
          <video
            ref={videoRef}
            className={`scan-video ${cameraActive ? '' : 'hidden'}`}
            autoPlay
            muted
            playsInline
          />
          {cameraActive && (
            <div className="scan-camera-controls">
              <button className="primary-button" type="button" onClick={captureCamera}>Capture & analyse</button>
              <button className="secondary-button" type="button" onClick={stopCamera}>Cancel</button>
            </div>
          )}
        </div>
      ) : (
        <div className="scan-upload">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <button className="primary-button" type="button" onClick={() => fileRef.current?.click()} disabled={loading}>
            {loading ? 'Analysing...' : 'Upload photo'}
          </button>
        </div>
      )}

      {loading && <div className="scan-loading"><div className="loading-mark" /><p>Reading the signals...</p></div>}
      {error && <p className="notice">{error}</p>}

      {analysis && (
        <div className="scan-results">
          <p className="scan-summary">{analysis.summary}</p>
          {analysis.stressSignals?.length > 0 && (
            <div className="scan-block scan-stress">
              <h4>Stress signals noticed</h4>
              <ul>{analysis.stressSignals.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </div>
          )}
          {analysis.positiveSignals?.length > 0 && (
            <div className="scan-block scan-positive">
              <h4>Positive signals</h4>
              <ul>{analysis.positiveSignals.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </div>
          )}
          {analysis.observations?.length > 0 && (
            <div className="scan-block">
              <h4>What I noticed</h4>
              <ul>{analysis.observations.map((s, i) => <li key={i}>{s}</li>)}</ul>
            </div>
          )}
          <div className="scan-block scan-tip">
            <h4>One thing to try</h4>
            <p>{analysis.suggestion}</p>
          </div>
        </div>
      )}
    </section>
  );
}

async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 768;
        let w = img.width;
        let h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
          else { w = Math.round(w * MAX / h); h = MAX; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.78));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ─── Graph Map ───────────────────────────────────────────────────────────── */

function buildGraph(entries) {
  const nodes = [{
    id: 'center', type: 'core', label: 'Journal', detail: `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`, radius: 32
  }];
  const edges = [];

  entries.forEach((entry, entryIndex) => {
    const entryNodeId = `entry-${entry.id}`;
    nodes.push({
      id: entryNodeId, type: 'entry',
      label: entry.exam || 'Entry',
      detail: `${formatDate(entry.createdAt)} · mood ${entry.mood} · ${entry.analysis?.stressLevel || 'new'}`,
      radius: 24, entryIndex,
      mood: Number(entry.mood) || 5,
      stressLevel: entry.analysis?.stressLevel || 'new',
      burnoutRisk: entry.analysis?.burnoutRiskScore || 40
    });
    edges.push({ from: 'center', to: entryNodeId, type: 'entry' });

    (entry.insightBubbles || []).forEach((bubble, bubbleIndex) => {
      const bubbleNodeId = `insight-${entry.id}-${bubble.id || bubbleIndex}`;
      nodes.push({
        id: bubbleNodeId, type: 'insight',
        label: bubble.category || 'Insight',
        detail: bubble.text,
        radius: 15, entryIndex, bubbleIndex,
        accent: bubble.accent
      });
      edges.push({ from: entryNodeId, to: bubbleNodeId, type: 'insight' });
    });
  });

  return { nodes, edges };
}

function GraphMapSection({ entries }) {
  const canvasRef = useRef(null);
  const panelRef = useRef(null);
  const renderedNodesRef = useRef([]);
  const physicsRef = useRef({ positions: {}, velocities: {}, tick: 0 });
  const [hoveredNode, setHoveredNode] = useState(null);
  const graph = useMemo(() => buildGraph(entries), [entries]);

  useEffect(() => {
    physicsRef.current = { positions: {}, velocities: {}, tick: 0 };
  }, [graph]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const panel = panelRef.current;
    if (!canvas || !panel) return undefined;
    const ctx = canvas.getContext('2d');
    let rafId = 0;
    let lastTime = performance.now();

    function cssVar(name) {
      return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    }

    function runPhysics(nodes, edges, width, height) {
      const state = physicsRef.current;
      const centerX = width / 2;
      const centerY = height / 2;

      nodes.forEach((node) => {
        if (!state.positions[node.id]) {
          const angle = Math.random() * Math.PI * 2;
          const r = 50 + Math.random() * 100;
          state.positions[node.id] = { x: centerX + Math.cos(angle) * r, y: centerY + Math.sin(angle) * r };
          state.velocities[node.id] = { x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2 };
        }
      });

      const cooling = Math.max(0.1, 1 - state.tick / 220);
      const forces = {};
      nodes.forEach((n) => { forces[n.id] = { x: 0, y: 0 }; });

      nodes.forEach((a) => {
        const pa = state.positions[a.id];
        forces[a.id].x += (centerX - pa.x) * 0.018 * cooling;
        forces[a.id].y += (centerY - pa.y) * 0.018 * cooling;

        nodes.forEach((b) => {
          if (a.id >= b.id) return;
          const pb = state.positions[b.id];
          const dx = pa.x - pb.x;
          const dy = pa.y - pb.y;
          const dist = Math.hypot(dx, dy) || 1;
          const repulse = (2200 / (dist * dist)) * cooling;
          const fx = (dx / dist) * repulse;
          const fy = (dy / dist) * repulse;
          forces[a.id].x += fx;
          forces[a.id].y += fy;
          forces[b.id].x -= fx;
          forces[b.id].y -= fy;
        });
      });

      edges.forEach((edge) => {
        const pa = state.positions[edge.from];
        const pb = state.positions[edge.to];
        if (!pa || !pb) return;
        const dx = pb.x - pa.x;
        const dy = pb.y - pa.y;
        const dist = Math.hypot(dx, dy) || 1;
        const target = edge.type === 'entry' ? 155 : 82;
        const spring = (dist - target) * 0.055 * cooling;
        const fx = (dx / dist) * spring;
        const fy = (dy / dist) * spring;
        forces[edge.from].x += fx;
        forces[edge.from].y += fy;
        forces[edge.to].x -= fx;
        forces[edge.to].y -= fy;
      });

      nodes.forEach((node) => {
        const vel = state.velocities[node.id];
        const pos = state.positions[node.id];
        vel.x = (vel.x + forces[node.id].x) * 0.78;
        vel.y = (vel.y + forces[node.id].y) * 0.78;
        pos.x = Math.max(node.radius + 16, Math.min(width - node.radius - 16, pos.x + vel.x));
        pos.y = Math.max(node.radius + 16, Math.min(height - node.radius - 16, pos.y + vel.y));
      });

      if (state.tick < 400) state.tick++;
    }

    function draw(now) {
      const rect = panel.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = Math.max(320, rect.width);
      const height = Math.max(420, rect.height);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const colors = {
        ink: cssVar('--ink') || '#25211d',
        muted: cssVar('--muted') || '#726b62',
        line: cssVar('--line') || '#d8cabc',
        brand: cssVar('--brand') || '#2f6f73',
        panel: cssVar('--panel') || '#ffffff'
      };

      const t = (now / 1000) % (Math.PI * 2);

      runPhysics(graph.nodes, graph.edges, width, height);
      const state = physicsRef.current;

      const rendered = graph.nodes.map((node) => ({
        ...node,
        x: state.positions[node.id]?.x || width / 2,
        y: state.positions[node.id]?.y || height / 2
      }));
      const byId = new Map(rendered.map((n) => [n.id, n]));
      renderedNodesRef.current = rendered;

      ctx.save();
      ctx.lineCap = 'round';
      graph.edges.forEach((edge) => {
        const from = byId.get(edge.from);
        const to = byId.get(edge.to);
        if (!from || !to) return;
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.strokeStyle = edge.type === 'insight' ? colors.line : colors.brand;
        ctx.globalAlpha = edge.type === 'insight' ? 0.45 : 0.65;
        ctx.lineWidth = edge.type === 'insight' ? 1.2 : 2;
        ctx.stroke();
      });
      ctx.restore();

      rendered.forEach((node) => {
        const isHovered = hoveredNode?.id === node.id;
        const pulse = node.type === 'entry' && node.burnoutRisk > 60 ? 2 + Math.sin(t * 2.2) * 2.5 : 0;

        if (pulse > 0) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + pulse + 6, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(228, 93, 79, 0.14)';
          ctx.fill();
          ctx.restore();
        }

        const fill = node.type === 'core' ? colors.ink : node.type === 'entry' ? moodToColor(node.mood) : (node.accent || '#d89b2b');
        const strokeColor = node.type === 'core' ? colors.ink : node.type === 'entry' ? colors.ink : colors.ink;

        ctx.save();
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + (isHovered ? 4 : 0), 0, Math.PI * 2);
        ctx.fillStyle = fill;
        ctx.shadowColor = isHovered ? fill : 'rgba(37,33,29,0.16)';
        ctx.shadowBlur = isHovered ? 20 : 10;
        ctx.shadowOffsetY = 4;
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.lineWidth = node.type === 'insight' ? 2 : 1.5;
        ctx.strokeStyle = strokeColor;
        ctx.globalAlpha = 0.3;
        ctx.stroke();
        ctx.globalAlpha = 1;

        ctx.fillStyle = node.type === 'core' ? '#fffdf8' : node.type === 'entry' ? '#fffdf8' : '#fffdf8';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = node.type === 'insight' ? '700 9px Inter,sans-serif' : '700 10px Inter,sans-serif';
        const labelText = node.type === 'insight' ? node.label.slice(0, 1) : node.label.slice(0, 10);
        ctx.fillText(labelText, node.x, node.y);
        ctx.restore();
      });

      lastTime = now;
      rafId = requestAnimationFrame(draw);
    }

    const observer = new ResizeObserver(() => {
      physicsRef.current.tick = Math.min(physicsRef.current.tick, 50);
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(draw);
    });
    observer.observe(panel);
    rafId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [graph, hoveredNode]);

  function handlePointerMove(event) {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const nearest = renderedNodesRef.current.find((n) => Math.hypot(n.x - x, n.y - y) <= n.radius + 8);
    setHoveredNode(nearest || null);
  }

  return (
    <section className="graph-section">
      <div className="section-heading graph-heading">
        <div>
          <p className="eyebrow">Canvas map</p>
          <h2>Trace the shape of your journal</h2>
        </div>
        <div className="graph-legend" aria-label="Graph legend">
          <span><i className="legend-core" />Core</span>
          <span><i className="legend-entry-low" />Low mood</span>
          <span><i className="legend-entry-mid" />Mid mood</span>
          <span><i className="legend-entry-high" />High mood</span>
          <span><i className="legend-insight" />Insight</span>
        </div>
      </div>
      <div className="graph-canvas-panel" ref={panelRef}>
        <canvas
          ref={canvasRef}
          className="graph-canvas"
          aria-label="Journal graph map"
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoveredNode(null)}
        />
        {!entries.length && (
          <div className="graph-empty">
            <EmptyState title="No graph yet" text="Save a journal entry and this canvas will map your mood, stress signals, and insight connections." />
          </div>
        )}
        {hoveredNode && (
          <div className="graph-tooltip">
            <strong>{hoveredNode.label}</strong>
            <span>{hoveredNode.detail}</span>
          </div>
        )}
      </div>
    </section>
  );
}

/* ─── Auth Screens ────────────────────────────────────────────────────────── */

function LoadingScreen() {
  return <div className="auth-frame"><div className="loading-mark" /><p>Loading MindTrail...</p></div>;
}

function AuthScreen({ clerkEnabled, onTesterReady }) {
  const [testerLoading, setTesterLoading] = useState(false);
  const [testerError, setTesterError] = useState('');

  async function signInTester() {
    setTesterLoading(true);
    setTesterError('');
    try {
      const res = await fetch('/api/tester', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Tester login failed');
      onTesterReady();
    } catch (err) {
      setTesterError(err.message || 'Tester login failed');
    } finally {
      setTesterLoading(false);
    }
  }

  return (
    <div className="auth-frame">
      <section className="auth-panel">
        <p className="eyebrow">Private journal, real memory</p>
        <h1>Sign in to enter MindTrail</h1>
        <p>Your companion, journal history, AI insight bubbles, and guestbook identity all live behind your account.</p>
        <div className="auth-actions">
          <button className="primary-button" type="button" onClick={signInTester} disabled={testerLoading}>
            {testerLoading ? 'Entering...' : 'Tester login'}
          </button>
          {clerkEnabled && (
            <>
              <SignInButton mode="modal"><button className="primary-button" type="button">Log in</button></SignInButton>
              <SignUpButton mode="modal"><button className="secondary-button" type="button">Create account</button></SignUpButton>
            </>
          )}
        </div>
        {testerError && <p className="auth-error">{testerError}</p>}
      </section>
    </div>
  );
}

function SettingsMenu({ buddyOn, onToggleBuddy, petSkin, onChangePetSkin }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className="icon-button settings-trigger"
        type="button"
        aria-label="Settings"
        onClick={() => setOpen(true)}
      >
        <GearIcon />
      </button>
      {open && (
        <SettingsModal
          buddyOn={buddyOn}
          onToggleBuddy={onToggleBuddy}
          petSkin={petSkin}
          onChangePetSkin={onChangePetSkin}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function readActive() {
  try {
    return {
      key: localStorage.getItem(API_KEY_STORAGE) || '',
      preset: localStorage.getItem(PRESET_STORAGE) || '',
      model: localStorage.getItem(MODEL_STORAGE) || '',
      baseURL: localStorage.getItem(BASEURL_STORAGE) || ''
    };
  } catch { return { key: '', preset: '', model: '', baseURL: '' }; }
}

function SettingsModal({ buddyOn, onToggleBuddy, petSkin, onChangePetSkin, onClose }) {
  const [active, setActive] = useState(readActive);
  const initialPreset = active.preset || 'gemini';
  const [presetCode, setPresetCode] = useState(initialPreset);
  const [keyDraft, setKeyDraft] = useState('');
  const [modelDraft, setModelDraft] = useState(() => presetByCode(initialPreset)?.model || '');
  const [baseDraft, setBaseDraft] = useState(() => presetByCode(initialPreset)?.baseURL || '');
  const [status, setStatus] = useState(null); // { kind: 'ok'|'err'|'busy'|'info', text }
  const [lang, setLang] = useState(() => { try { return localStorage.getItem(LANG_STORAGE) || 'auto'; } catch { return 'auto'; } });

  const preset = presetByCode(presetCode);
  const isLocal = preset?.kind === 'local';
  const isCustom = preset?.kind === 'custom';
  const needsKey = !preset?.keyless;
  const showBaseUrl = isCustom || isLocal;

  function selectPreset(code) {
    const p = presetByCode(code);
    setPresetCode(code);
    setModelDraft(p?.model || '');
    setBaseDraft(p?.baseURL || '');
    setStatus(null);
  }

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function changeLang(value) {
    setLang(value);
    try { localStorage.setItem(LANG_STORAGE, value); } catch {}
  }

  function buildPayload() {
    return {
      key: needsKey ? keyDraft.trim() : 'local',
      provider: serverProviderFor(preset),
      model: modelDraft.trim() || preset?.model || '',
      baseURL: showBaseUrl ? baseDraft.trim() : (preset?.baseURL || '')
    };
  }

  async function testProvider() {
    if (needsKey && !keyDraft.trim()) { setStatus({ kind: 'err', text: 'Enter your API key first.' }); return; }
    if (showBaseUrl && !baseDraft.trim()) { setStatus({ kind: 'err', text: 'Enter the base URL first.' }); return; }
    setStatus({ kind: 'busy', text: 'Testing connection…' });
    try {
      const res = await fetch('/api/provider-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload())
      });
      const data = await res.json();
      if (data.ok) setStatus({ kind: 'ok', text: `Connected ✓ ${data.model || ''}`.trim() });
      else setStatus({ kind: 'err', text: data.error || 'Could not connect.' });
    } catch {
      setStatus({ kind: 'err', text: 'Could not reach the provider.' });
    }
  }

  function save() {
    const payload = buildPayload();
    if (needsKey && payload.key.length < 8) { setStatus({ kind: 'err', text: 'That key looks too short.' }); return; }
    if (showBaseUrl && !payload.baseURL) { setStatus({ kind: 'err', text: 'Enter the base URL.' }); return; }
    try {
      localStorage.setItem(API_KEY_STORAGE, payload.key);
      localStorage.setItem(PROVIDER_STORAGE, payload.provider);
      localStorage.setItem(PRESET_STORAGE, presetCode);
      if (payload.model) localStorage.setItem(MODEL_STORAGE, payload.model); else localStorage.removeItem(MODEL_STORAGE);
      if (payload.baseURL) localStorage.setItem(BASEURL_STORAGE, payload.baseURL); else localStorage.removeItem(BASEURL_STORAGE);
    } catch {}
    setActive(readActive());
    setKeyDraft('');
    setStatus({ kind: 'ok', text: `Saved. Using ${preset?.label} for all AI features.` });
  }

  function remove() {
    try {
      [API_KEY_STORAGE, PROVIDER_STORAGE, PRESET_STORAGE, MODEL_STORAGE, BASEURL_STORAGE].forEach((k) => localStorage.removeItem(k));
    } catch {}
    setActive(readActive());
    setKeyDraft('');
    setStatus({ kind: 'info', text: 'Removed. Using the app default again.' });
  }

  const activePreset = active.preset ? presetByCode(active.preset) : null;
  const masked = active.key && active.key !== 'local' ? `${active.key.slice(0, 4)}••••••${active.key.slice(-3)}` : 'no key (local)';

  return (
    <div className="modal-scrim" onMouseDown={onClose}>
      <div className="settings-modal" role="dialog" aria-modal="true" aria-label="Settings" onMouseDown={(e) => e.stopPropagation()}>
        <div className="settings-modal-head">
          <h2>Settings</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close settings">✕</button>
        </div>

        <div className="settings-modal-body">
          <section className="settings-section">
            <p className="settings-title">AI provider</p>
            <p className="settings-sub">Use your own key from <strong>any</strong> provider. Most speak the OpenAI-compatible API, so almost anything works — or pick “Custom” and paste any base URL. Stored only in this browser, never in our database, kept until you remove it.</p>

            {active.key ? (
              <div className="active-card">
                <div className="active-card-main">
                  <span className="active-dot" />
                  <div>
                    <p className="active-name">{activePreset?.label || active.provider || 'Custom provider'}</p>
                    <p className="active-meta">{(active.model || activePreset?.model || 'default model')} · <code>{masked}</code></p>
                  </div>
                </div>
                <button type="button" className="key-btn key-btn-remove" onClick={remove}>Remove</button>
              </div>
            ) : (
              <p className="settings-note">No custom key set — using the app’s default Gemini key.</p>
            )}

            <div className="provider-grid" aria-label="Choose a provider">
              {PRESETS.map((p) => (
                <button
                  key={p.code}
                  type="button"
                  className={`provider-chip${presetCode === p.code ? ' provider-chip-on' : ''}`}
                  data-kind={p.kind}
                  aria-pressed={presetCode === p.code}
                  onClick={() => selectPreset(p.code)}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div className="provider-fields">
              {needsKey && (
                <input
                  className="input"
                  type="password"
                  value={keyDraft}
                  onChange={(e) => { setKeyDraft(e.target.value); setStatus(null); }}
                  placeholder={`${preset?.label || 'Provider'} API key`}
                  autoComplete="off"
                  spellCheck={false}
                />
              )}
              {showBaseUrl && (
                <input
                  className="input"
                  value={baseDraft}
                  onChange={(e) => { setBaseDraft(e.target.value); setStatus(null); }}
                  placeholder="Base URL (e.g. https://api.example.com/v1)"
                  autoComplete="off"
                  spellCheck={false}
                />
              )}
              <input
                className="input"
                value={modelDraft}
                onChange={(e) => setModelDraft(e.target.value)}
                placeholder={preset?.model ? `model (default: ${preset.model})` : 'model name'}
                autoComplete="off"
                spellCheck={false}
              />
            </div>

            <div className="provider-actions">
              <button type="button" className="key-btn key-btn-ghost" onClick={testProvider}>Test</button>
              <button type="button" className="key-btn key-btn-insert" onClick={save}>Insert</button>
              {preset?.keyUrl && <a className="settings-link" href={preset.keyUrl} target="_blank" rel="noreferrer">Get a key →</a>}
            </div>

            {status && <p className={`settings-status status-${status.kind}`}>{status.text}</p>}
          </section>

          <section className="settings-section">
            <p className="settings-title">Conversation language</p>
            <p className="settings-sub">Talk and chat in your language. The companion replies in the same language, and voice listens for it.</p>
            <select className="input" value={lang} onChange={(e) => changeLang(e.target.value)} aria-label="Conversation language">
              {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </section>

          <section className="settings-section">
            <div className="settings-toggle-row">
              <div>
                <p className="settings-title">Study buddy</p>
                <p className="settings-sub">A pixel pet that roams the page and follows your cursor. Drag it around to play.</p>
              </div>
              <button
                type="button"
                className={`switch${buddyOn ? ' switch-on' : ''}`}
                role="switch"
                aria-checked={buddyOn}
                aria-label="Toggle study buddy"
                onClick={onToggleBuddy}
              >
                <span className="switch-knob" />
              </button>
            </div>
            {buddyOn && (
              <div className="pet-grid">
                {PET_SKINS.map((s) => (
                  <button
                    key={s.code}
                    type="button"
                    className={`provider-chip${petSkin === s.code ? ' provider-chip-on' : ''}`}
                    aria-pressed={petSkin === s.code}
                    onClick={() => onChangePetSkin(s.code)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function TesterProfileMenu({ onSignOut, loading }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="tester-profile">
      <button className="tester-avatar-button" type="button" aria-expanded={open} aria-label="Tester profile" onClick={() => setOpen((c) => !c)}>
        <span className="tester-avatar">T</span>
      </button>
      {open && (
        <div className="tester-menu" role="menu">
          <div className="tester-menu-header">
            <span className="tester-avatar tester-avatar-large">T</span>
            <div>
              <p className="tester-menu-name">Tester Session</p>
              <p className="tester-menu-email">Local evaluator access</p>
            </div>
          </div>
          <span className="tester-menu-badge">Signed app session</span>
          <button className="tester-menu-action" type="button" role="menuitem" onClick={onSignOut} disabled={loading}>
            {loading ? 'Signing out...' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  );
}

function OnboardingCard({ name, onDone }) {
  return (
    <section className="onboarding">
      <div>
        <p className="eyebrow">First run</p>
        <h2>Welcome, {name}</h2>
        <p>Start with one honest journal entry. The companion will ask questions to understand you — not lecture you. Relief Room has tools that actually help when studying gets overwhelming.</p>
      </div>
      <button className="primary-button" type="button" onClick={onDone}>Begin</button>
    </section>
  );
}

function Stat({ label, value, highlight }) {
  return (
    <div className="stat" data-highlight={highlight}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

/* ─── Speech Input Hook ───────────────────────────────────────────────────── */

const noopSubscribe = () => () => {};

function useSpeechInput() {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [voiceError, setVoiceError] = useState('');

  const supported = useSyncExternalStore(
    noopSubscribe,
    () => Boolean(window.SpeechRecognition || window.webkitSpeechRecognition),
    () => false
  );

  const recRef = useRef(null);
  const keepAliveRef = useRef(false);
  const langRef = useRef('en-US');
  const netRetryRef = useRef(0);
  const callbacksRef = useRef({ onResult: null, onEnd: null, continuous: true });

  useEffect(() => {
    return () => {
      keepAliveRef.current = false;
      try { recRef.current?.abort(); } catch {}
    };
  }, []);

  function buildRec() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.continuous = callbacksRef.current.continuous;
    rec.interimResults = true;
    rec.lang = langRef.current || 'en-US';
    rec.maxAlternatives = 1;

    rec.onresult = (e) => {
      let finalText = '';
      let interimText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
        else interimText += e.results[i][0].transcript;
      }
      if (interimText.trim() || finalText.trim()) netRetryRef.current = 0;
      setInterim(interimText);
      if (interimText.trim()) callbacksRef.current.onInterim?.(interimText.trim());
      if (finalText.trim()) {
        setInterim('');
        callbacksRef.current.onResult?.(finalText.trim());
      }
    };

    rec.onend = () => {
      setInterim('');
      if (keepAliveRef.current && callbacksRef.current.continuous) {
        try {
          const next = buildRec();
          recRef.current = next;
          next.start();
          return;
        } catch {}
      }
      keepAliveRef.current = false;
      setListening(false);
      callbacksRef.current.onEnd?.();
    };

    rec.onerror = (e) => {
      setInterim('');
      if (e.error === 'aborted' || e.error === 'no-speech') return;
      // 'network' from the browser speech service is often a transient blip —
      // let keep-alive silently restart a few times before surfacing anything.
      if (e.error === 'network' && callbacksRef.current.continuous && netRetryRef.current < 4) {
        netRetryRef.current += 1;
        return;
      }
      keepAliveRef.current = false;
      setListening(false);
      const isEdge = navigator.userAgent.includes('Edg/');
      const map = {
        'not-allowed': 'Microphone access was blocked. Click the lock/mic icon in your address bar → allow Microphone, then reload.',
        'service-not-allowed': isEdge
          ? 'Edge speech service unavailable. Turn ON Windows Settings → Privacy & security → Speech → "Online speech recognition", then reload.'
          : 'Speech recognition is unavailable here. Try Chrome or Edge over https:// or localhost.',
        'audio-capture': 'No microphone detected. Please connect one.',
        'network': 'The browser’s speech service keeps dropping. You can still type to chat, or tap to try voice again.',
      };
      setVoiceError(map[e.error] || `Voice error: ${e.error}`);
    };

    return rec;
  }

  function start({ continuous = true, onResult, onInterim, onEnd, lang } = {}) {
    if (!supported) {
      setVoiceError('Voice input is not supported in this browser. Try Chrome or Edge.');
      return;
    }
    langRef.current = lang || getPreferredLang();
    netRetryRef.current = 0;
    keepAliveRef.current = false;
    const prev = recRef.current;
    if (prev) {
      prev.onresult = null;
      prev.onend = null;
      prev.onerror = null;
      try { prev.abort(); } catch {}
      recRef.current = null;
    }
    setVoiceError('');
    setInterim('');
    callbacksRef.current = { onResult, onInterim, onEnd, continuous };
    keepAliveRef.current = continuous;
    const rec = buildRec();
    recRef.current = rec;
    // SpeechRecognition triggers the browser's native mic permission dialog
    // on its own — no getUserMedia pre-check needed.
    rec.start();
    setListening(true);
  }

  function stop() {
    keepAliveRef.current = false;
    setInterim('');
    setListening(false);
    try { recRef.current?.abort(); } catch {}
    callbacksRef.current.onEnd?.();
    callbacksRef.current = { onResult: null, onInterim: null, onEnd: null, continuous: true };
  }

  return { listening, interim, voiceError, start, stop, supported };
}

/* ─── Speech Output Hook (text-to-speech) ─────────────────────────────────── */

const PREFERRED_VOICES = [
  'Google US English',
  'Microsoft Aria',
  'Microsoft Jenny',
  'Microsoft Michelle',
  'Samantha',
  'Google UK English Female'
];

function pickVoiceForLang(voices, lang) {
  if (!voices.length) return null;
  const base = (lang || 'en').slice(0, 2).toLowerCase();
  if (base === 'en') {
    const byName = voices.find((v) => PREFERRED_VOICES.some((n) => v.name.includes(n)));
    if (byName) return byName;
  }
  return (
    voices.find((v) => v.lang?.toLowerCase() === (lang || '').toLowerCase()) ||
    voices.find((v) => v.lang?.toLowerCase().startsWith(base)) ||
    voices.find((v) => v.lang?.startsWith('en')) ||
    voices[0]
  );
}

function takeSentence(buffer) {
  const match = buffer.match(/[.!?…\n]+(\s|$)/);
  if (!match) return null;
  const end = match.index + match[0].length;
  return { sentence: buffer.slice(0, end).trim(), rest: buffer.slice(end) };
}

function useSpeechOutput() {
  const [speaking, setSpeaking] = useState(false);
  const voicesRef = useRef([]);
  const prefLangRef = useRef('en-US');
  const queueRef = useRef([]);
  const playingRef = useRef(false);
  const endedRef = useRef(true);
  const doneRef = useRef(null);

  const supported = useSyncExternalStore(
    noopSubscribe,
    () => Boolean(window.speechSynthesis && window.SpeechSynthesisUtterance),
    () => false
  );

  useEffect(() => {
    if (!supported) return undefined;
    const choose = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length) voicesRef.current = voices;
    };
    choose();
    window.speechSynthesis.addEventListener('voiceschanged', choose);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', choose);
      try { window.speechSynthesis.cancel(); } catch {}
    };
  }, [supported]);

  const pumpRef = useRef(() => {});
  useEffect(() => {
    pumpRef.current = () => {
      if (playingRef.current) return;
      if (queueRef.current.length === 0) {
        if (endedRef.current) {
          setSpeaking(false);
          const cb = doneRef.current;
          doneRef.current = null;
          cb?.();
        }
        return;
      }
      const text = queueRef.current.shift();
      playingRef.current = true;
      const utter = new SpeechSynthesisUtterance(text);
      const lang = detectLang(text, prefLangRef.current);
      const voice = pickVoiceForLang(voicesRef.current, lang);
      if (voice) utter.voice = voice;
      utter.lang = voice?.lang || lang || 'en-US';
      utter.rate = 1.05;
      utter.pitch = 1.0;
      utter.volume = 1.0;
      utter.onend = () => { playingRef.current = false; pumpRef.current(); };
      utter.onerror = () => { playingRef.current = false; pumpRef.current(); };
      try { window.speechSynthesis.speak(utter); } catch { playingRef.current = false; pumpRef.current(); }
    };
  });

  const cancel = useCallback(() => {
    queueRef.current = [];
    playingRef.current = false;
    endedRef.current = true;
    doneRef.current = null;
    if (supported) { try { window.speechSynthesis.cancel(); } catch {} }
    setSpeaking(false);
  }, [supported]);

  // Streaming sink: push sentences as they arrive, call end() when the source is done.
  const beginStream = useCallback(({ onEnd } = {}) => {
    if (!supported) {
      let finished = false;
      return { push: () => {}, end: () => { if (!finished) { finished = true; onEnd?.(); } } };
    }
    try { window.speechSynthesis.cancel(); } catch {}
    prefLangRef.current = getPreferredLang();
    queueRef.current = [];
    playingRef.current = false;
    endedRef.current = false;
    doneRef.current = onEnd || null;
    setSpeaking(true);
    return {
      push: (sentence) => {
        const value = (sentence || '').trim();
        if (!value) return;
        queueRef.current.push(value);
        pumpRef.current();
      },
      end: () => { endedRef.current = true; pumpRef.current(); }
    };
  }, [supported]);

  return { supported, speaking, beginStream, cancel };
}

/* ─── Journal Section ─────────────────────────────────────────────────────── */

function JournalSection({ form, entries, loading, onUpdate, onSubmit, onInvoke }) {
  const speech = useSpeechInput();

  function handleVoiceMic() {
    if (speech.listening) { speech.stop(); return; }
    speech.start({
      continuous: true,
      onResult: (text) => {
        onUpdate('journal', (current) => current ? `${current} ${text}` : text);
      }
    });
  }

  return (
    <section className="journal-layout">
      <form className="journal-composer" onSubmit={onSubmit}>
        <div>
          <p className="eyebrow">Today</p>
          <h2>Write the real version</h2>
        </div>
        <input className="input" value={form.exam} onChange={(e) => onUpdate('exam', e.target.value)} placeholder="Exam focus" maxLength={80} required />
        <div className="range-grid">
          <Range label="Mood" value={form.mood} onChange={(v) => onUpdate('mood', v)} />
          <Range label="Energy" value={form.energy} onChange={(v) => onUpdate('energy', v)} />
          <Range label="Sleep" min={0} max={16} step={0.5} suffix="h" value={form.sleepHours} onChange={(v) => onUpdate('sleepHours', v)} />
        </div>
        <div className="journal-textarea-wrap">
          <textarea
            className="input journal-textarea"
            value={form.journal}
            onChange={(e) => onUpdate('journal', e.target.value)}
            placeholder="What happened, what kept looping in your head, what helped, what felt heavy?"
            minLength={30}
            maxLength={4000}
            required
          />
          {speech.supported && (
            <button
              type="button"
              className={`voice-btn ${speech.listening ? 'voice-btn-active' : ''}`}
              onClick={handleVoiceMic}
              title={speech.listening ? 'Stop voice input' : 'Tap to dictate'}
              aria-label={speech.listening ? 'Stop dictation' : 'Dictate journal entry'}
            >
              {speech.listening ? <StopIcon /> : <MicIcon />}
            </button>
          )}
        </div>
        {speech.interim && <p className="voice-interim">{speech.interim}</p>}
        {speech.listening && !speech.interim && <p className="voice-hint">Listening… speak naturally. Tap stop when done.</p>}
        {speech.voiceError && <p className="voice-error-msg">{speech.voiceError}</p>}
        <button className="primary-button" type="submit" disabled={loading === 'entry'}>{loading === 'entry' ? 'Analysing...' : 'Save journal entry'}</button>
      </form>

      <div className="entry-stack">
        {entries.length === 0 && <EmptyState title="No entries yet" text="Your first entry unlocks analysis, chat memory, and entry-level suggestions." />}
        {entries.map((entry) => (
          <article className="entry-block" key={entry.id}>
            <div className="entry-card">
              <div className="entry-meta">
                <span>{formatDate(entry.createdAt)}</span>
                <span className={`stress-chip ${stressClass(entry.analysis?.stressLevel)}`}>{entry.analysis?.stressLevel || 'new'}</span>
              </div>
              <h3>{entry.exam}</h3>
              <p>{entry.analysis?.summary}</p>
              {entry.analysis?.followUpQuestion && (
                <p className="follow-up-q">💬 {entry.analysis.followUpQuestion}</p>
              )}
              <div className="entry-numbers">
                <span>Mood {entry.mood}</span>
                <span>Energy {entry.energy}</span>
                <span>Sleep {entry.sleepHours}h</span>
                {entry.analysis?.burnoutRiskScore !== undefined && (
                  <span className={entry.analysis.burnoutRiskScore > 60 ? 'tone-high' : ''}>
                    Burnout risk {Math.round(entry.analysis.burnoutRiskScore)}%
                  </span>
                )}
              </div>
              <button className="invoke-button" type="button" onClick={() => onInvoke(entry.id)} disabled={loading === `insights-${entry.id}`}>
                {loading === `insights-${entry.id}` ? 'Invoking...' : 'Invoke Suggestions'}
              </button>
            </div>
            <BubbleMasonry bubbles={entry.insightBubbles || []} />
          </article>
        ))}
      </div>
    </section>
  );
}

function Range({ label, value, onChange, min = 1, max = 10, step = 1, suffix = '' }) {
  return (
    <label className="range-field">
      <span>{label}</span>
      <strong>{value}{suffix}</strong>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

function BubbleMasonry({ bubbles }) {
  if (!bubbles.length) return null;
  return (
    <div className="bubble-masonry">
      {bubbles.map((bubble) => (
        <div className="insight-bubble" key={bubble.id} style={{ '--accent': bubble.accent }}>
          <span>{bubble.category}</span>
          <p>{bubble.text}</p>
        </div>
      ))}
    </div>
  );
}

/* ─── Chat Section ────────────────────────────────────────────────────────── */

function MicIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 1a4 4 0 0 1 4 4v7a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm0 2a2 2 0 0 0-2 2v7a2 2 0 0 0 4 0V5a2 2 0 0 0-2-2zm7 9a1 1 0 0 1 1 1 8 8 0 0 1-7 7.94V22a1 1 0 0 1-2 0v-1.06A8 8 0 0 1 4 13a1 1 0 0 1 2 0 6 6 0 0 0 12 0 1 1 0 0 1 1-1z" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="5" y="5" width="14" height="14" rx="2" />
    </svg>
  );
}

function ChatSection({ chatLog, chatText, loading, chatEndRef, onText, onSubmit, onSendText, onAppendMessage }) {
  const speech = useSpeechInput();
  const tts = useSpeechOutput();
  const resultRef = useRef('');
  const [convoOpen, setConvoOpen] = useState(false);

  function handleVoiceToggle() {
    if (speech.listening) { speech.stop(); return; }
    resultRef.current = '';
    speech.start({
      continuous: false,
      onResult: (text) => { resultRef.current = text; onText(text); },
      onEnd: () => {
        const captured = resultRef.current.trim();
        resultRef.current = '';
        if (captured) onSendText(captured);
      }
    });
  }

  const displayValue = speech.interim || chatText;
  const liveSupported = speech.supported && tts.supported;

  return (
    <section className="chat-panel">
      <div className="section-heading chat-heading">
        <div>
          <p className="eyebrow">Companion</p>
          <h2>Talk it through</h2>
          <p className="section-subtext muted">Asks questions, listens, and tries to understand you — not lecture you. Type, speak, or go hands-free.</p>
        </div>
        {liveSupported && (
          <button type="button" className="live-launch" onClick={() => setConvoOpen(true)}>
            <SoundWaveIcon />
            <span>Conversation</span>
          </button>
        )}
      </div>

      {convoOpen && (
        <ConversationMode
          chatLog={chatLog}
          onAppendMessage={onAppendMessage}
          onClose={() => setConvoOpen(false)}
        />
      )}

      <div className="chat-feed">
        {!chatLog.length && (
          <EmptyState
            title="Just say what's on your mind"
            text="Your companion won't give you a list of tips. It'll ask questions, reflect back what you said, and try to actually understand what you're going through."
          />
        )}
        {chatLog.map((message, index) => (
          <div className={`chat-line ${message.role}`} key={`${message.role}-${index}`}>{message.content}</div>
        ))}
        {loading && <div className="chat-line companion thinking-dots"><span /><span /><span /></div>}
        <div ref={chatEndRef} />
      </div>

      {speech.voiceError && <p className="voice-error-msg">{speech.voiceError}</p>}

      <form className="chat-form" onSubmit={onSubmit}>
        <div className="chat-input-wrap">
          <input
            className="input"
            value={displayValue}
            onChange={(e) => { if (!speech.listening) onText(e.target.value); }}
            placeholder={speech.listening ? 'Listening…' : "What's actually going on right now?"}
            maxLength={1200}
            readOnly={speech.listening}
          />
          {speech.supported && (
            <button
              type="button"
              className={`mic-pill${speech.listening ? ' mic-pill-active' : ''}`}
              onClick={handleVoiceToggle}
              disabled={loading}
              aria-label={speech.listening ? 'Stop voice input' : 'Speak to companion'}
            >
              {speech.listening ? <StopIcon /> : <MicIcon />}
            </button>
          )}
        </div>
        <button className="primary-button" type="submit" disabled={loading || speech.listening}>Send</button>
      </form>
    </section>
  );
}

function SoundWaveIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <line x1="4" y1="10" x2="4" y2="14" />
      <line x1="8" y1="7" x2="8" y2="17" />
      <line x1="12" y1="4" x2="12" y2="20" />
      <line x1="16" y1="7" x2="16" y2="17" />
      <line x1="20" y1="10" x2="20" y2="14" />
    </svg>
  );
}

/* ─── Conversation Mode (hands-free voice) ────────────────────────────────── */

const CONVO_CAPTIONS = {
  connecting: 'Getting ready…',
  listening: 'Listening — just talk',
  thinking: 'Thinking…',
  speaking: 'Speaking — talk anytime to cut in',
  idle: 'Tap the orb when you want to talk',
  paused: 'Paused — tap to resume',
  error: 'Microphone needs permission',
  unsupported: 'Voice conversation is not supported here'
};

// Turn-taking timing (ms)
const SILENCE_MS = 1300;      // stop + respond after this much silence post-speech
const NO_SPEECH_MS = 9000;    // go idle if nothing is said at all
const BARGE_START_DELAY = 700; // wait before listening for interruptions while speaking
const BARGE_MIN_CHARS = 5;     // ignore tiny blips as interruptions

function wordSet(text) {
  return new Set((text.toLowerCase().match(/[a-z']+/g) || []));
}

// True when recognized speech is mostly the AI's own voice echoing back.
function looksLikeEcho(heard, spokenWords) {
  if (spokenWords.size === 0) return false;
  const words = (heard.toLowerCase().match(/[a-z']+/g) || []);
  if (!words.length) return true;
  const overlap = words.filter((w) => spokenWords.has(w)).length / words.length;
  return overlap >= 0.5;
}

function ConversationMode({ chatLog, onAppendMessage, onClose }) {
  const speech = useSpeechInput();
  const tts = useSpeechOutput();
  const [phase, setPhase] = useState('connecting');
  const [muted, setMuted] = useState(false);
  const [liveReply, setLiveReply] = useState('');

  const activeRef = useRef(true);
  const mutedRef = useRef(false);
  const phaseRef = useRef('connecting');
  const fns = useRef({});
  const feedRef = useRef(null);

  const heardRef = useRef('');
  const silenceTimerRef = useRef(null);
  const noSpeechTimerRef = useRef(null);
  const bargeTimerRef = useRef(null);
  const listenModeRef = useRef('turn');
  const turnDoneRef = useRef(false);
  const speechStartedRef = useRef(false);
  const spokenWordsRef = useRef(new Set());

  const setPh = useCallback((p) => { phaseRef.current = p; setPhase(p); }, []);

  // Keep the turn-loop closures fresh each render without writing refs during render.
  useEffect(() => {
    const clearTimers = () => {
      clearTimeout(silenceTimerRef.current);
      clearTimeout(noSpeechTimerRef.current);
      clearTimeout(bargeTimerRef.current);
    };
    fns.current.clearTimers = clearTimers;

    const resetSilence = () => {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => fns.current.finalizeTurn(), SILENCE_MS);
    };

    // mode: 'turn' = the user's turn to speak; 'barge' = listen for interruptions while the AI speaks.
    fns.current.startListen = (mode) => {
      if (!activeRef.current || mutedRef.current) { setPh('idle'); return; }
      clearTimers();
      listenModeRef.current = mode;
      heardRef.current = '';
      turnDoneRef.current = false;
      speechStartedRef.current = false;
      if (mode === 'turn') {
        setPh('listening');
        noSpeechTimerRef.current = setTimeout(() => {
          if (activeRef.current && !mutedRef.current && !speechStartedRef.current && listenModeRef.current === 'turn') {
            fns.current.stopListen();
            setPh('idle');
          }
        }, NO_SPEECH_MS);
      }
      speech.start({
        continuous: true,
        onInterim: (txt) => fns.current.onSpeech(txt, false),
        onResult: (txt) => fns.current.onSpeech(txt, true),
        onEnd: () => {}
      });
    };

    fns.current.onSpeech = (txt, isFinal) => {
      const value = (txt || '').trim();
      if (!value) return;
      if (listenModeRef.current === 'barge') {
        // ignore the AI's own voice echoing into the mic
        if (value.length < BARGE_MIN_CHARS) return;
        if (looksLikeEcho(value, spokenWordsRef.current)) return;
        tts.cancel();
        clearTimeout(bargeTimerRef.current);
        listenModeRef.current = 'turn';
        speechStartedRef.current = true;
        setPh('listening');
        if (isFinal) heardRef.current = (heardRef.current ? `${heardRef.current} ` : '') + value;
        resetSilence();
        return;
      }
      speechStartedRef.current = true;
      clearTimeout(noSpeechTimerRef.current);
      if (isFinal) heardRef.current = (heardRef.current ? `${heardRef.current} ` : '') + value;
      resetSilence();
    };

    fns.current.stopListen = () => {
      clearTimers();
      try { speech.stop(); } catch {}
    };

    fns.current.finalizeTurn = () => {
      if (turnDoneRef.current) return;
      turnDoneRef.current = true;
      clearTimers();
      const said = heardRef.current.trim();
      heardRef.current = '';
      try { speech.stop(); } catch {}
      if (said) fns.current.process(said);
      else if (activeRef.current && !mutedRef.current) setPh('idle');
    };

    fns.current.process = async (text) => {
      onAppendMessage({ role: 'student', content: text });
      setPh('thinking');
      setLiveReply('');
      spokenWordsRef.current = new Set();
      let speaker = null;
      let acc = '';
      let buffer = '';
      const ensureSpeaker = () => {
        if (!speaker) {
          setPh('speaking');
          speaker = tts.beginStream({
            onEnd: () => {
              if (!activeRef.current) return;
              if (listenModeRef.current === 'barge') return; // user already cut in
              fns.current.startListen('turn');
            }
          });
          // after a short delay, listen for the user interrupting (barge-in)
          clearTimeout(bargeTimerRef.current);
          bargeTimerRef.current = setTimeout(() => {
            if (activeRef.current && !mutedRef.current && phaseRef.current === 'speaking') {
              fns.current.startListen('barge');
            }
          }, BARGE_START_DELAY);
        }
        return speaker;
      };
      try {
        const res = await fetch('/api/chat/voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text })
        });
        if (!res.ok || !res.body) throw new Error('stream-failed');
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          if (!chunk) continue;
          acc += chunk;
          buffer += chunk;
          for (const w of wordSet(chunk)) spokenWordsRef.current.add(w);
          if (activeRef.current) setLiveReply(acc);
          let next;
          while ((next = takeSentence(buffer))) {
            if (next.sentence) ensureSpeaker().push(next.sentence);
            buffer = next.rest;
          }
        }
        if (buffer.trim()) ensureSpeaker().push(buffer.trim());
        const finalReply = acc.trim();
        setLiveReply('');
        if (finalReply) onAppendMessage({ role: 'companion', content: finalReply });
        if (!activeRef.current) { tts.cancel(); return; }
        if (speaker) speaker.end();
        else fns.current.startListen('turn');
      } catch {
        setLiveReply('');
        tts.cancel();
        if (activeRef.current) fns.current.startListen('turn');
      }
    };
  });

  useEffect(() => {
    activeRef.current = true;
    if (!speech.supported || !tts.supported) return undefined;
    const f = fns.current;
    const id = setTimeout(() => f.startListen?.('turn'), 250);
    return () => {
      activeRef.current = false;
      clearTimeout(id);
      f.clearTimers?.();
      try { speech.stop(); } catch {}
      tts.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (speech.voiceError) {
      fns.current.clearTimers?.();
      tts.cancel();
    }
  }, [speech.voiceError, tts]);

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' });
  }, [chatLog, phase, liveReply]);

  function toggleMute() {
    setMuted((prev) => {
      const next = !prev;
      mutedRef.current = next;
      if (next) {
        fns.current.stopListen?.();
        tts.cancel();
        setPh('paused');
      } else if (phaseRef.current !== 'speaking' && phaseRef.current !== 'thinking') {
        fns.current.startListen?.('turn');
      }
      return next;
    });
  }

  function handleOrbTap() {
    const p = phaseRef.current;
    if (p === 'speaking') {
      tts.cancel();
      fns.current.startListen?.('turn');
      return;
    }
    if (speech.voiceError || p === 'paused' || p === 'idle' || p === 'connecting') {
      if (muted) { setMuted(false); mutedRef.current = false; }
      fns.current.startListen?.('turn');
    }
  }

  function handleClose() {
    activeRef.current = false;
    fns.current.clearTimers?.();
    try { speech.stop(); } catch {}
    tts.cancel();
    onClose();
  }

  const displayPhase = (!speech.supported || !tts.supported)
    ? 'unsupported'
    : speech.voiceError
      ? 'error'
      : phase;
  const caption = speech.voiceError || CONVO_CAPTIONS[displayPhase] || '';
  const recent = chatLog.slice(-6);

  return (
    <div className="convo-overlay" role="dialog" aria-modal="true" aria-label="Voice conversation">
      <div className="convo-topbar">
        <span className="convo-badge"><span className="convo-live-dot" /> Live conversation</span>
        <button type="button" className="convo-close" onClick={handleClose} aria-label="End conversation">End</button>
      </div>

      <div className="convo-stage">
        <button
          type="button"
          className="convo-orb"
          data-phase={displayPhase}
          onClick={handleOrbTap}
          aria-label={displayPhase === 'speaking' ? 'Interrupt and speak' : 'Conversation status'}
        >
          <span className="convo-orb-core" />
          <span className="convo-orb-ring convo-orb-ring-1" />
          <span className="convo-orb-ring convo-orb-ring-2" />
          <span className="convo-orb-ring convo-orb-ring-3" />
          <span className="convo-orb-eq" aria-hidden>
            <i /><i /><i /><i /><i />
          </span>
        </button>
        <p className="convo-caption">{caption}</p>
        {speech.interim
          ? <p className="convo-interim">“{speech.interim}”</p>
          : <p className="convo-subhint">{displayPhase === 'idle' ? 'Tap the orb and start speaking' : 'You can talk over me anytime — headphones work best'}</p>}
      </div>

      <div className="convo-feed" ref={feedRef}>
        {recent.map((message, index) => (
          <div className={`convo-line ${message.role}`} key={`${message.role}-${index}-${message.content.slice(0, 8)}`}>
            {message.content}
          </div>
        ))}
        {liveReply && <div className="convo-line companion convo-line-live">{liveReply}</div>}
      </div>

      <div className="convo-controls">
        <button
          type="button"
          className={`convo-ctrl${muted ? ' convo-ctrl-active' : ''}`}
          onClick={toggleMute}
          disabled={displayPhase === 'unsupported'}
          aria-label={muted ? 'Unmute microphone' : 'Mute microphone'}
        >
          {muted ? <MicOffIcon /> : <MicIcon />}
          <span>{muted ? 'Muted' : 'Mic on'}</span>
        </button>
        <button type="button" className="convo-ctrl convo-ctrl-end" onClick={handleClose} aria-label="End conversation">
          <span>End</span>
        </button>
      </div>
    </div>
  );
}

function MicOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="3" y1="3" x2="21" y2="21" />
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.94-.6" />
      <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}

/* ─── Guestbook ───────────────────────────────────────────────────────────── */

function GuestbookSection({ posts, form, loading, onForm, onSubmit }) {
  return (
    <section className="guestbook-section">
      <form className="guestbook-form" onSubmit={onSubmit}>
        <div>
          <p className="eyebrow">Shared wall</p>
          <h2>Leave a handwritten note</h2>
        </div>
        <input className="input" value={form.authorName} onChange={(e) => onForm({ ...form, authorName: e.target.value })} placeholder="Name" maxLength={32} required />
        <textarea className="input" value={form.message} onChange={(e) => onForm({ ...form, message: e.target.value })} placeholder="Write whatever you want to leave behind" maxLength={280} required />
        <button className="primary-button" type="submit" disabled={loading}>{loading ? 'Posting...' : 'Pin note'}</button>
      </form>
      <div className="guestbook-wall">
        {posts.length === 0 && <EmptyState title="The wall is quiet" text="Be the first signed-in user to leave a note." />}
        {posts.map((post) => (
          <article
            className="guest-note"
            key={post.id}
            style={{ '--rotate': `${post.rotation}deg`, '--scale': post.scale, '--x': `${post.xOffset}px`, '--y': `${post.yOffset}px`, '--note': post.color }}
          >
            <p>{post.message}</p>
            <span>{post.authorName}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function EmptyState({ title, text }) {
  return <div className="empty-state"><h3>{title}</h3><p>{text}</p></div>;
}
