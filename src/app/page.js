'use client';

import { useEffect, useMemo, useState } from 'react';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';

const initialForm = {
  mood: 5,
  energy: 5,
  sleepHours: 7,
  exam: '',
  journal: ''
};

function stressTone(level) {
  if (level === 'high') return 'tone-danger';
  if (level === 'moderate') return 'tone-warn';
  return 'tone-good';
}

export default function Home() {
  const clerkEnabled = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  const [form, setForm] = useState(initialForm);
  const [entries, setEntries] = useState([]);
  const [activeEntry, setActiveEntry] = useState(null);
  const [chatText, setChatText] = useState('');
  const [chatLog, setChatLog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [error, setError] = useState('');
  const [crisis, setCrisis] = useState(null);

  useEffect(() => {
    fetch('/api/entries')
      .then((res) => res.json())
      .then((data) => {
        if (data.entries) {
          setEntries(data.entries);
          setActiveEntry(data.entries[0] || null);
        }
      })
      .catch((err) => setError(err.message));
  }, []);

  const trend = useMemo(() => {
    if (!entries.length) return null;
    const avgMood = entries.reduce((sum, entry) => sum + Number(entry.mood), 0) / entries.length;
    const avgSleep = entries.reduce((sum, entry) => sum + Number(entry.sleepHours), 0) / entries.length;
    return { avgMood: avgMood.toFixed(1), avgSleep: avgSleep.toFixed(1), count: entries.length };
  }, [entries]);

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function submitEntry(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setCrisis(null);

    try {
      const response = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to analyze journal');
      if (data.crisis) {
        setCrisis(data.crisis.message);
        return;
      }
      setEntries((current) => [data.entry, ...current]);
      setActiveEntry(data.entry);
      setForm(initialForm);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function sendChat(event) {
    event.preventDefault();
    if (!chatText.trim()) return;

    const outgoing = chatText.trim();
    setChatText('');
    setChatLoading(true);
    setChatLog((current) => [...current, { role: 'student', text: outgoing }]);
    setError('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: outgoing })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to reach companion');
      setChatLog((current) => [...current, { role: 'companion', text: data.reply }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setChatLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">PromptWars Main Challenge</p>
            <h1>MindTrail</h1>
          </div>
          <div className="top-actions">
            <div className="status-pill">Exam wellness tracker</div>
            {clerkEnabled ? (
              <>
                <SignedOut>
                  <SignInButton mode="modal">
                    <button type="button">Sign in</button>
                  </SignInButton>
                </SignedOut>
                <SignedIn>
                  <UserButton />
                </SignedIn>
              </>
            ) : null}
          </div>
        </header>

        <div className="grid">
          <section className="panel journal-panel" aria-labelledby="journal-title">
            <div className="section-heading">
              <p className="eyebrow">Daily check-in</p>
              <h2 id="journal-title">Log what is actually happening</h2>
            </div>
            <form onSubmit={submitEntry} className="entry-form">
              <label>
                Exam focus
                <input
                  value={form.exam}
                  onChange={(event) => updateField('exam', event.target.value)}
                  placeholder="NEET, JEE, CUET, CAT, GATE, UPSC..."
                  maxLength={80}
                  required
                />
              </label>

              <div className="control-row">
                <label>
                  Mood
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={form.mood}
                    onChange={(event) => updateField('mood', Number(event.target.value))}
                  />
                  <span>{form.mood}/10</span>
                </label>
                <label>
                  Energy
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={form.energy}
                    onChange={(event) => updateField('energy', Number(event.target.value))}
                  />
                  <span>{form.energy}/10</span>
                </label>
                <label>
                  Sleep
                  <input
                    type="number"
                    min="0"
                    max="16"
                    step="0.5"
                    value={form.sleepHours}
                    onChange={(event) => updateField('sleepHours', Number(event.target.value))}
                  />
                </label>
              </div>

              <label>
                Journal
                <textarea
                  value={form.journal}
                  onChange={(event) => updateField('journal', event.target.value)}
                  placeholder="Write about study pressure, sleep, distractions, confidence, family expectations, or anything that affected your day."
                  minLength={30}
                  maxLength={4000}
                  required
                />
              </label>

              <button type="submit" disabled={loading}>
                {loading ? 'Analyzing...' : 'Analyze check-in'}
              </button>
            </form>
            {error ? <p className="alert">{error}</p> : null}
            {crisis ? <p className="alert crisis">{crisis}</p> : null}
          </section>

          <section className="panel insight-panel" aria-labelledby="insights-title">
            <div className="section-heading">
              <p className="eyebrow">Pattern lens</p>
              <h2 id="insights-title">Personalized support</h2>
            </div>
            {activeEntry ? (
              <article className="analysis">
                <div className={`stress-badge ${stressTone(activeEntry.analysis.stressLevel)}`}>
                  {activeEntry.analysis.stressLevel} stress
                </div>
                <h3>{activeEntry.analysis.summary}</h3>
                <InfoList title="Hidden triggers" items={activeEntry.analysis.hiddenTriggers} />
                <InfoList title="Emotional patterns" items={activeEntry.analysis.emotionalPatterns} />
                <InfoList title="Coping strategies" items={activeEntry.analysis.copingStrategies} />
                <div className="exercise">
                  <strong>Mindfulness reset</strong>
                  <p>{activeEntry.analysis.mindfulnessExercise}</p>
                </div>
                <blockquote>{activeEntry.analysis.encouragement}</blockquote>
                <p className="follow-up">{activeEntry.analysis.followUpQuestion}</p>
              </article>
            ) : (
              <div className="empty-state">
                <h3>No check-ins yet</h3>
                <p>Your first journal analysis will appear here after the backend receives a valid Gemini response.</p>
              </div>
            )}
          </section>

          <section className="panel history-panel" aria-labelledby="history-title">
            <div className="section-heading">
              <p className="eyebrow">Trend</p>
              <h2 id="history-title">Recent logs</h2>
            </div>
            {trend ? (
              <div className="metrics">
                <span>{trend.count} logs</span>
                <span>{trend.avgMood} avg mood</span>
                <span>{trend.avgSleep}h sleep</span>
              </div>
            ) : null}
            <div className="history-list">
              {entries.map((entry) => (
                <button key={entry.id} type="button" onClick={() => setActiveEntry(entry)}>
                  <span>{entry.exam}</span>
                  <small>
                    Mood {entry.mood}/10 · Energy {entry.energy}/10
                  </small>
                </button>
              ))}
            </div>
          </section>

          <section className="panel companion-panel" aria-labelledby="companion-title">
            <div className="section-heading">
              <p className="eyebrow">Companion</p>
              <h2 id="companion-title">Ask for a reset</h2>
            </div>
            <div className="chat-log" aria-live="polite">
              {chatLog.length ? (
                chatLog.map((message, index) => (
                  <p key={`${message.role}-${index}`} className={message.role}>
                    {message.text}
                  </p>
                ))
              ) : (
                <p className="empty-chat">Ask for a study break plan, a confidence reset, or help naming a stress trigger.</p>
              )}
            </div>
            <form onSubmit={sendChat} className="chat-form">
              <input
                value={chatText}
                onChange={(event) => setChatText(event.target.value)}
                placeholder="What do you need right now?"
                maxLength={1200}
              />
              <button type="submit" disabled={chatLoading}>
                {chatLoading ? '...' : 'Send'}
              </button>
            </form>
          </section>
        </div>
      </section>
    </main>
  );
}

function InfoList({ title, items }) {
  return (
    <div className="info-list">
      <strong>{title}</strong>
      <ul>
        {(items || []).map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
