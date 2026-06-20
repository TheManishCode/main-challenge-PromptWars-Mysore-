'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SignInButton, SignUpButton, UserButton, useSignIn, useUser } from '@clerk/nextjs';

const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

const SECTIONS = [
  { id: 'journal', label: 'Journal' },
  { id: 'chat', label: 'Chat' },
  { id: 'guestbook', label: 'Guestbook' }
];

const INITIAL_FORM = { mood: 5, energy: 5, sleepHours: 7, exam: '', journal: '' };

function formatDate(dateStr) {
  if (!dateStr) return 'Just now';
  return new Date(dateStr).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function stressClass(level) {
  if (level === 'high') return 'tone-high';
  if (level === 'moderate') return 'tone-mid';
  return 'tone-low';
}

export default function Home() {
  if (!hasClerk) return <AuthSetupRequired />;
  return <AuthenticatedApp />;
}

function AuthenticatedApp() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [section, setSection] = useState('journal');
  const [theme, setTheme] = useState('light');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [entries, setEntries] = useState([]);
  const [guestbook, setGuestbook] = useState([]);
  const [form, setForm] = useState(INITIAL_FORM);
  const [chatText, setChatText] = useState('');
  const [chatLog, setChatLog] = useState([]);
  const [guestForm, setGuestForm] = useState({ authorName: '', message: '' });
  const [loading, setLoading] = useState('');
  const [error, setError] = useState('');
  const chatEndRef = useRef(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const loadEntries = useCallback(async () => {
    const res = await fetch('/api/entries');
    if (!res.ok) throw new Error('Unable to load your journal');
    const data = await res.json();
    setEntries(data.entries || []);
  }, []);

  const loadGuestbook = useCallback(async () => {
    const res = await fetch('/api/guestbook');
    if (!res.ok) throw new Error('Unable to load the guestbook');
    const data = await res.json();
    setGuestbook(data.posts || []);
  }, []);

  useEffect(() => {
    if (!isSignedIn) return;
    const seenKey = `mindtrail-onboarding-${user?.id}`;
    Promise.resolve()
      .then(() => {
        setShowOnboarding(!localStorage.getItem(seenKey));
        setError('');
        return Promise.all([loadEntries(), loadGuestbook()]);
      })
      .catch((err) => setError(err.message));
  }, [isSignedIn, loadEntries, loadGuestbook, user?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog]);

  const metrics = useMemo(() => {
    if (!entries.length) return { count: 0, mood: '-', sleep: '-' };
    const avg = (field) => (entries.reduce((sum, item) => sum + Number(item[field]), 0) / entries.length).toFixed(1);
    return { count: entries.length, mood: avg('mood'), sleep: `${avg('sleepHours')}h` };
  }, [entries]);

  function finishOnboarding() {
    if (user?.id) localStorage.setItem(`mindtrail-onboarding-${user.id}`, 'true');
    setShowOnboarding(false);
  }

  function updateForm(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submitEntry(event) {
    event.preventDefault();
    setLoading('entry');
    setError('');
    try {
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to save this journal entry');
      if (data.crisis) throw new Error(data.crisis.message);
      setEntries((current) => [data.entry, ...current]);
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
      setEntries((current) => current.map((entry) => (
        entry.id === entryId ? { ...entry, insightBubbles: data.insights } : entry
      )));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading('');
    }
  }

  async function sendChat(event) {
    event.preventDefault();
    if (!chatText.trim()) return;
    const outgoing = chatText.trim();
    setChatText('');
    setChatLog((current) => [...current, { role: 'student', content: outgoing }]);
    setLoading('chat');
    setError('');
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: outgoing })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to reach the companion');
      setChatLog(data.messages?.length ? data.messages : (current) => [...current, { role: 'companion', content: data.reply }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading('');
    }
  }

  async function submitGuestbook(event) {
    event.preventDefault();
    setLoading('guestbook');
    setError('');
    try {
      const res = await fetch('/api/guestbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(guestForm)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to add guestbook note');
      setGuestbook((current) => [data.post, ...current]);
      setGuestForm({ authorName: '', message: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading('');
    }
  }

  if (!isLoaded) return <LoadingScreen />;
  if (!isSignedIn) return <AuthScreen />;

  return (
    <main className="product-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Journal companion</p>
          <h1>MindTrail</h1>
        </div>
        <div className="topbar-actions">
          <button className="icon-button" type="button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} title="Toggle theme">
            {theme === 'light' ? 'Dark' : 'Light'}
          </button>
          {isSignedIn && <UserButton />}
        </div>
      </header>

      {showOnboarding && <OnboardingCard name={user?.firstName || 'there'} onDone={finishOnboarding} />}

      <section className="status-strip" aria-label="Journal summary">
        <Stat label="Entries" value={metrics.count} />
        <Stat label="Average mood" value={metrics.mood} />
        <Stat label="Average sleep" value={metrics.sleep} />
      </section>

      <nav className="section-nav" aria-label="Primary">
        {SECTIONS.map((item) => (
          <button
            key={item.id}
            className="nav-pill"
            data-active={section === item.id}
            onClick={() => setSection(item.id)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </nav>

      {error && <p className="notice">{error}</p>}

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
      {section === 'chat' && (
        <ChatSection
          chatLog={chatLog}
          chatText={chatText}
          loading={loading === 'chat'}
          chatEndRef={chatEndRef}
          onText={setChatText}
          onSubmit={sendChat}
        />
      )}
      {section === 'guestbook' && (
        <GuestbookSection
          posts={guestbook}
          form={guestForm}
          loading={loading === 'guestbook'}
          onForm={setGuestForm}
          onSubmit={submitGuestbook}
        />
      )}
    </main>
  );
}

function LoadingScreen() {
  return <div className="auth-frame"><div className="loading-mark" /><p>Loading MindTrail...</p></div>;
}

function AuthSetupRequired() {
  return (
    <div className="auth-frame">
      <div className="auth-panel">
        <p className="eyebrow">Authentication required</p>
        <h1>Connect Clerk before app access</h1>
        <p>MindTrail no longer supports guest mode. Add `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` to enable email/password or OAuth sign in.</p>
      </div>
    </div>
  );
}

function AuthScreen() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const [testerLoading, setTesterLoading] = useState(false);
  const [testerError, setTesterError] = useState('');

  async function signInTester() {
    if (!isLoaded) return;
    setTesterLoading(true);
    setTesterError('');
    try {
      const res = await fetch('/api/tester', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Tester login failed');

      const result = await signIn.create({
        strategy: 'ticket',
        ticket: data.ticket
      });

      if (result.status !== 'complete' || !result.createdSessionId) {
        throw new Error('Tester Clerk session could not be completed');
      }

      await setActive({ session: result.createdSessionId });
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
          <button className="primary-button" type="button" onClick={signInTester} disabled={!isLoaded || testerLoading}>
            {testerLoading ? 'Entering...' : 'Tester login'}
          </button>
          <SignInButton mode="modal"><button className="primary-button" type="button">Log in</button></SignInButton>
          <SignUpButton mode="modal"><button className="secondary-button" type="button">Create account</button></SignUpButton>
        </div>
        {testerError && <p className="auth-error">{testerError}</p>}
      </section>
    </div>
  );
}

function OnboardingCard({ name, onDone }) {
  return (
    <section className="onboarding">
      <div>
        <p className="eyebrow">First run</p>
        <h2>Welcome, {name}</h2>
        <p>Start with one honest entry. The companion will use your full journal history server-side, and each entry can grow its own cluster of insight bubbles.</p>
      </div>
      <button className="primary-button" type="button" onClick={onDone}>Begin</button>
    </section>
  );
}

function Stat({ label, value }) {
  return <div className="stat"><span>{label}</span><strong>{value}</strong></div>;
}

function JournalSection({ form, entries, loading, onUpdate, onSubmit, onInvoke }) {
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
        <textarea className="input journal-textarea" value={form.journal} onChange={(e) => onUpdate('journal', e.target.value)} placeholder="What happened, what kept looping in your head, what helped, what felt heavy?" minLength={30} maxLength={4000} required />
        <button className="primary-button" type="submit" disabled={loading === 'entry'}>{loading === 'entry' ? 'Analyzing...' : 'Save journal entry'}</button>
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
              <div className="entry-numbers">
                <span>Mood {entry.mood}</span>
                <span>Energy {entry.energy}</span>
                <span>Sleep {entry.sleepHours}h</span>
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
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
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

function ChatSection({ chatLog, chatText, loading, chatEndRef, onText, onSubmit }) {
  return (
    <section className="chat-panel">
      <div className="section-heading">
        <p className="eyebrow">Companion</p>
        <h2>Chat with your full journal context</h2>
      </div>
      <div className="chat-feed">
        {!chatLog.length && <EmptyState title="Ask anything study-season related" text="The server adds your complete available journal history to each companion response." />}
        {chatLog.map((message, index) => (
          <div className={`chat-line ${message.role}`} key={`${message.role}-${index}`}>{message.content}</div>
        ))}
        {loading && <div className="chat-line companion">Thinking...</div>}
        <div ref={chatEndRef} />
      </div>
      <form className="chat-form" onSubmit={onSubmit}>
        <input className="input" value={chatText} onChange={(event) => onText(event.target.value)} placeholder="Ask for perspective, a plan, or a calmer next step" maxLength={1200} />
        <button className="primary-button" type="submit" disabled={loading}>Send</button>
      </form>
    </section>
  );
}

function GuestbookSection({ posts, form, loading, onForm, onSubmit }) {
  return (
    <section className="guestbook-section">
      <form className="guestbook-form" onSubmit={onSubmit}>
        <div>
          <p className="eyebrow">Shared wall</p>
          <h2>Leave a handwritten note</h2>
        </div>
        <input className="input" value={form.authorName} onChange={(event) => onForm({ ...form, authorName: event.target.value })} placeholder="Name" maxLength={32} required />
        <textarea className="input" value={form.message} onChange={(event) => onForm({ ...form, message: event.target.value })} placeholder="Write whatever you want to leave behind" maxLength={280} required />
        <button className="primary-button" type="submit" disabled={loading}>{loading ? 'Posting...' : 'Pin note'}</button>
      </form>
      <div className="guestbook-wall">
        {posts.length === 0 && <EmptyState title="The wall is quiet" text="Be the first signed-in user to leave a note." />}
        {posts.map((post) => (
          <article
            className="guest-note"
            key={post.id}
            style={{
              '--rotate': `${post.rotation}deg`,
              '--scale': post.scale,
              '--x': `${post.xOffset}px`,
              '--y': `${post.yOffset}px`,
              '--note': post.color
            }}
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
