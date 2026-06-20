'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SignInButton, SignUpButton, UserButton, useUser } from '@clerk/nextjs';

const hasClerk = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

const SECTIONS = [
  { id: 'journal', label: 'Journal' },
  { id: 'map', label: 'Map' },
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
  if (!hasClerk) {
    return (
      <AuthenticatedApp
        auth={{ isLoaded: true, isSignedIn: false, user: null }}
        clerkEnabled={false}
      />
    );
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

  const hasAppAccess = isSignedIn || testerMode;

  useEffect(() => {
    if (!isLoaded || isSignedIn || testerMode) return;
    fetch('/api/entries')
      .then((res) => {
        if (res.ok) setTesterMode(true);
      })
      .catch(() => {});
  }, [isLoaded, isSignedIn, testerMode]);

  useEffect(() => {
    if (!hasAppAccess) return;
    const seenKey = `mindtrail-onboarding-${user?.id || 'tester'}`;
    Promise.resolve()
      .then(() => {
        setShowOnboarding(!localStorage.getItem(seenKey));
        setError('');
        return Promise.all([loadEntries(), loadGuestbook()]);
      })
      .catch((err) => setError(err.message));
  }, [hasAppAccess, loadEntries, loadGuestbook, user?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog]);

  const metrics = useMemo(() => {
    if (!entries.length) return { count: 0, mood: '-', sleep: '-' };
    const avg = (field) => (entries.reduce((sum, item) => sum + Number(item[field]), 0) / entries.length).toFixed(1);
    return { count: entries.length, mood: avg('mood'), sleep: `${avg('sleepHours')}h` };
  }, [entries]);

  function finishOnboarding() {
    localStorage.setItem(`mindtrail-onboarding-${user?.id || 'tester'}`, 'true');
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

  async function handleTesterSignOut() {
    setLoading('signout');
    setError('');
    try {
      const res = await fetch('/api/tester', { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Unable to sign out');
      setTesterMode(false);
      setEntries([]);
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
          {isSignedIn ? <UserButton /> : <TesterProfileMenu onSignOut={handleTesterSignOut} loading={loading === 'signout'} />}
        </div>
      </header>

      {showOnboarding && <OnboardingCard name={user?.firstName || (testerMode ? 'Tester' : 'there')} onDone={finishOnboarding} />}

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
      {section === 'map' && <GraphMapSection entries={entries} />}
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

function buildGraph(entries) {
  const nodes = [
    {
      id: 'center',
      type: 'core',
      label: 'Journal history',
      detail: `${entries.length} saved ${entries.length === 1 ? 'entry' : 'entries'}`,
      radius: 30
    }
  ];
  const edges = [];

  entries.forEach((entry, entryIndex) => {
    const entryNodeId = `entry-${entry.id}`;
    nodes.push({
      id: entryNodeId,
      type: 'entry',
      label: entry.exam || 'Journal entry',
      detail: `${formatDate(entry.createdAt)} · mood ${entry.mood} · ${entry.analysis?.stressLevel || 'new'}`,
      radius: 23,
      entryIndex,
      mood: Number(entry.mood) || 5,
      stressLevel: entry.analysis?.stressLevel || 'new'
    });
    edges.push({ from: 'center', to: entryNodeId, type: 'entry' });

    (entry.insightBubbles || []).forEach((bubble, bubbleIndex) => {
      const bubbleNodeId = `insight-${entry.id}-${bubble.id || bubbleIndex}`;
      nodes.push({
        id: bubbleNodeId,
        type: 'insight',
        label: bubble.category || 'Insight',
        detail: bubble.text,
        radius: 15,
        entryIndex,
        bubbleIndex,
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
  const [hoveredNode, setHoveredNode] = useState(null);
  const graph = useMemo(() => buildGraph(entries), [entries]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const panel = panelRef.current;
    if (!canvas || !panel) return undefined;
    const context = canvas.getContext('2d');
    let animationFrame = 0;

    function cssVar(name) {
      return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    }

    function positionNodes(width, height) {
      const center = { x: width / 2, y: height / 2 };
      const entryNodes = graph.nodes.filter((node) => node.type === 'entry');
      const rendered = graph.nodes.map((node) => ({ ...node, x: center.x, y: center.y }));
      const byId = new Map(rendered.map((node) => [node.id, node]));
      const ringRadius = Math.min(width, height) * (entryNodes.length > 3 ? 0.31 : 0.25);

      entryNodes.forEach((node, index) => {
        const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(entryNodes.length, 1);
        const wave = index % 2 === 0 ? 18 : -12;
        const target = byId.get(node.id);
        target.x = center.x + Math.cos(angle) * (ringRadius + wave);
        target.y = center.y + Math.sin(angle) * (ringRadius + wave);

        const childNodes = rendered.filter((child) => child.type === 'insight' && child.entryIndex === node.entryIndex);
        childNodes.forEach((child, childIndex) => {
          const childAngle = angle + (childIndex - (childNodes.length - 1) / 2) * 0.38;
          const childRadius = 84 + childIndex * 8;
          child.x = target.x + Math.cos(childAngle) * childRadius;
          child.y = target.y + Math.sin(childAngle) * childRadius;
        });
      });

      return rendered.map((node) => ({
        ...node,
        x: Math.max(node.radius + 18, Math.min(width - node.radius - 18, node.x)),
        y: Math.max(node.radius + 18, Math.min(height - node.radius - 18, node.y))
      }));
    }

    function wrapText(text, maxWidth) {
      const words = String(text || '').split(/\s+/).filter(Boolean);
      const lines = [];
      let line = '';
      words.forEach((word) => {
        const next = line ? `${line} ${word}` : word;
        if (context.measureText(next).width > maxWidth && line) {
          lines.push(line);
          line = word;
        } else {
          line = next;
        }
      });
      if (line) lines.push(line);
      return lines.slice(0, 2);
    }

    function draw() {
      const rect = panel.getBoundingClientRect();
      const pixelRatio = window.devicePixelRatio || 1;
      const width = Math.max(320, rect.width);
      const height = Math.max(420, rect.height);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, width, height);

      const colors = {
        panel: cssVar('--panel') || '#ffffff',
        ink: cssVar('--ink') || '#25211d',
        muted: cssVar('--muted') || '#726b62',
        line: cssVar('--line') || '#d8cabc',
        brand: cssVar('--brand') || '#2f6f73',
        accent: cssVar('--accent') || '#e45d4f',
        gold: cssVar('--gold') || '#d89b2b',
        green: cssVar('--green') || '#4b8f63'
      };

      const rendered = positionNodes(width, height);
      const byId = new Map(rendered.map((node) => [node.id, node]));
      renderedNodesRef.current = rendered;

      context.save();
      context.lineCap = 'round';
      graph.edges.forEach((edge) => {
        const from = byId.get(edge.from);
        const to = byId.get(edge.to);
        if (!from || !to) return;
        context.beginPath();
        context.moveTo(from.x, from.y);
        context.lineTo(to.x, to.y);
        context.strokeStyle = edge.type === 'insight' ? colors.line : colors.brand;
        context.globalAlpha = edge.type === 'insight' ? 0.55 : 0.72;
        context.lineWidth = edge.type === 'insight' ? 1.5 : 2.5;
        context.stroke();
      });
      context.restore();

      rendered.forEach((node) => {
        const isHovered = hoveredNode?.id === node.id;
        const fill = node.type === 'core'
          ? colors.ink
          : node.type === 'entry'
            ? colors.panel
            : node.accent || colors.gold;
        const stroke = node.type === 'core' ? colors.ink : node.type === 'entry' ? colors.brand : colors.ink;

        context.save();
        context.beginPath();
        context.arc(node.x, node.y, node.radius + (isHovered ? 5 : 0), 0, Math.PI * 2);
        context.fillStyle = fill;
        context.shadowColor = 'rgba(37, 33, 29, 0.18)';
        context.shadowBlur = isHovered ? 24 : 14;
        context.shadowOffsetY = 8;
        context.fill();
        context.shadowColor = 'transparent';
        context.lineWidth = node.type === 'insight' ? 3 : 2;
        context.strokeStyle = stroke;
        context.stroke();

        context.fillStyle = node.type === 'core' || node.type === 'insight' ? '#fffdf8' : colors.ink;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.font = node.type === 'insight' ? '700 11px Inter, sans-serif' : '800 12px Inter, sans-serif';
        const label = node.type === 'insight' ? node.label.slice(0, 1) : node.label;
        const lines = node.type === 'insight' ? [label] : wrapText(label, node.radius * 2.4);
        lines.forEach((line, index) => {
          context.fillText(line, node.x, node.y + (index - (lines.length - 1) / 2) * 13);
        });
        context.restore();
      });
    }

    function scheduleDraw() {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(draw);
    }

    const observer = new ResizeObserver(scheduleDraw);
    observer.observe(panel);
    scheduleDraw();
    return () => {
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
    };
  }, [graph, hoveredNode]);

  function handlePointerMove(event) {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const nearest = renderedNodesRef.current.find((node) => {
      const distance = Math.hypot(node.x - x, node.y - y);
      return distance <= node.radius + 8;
    });
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
          <span><i className="legend-core" />History</span>
          <span><i className="legend-entry" />Entry</span>
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
            <EmptyState title="No graph yet" text="Save a journal entry and this canvas will map its mood, stress signal, and generated suggestions." />
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

function TesterProfileMenu({ onSignOut, loading }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="tester-profile">
      <button
        className="tester-avatar-button"
        type="button"
        aria-expanded={open}
        aria-label="Tester profile"
        onClick={() => setOpen((current) => !current)}
      >
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
