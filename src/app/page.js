'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MoodEnergyChart, SleepChart, StressDonut } from './components/Charts';

const TABS = [
  { id: 'checkin', label: 'Check-in' },
  { id: 'insights', label: 'Insights' },
  { id: 'chat', label: 'Chat' }
];

const INITIAL_FORM = {
  mood: 5,
  energy: 5,
  sleepHours: 7,
  exam: '',
  journal: ''
};

function stressClass(level) {
  if (level === 'high') return 'stress-high';
  if (level === 'moderate') return 'stress-moderate';
  return 'stress-low';
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default function Home() {
  const [tab, setTab] = useState('checkin');
  const [form, setForm] = useState(INITIAL_FORM);
  const [entries, setEntries] = useState([]);
  const [activeEntry, setActiveEntry] = useState(null);
  const [chatText, setChatText] = useState('');
  const [chatLog, setChatLog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [error, setError] = useState('');
  const [crisis, setCrisis] = useState(null);
  const [suggestions, setSuggestions] = useState(null);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    fetch('/api/entries')
      .then((r) => r.json())
      .then((data) => {
        if (data.entries) {
          setEntries(data.entries);
          if (data.entries[0]) setActiveEntry(data.entries[0]);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog]);

  const trend = useMemo(() => {
    if (!entries.length) return null;
    const avg = (fn) => (entries.reduce((s, e) => s + fn(e), 0) / entries.length).toFixed(1);
    return {
      count: entries.length,
      avgMood: avg((e) => Number(e.mood)),
      avgEnergy: avg((e) => Number(e.energy)),
      avgSleep: avg((e) => Number(e.sleepHours))
    };
  }, [entries]);

  function updateField(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function submitEntry(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setCrisis(null);
    try {
      const res = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to analyze journal');
      if (data.crisis) {
        setCrisis(data.crisis.message);
        return;
      }
      setEntries((cur) => [data.entry, ...cur]);
      setActiveEntry(data.entry);
      setForm(INITIAL_FORM);
      setSuggestions(null);
      setTab('insights');
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
    setChatLog((cur) => [...cur, { role: 'student', text: outgoing }]);
    setError('');
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: outgoing })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to reach companion');
      setChatLog((cur) => [...cur, { role: 'companion', text: data.reply }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setChatLoading(false);
    }
  }

  async function fetchSuggestions() {
    setSuggestLoading(true);
    try {
      const res = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 10 })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unable to get suggestions');
      setSuggestions(data.suggestions);
    } catch (err) {
      setError(err.message);
    } finally {
      setSuggestLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <div className="brand">
        <h1>MindTrail</h1>
        <p>Wellness tracker for exam preparation</p>
      </div>

      <nav className="tab-nav" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            data-active={tab === t.id}
            className="tab-btn"
            onClick={() => { setTab(t.id); setError(''); }}
          >
            {t.label}
            {t.id === 'insights' && entries.length > 0 && (
              <span className="tab-badge">{entries.length}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="tab-content" key={tab}>
        {tab === 'checkin' && (
          <CheckinTab
            form={form}
            loading={loading}
            error={error}
            crisis={crisis}
            onUpdate={updateField}
            onSubmit={submitEntry}
          />
        )}
        {tab === 'insights' && (
          <InsightsTab
            entries={entries}
            activeEntry={activeEntry}
            trend={trend}
            suggestions={suggestions}
            suggestLoading={suggestLoading}
            onSelect={setActiveEntry}
            onSuggest={fetchSuggestions}
          />
        )}
        {tab === 'chat' && (
          <ChatTab
            chatLog={chatLog}
            chatText={chatText}
            chatLoading={chatLoading}
            error={error}
            chatEndRef={chatEndRef}
            onTextChange={setChatText}
            onSubmit={sendChat}
          />
        )}
      </div>
    </main>
  );
}

function CheckinTab({ form, loading, error, crisis, onUpdate, onSubmit }) {
  return (
    <div className="card">
      <div className="card-header">
        <h2>Daily check-in</h2>
        <p>Log your mood, energy, and what happened today</p>
      </div>
      <form onSubmit={onSubmit} className="form-grid">
        <div className="field">
          <label htmlFor="exam" className="field-label">Exam focus</label>
          <input
            id="exam"
            className="field-input"
            value={form.exam}
            onChange={(e) => onUpdate('exam', e.target.value)}
            placeholder="NEET, JEE, CUET, CAT, GATE, UPSC..."
            maxLength={80}
            required
          />
        </div>

        <div className="slider-group">
          <SliderField id="mood" label="Mood" value={form.mood} onChange={(v) => onUpdate('mood', v)} />
          <SliderField id="energy" label="Energy" value={form.energy} onChange={(v) => onUpdate('energy', v)} />
          <div className="slider-field">
            <div className="slider-top">
              <span className="slider-label">Sleep</span>
              <span className="slider-value">{form.sleepHours}h</span>
            </div>
            <input
              type="range" min="0" max="16" step="0.5"
              value={form.sleepHours}
              onChange={(e) => onUpdate('sleepHours', Number(e.target.value))}
              aria-label="Sleep hours"
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="journal" className="field-label">Journal</label>
          <textarea
            id="journal"
            className="field-input"
            value={form.journal}
            onChange={(e) => onUpdate('journal', e.target.value)}
            placeholder="Write about study pressure, sleep, distractions, confidence, family expectations, or anything that affected your day."
            minLength={30}
            maxLength={4000}
            required
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? <><span className="spinner" /> Analyzing...</> : 'Analyze check-in'}
        </button>
      </form>
      {error && <p className="alert alert-warn">{error}</p>}
      {crisis && <p className="alert alert-crisis">{crisis}</p>}
    </div>
  );
}

function SliderField({ id, label, value, onChange }) {
  return (
    <div className="slider-field">
      <div className="slider-top">
        <span className="slider-label">{label}</span>
        <span className="slider-value">{value}</span>
      </div>
      <input
        type="range" min="1" max="10"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={`${label} level`}
      />
    </div>
  );
}

function InsightsTab({ entries, activeEntry, trend, suggestions, suggestLoading, onSelect, onSuggest }) {
  if (!entries.length) {
    return (
      <div className="card">
        <div className="empty-state">
          <div className="empty-icon" aria-hidden="true">&#x1f4d3;</div>
          <h3>No check-ins yet</h3>
          <p>Complete your first daily check-in to see personalized insights and interactive charts here.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {trend && (
        <div className="trend-bar">
          <div className="trend-stat"><strong>{trend.count}</strong> logs</div>
          <div className="trend-stat"><strong>{trend.avgMood}</strong> avg mood</div>
          <div className="trend-stat"><strong>{trend.avgEnergy}</strong> avg energy</div>
          <div className="trend-stat"><strong>{trend.avgSleep}h</strong> avg sleep</div>
        </div>
      )}

      {entries.length >= 2 && (
        <div className="charts-grid">
          <MoodEnergyChart entries={entries} />
          <SleepChart entries={entries} />
          {entries.length >= 3 && <StressDonut entries={entries} />}
        </div>
      )}

      <div className="suggest-panel">
        <div className="card">
          <div className="card-header">
            <h2>AI scheduling suggestions</h2>
            <p>Get personalized study and wellness advice based on your journal patterns</p>
          </div>
          {!suggestions ? (
            <button
              type="button"
              className="btn btn-ghost suggest-trigger"
              onClick={onSuggest}
              disabled={suggestLoading}
            >
              {suggestLoading
                ? <><span className="spinner" /> Generating suggestions...</>
                : <><span aria-hidden="true">&#x2728;</span> Get AI suggestions</>
              }
            </button>
          ) : (
            <SuggestResult data={suggestions} onRefresh={onSuggest} loading={suggestLoading} />
          )}
        </div>
      </div>

      {activeEntry && (
        <div className="card">
          <div className="card-header">
            <h2>Latest analysis</h2>
          </div>
          <div className="analysis">
            <div>
              <span className={`stress-indicator ${stressClass(activeEntry.analysis.stressLevel)}`}>
                {activeEntry.analysis.stressLevel} stress
              </span>
            </div>
            <p className="analysis-summary">{activeEntry.analysis.summary}</p>
            <AnalysisSection title="Hidden triggers" items={activeEntry.analysis.hiddenTriggers} />
            <AnalysisSection title="Emotional patterns" items={activeEntry.analysis.emotionalPatterns} />
            <AnalysisSection title="Coping strategies" items={activeEntry.analysis.copingStrategies} />
            <div className="mindfulness-block">
              <strong>Mindfulness reset</strong>
              <p>{activeEntry.analysis.mindfulnessExercise}</p>
            </div>
            <p className="encouragement">{activeEntry.analysis.encouragement}</p>
            <p className="follow-up">{activeEntry.analysis.followUpQuestion}</p>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2>History</h2>
        </div>
        <div className="history-list">
          {entries.map((entry) => (
            <button
              key={entry.id}
              className="history-item"
              data-active={activeEntry?.id === entry.id}
              onClick={() => onSelect(entry)}
            >
              <div className="history-item-left">
                <span className="history-exam">{entry.exam}</span>
                <span className="history-meta">
                  Mood {entry.mood} / Energy {entry.energy} / {entry.sleepHours}h sleep
                  {entry.createdAt && ` · ${formatDate(entry.createdAt)}`}
                </span>
              </div>
              {entry.analysis && (
                <span className={`history-stress ${stressClass(entry.analysis.stressLevel)}`}>
                  {entry.analysis.stressLevel}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

function SuggestResult({ data, onRefresh, loading }) {
  return (
    <div className="suggest-result">
      {data.weeklyFocus && <div className="suggest-focus">{data.weeklyFocus}</div>}
      <SuggestSection title="Schedule suggestions" items={data.schedule} />
      <SuggestSection title="Study tips" items={data.studyTips} />
      <SuggestSection title="Wellness actions" items={data.wellnessActions} />
      <button type="button" className="btn btn-ghost" onClick={onRefresh} disabled={loading} style={{ marginTop: 8 }}>
        {loading ? <><span className="spinner" /> Refreshing...</> : 'Refresh suggestions'}
      </button>
    </div>
  );
}

function SuggestSection({ title, items }) {
  if (!items?.length) return null;
  return (
    <div className="suggest-section">
      <h4>{title}</h4>
      <ul>
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
}

function AnalysisSection({ title, items }) {
  if (!items?.length) return null;
  return (
    <div className="analysis-section">
      <h3>{title}</h3>
      <ul>
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  );
}

function ChatTab({ chatLog, chatText, chatLoading, error, chatEndRef, onTextChange, onSubmit }) {
  return (
    <div className="card">
      <div className="card-header">
        <h2>Wellness companion</h2>
        <p>Ask for a study break plan, a confidence reset, or help naming a stress trigger</p>
      </div>
      <div className="chat-container">
        <div className="chat-messages" aria-live="polite">
          {chatLog.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon" aria-hidden="true">&#x1f4ac;</div>
              <h3>Start a conversation</h3>
              <p>Your companion uses your recent check-ins for context.</p>
            </div>
          )}
          {chatLog.map((msg, i) => (
            <div key={`${msg.role}-${i}`} className={`chat-bubble chat-bubble-${msg.role}`}>
              {msg.text}
            </div>
          ))}
          {chatLoading && (
            <div className="chat-bubble chat-bubble-companion">
              <span className="spinner" />
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
        <form onSubmit={onSubmit} className="chat-input-row">
          <input
            className="field-input"
            value={chatText}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder="What do you need right now?"
            maxLength={1200}
          />
          <button type="submit" className="btn btn-primary" disabled={chatLoading}>Send</button>
        </form>
        {error && <p className="alert alert-warn">{error}</p>}
      </div>
    </div>
  );
}
