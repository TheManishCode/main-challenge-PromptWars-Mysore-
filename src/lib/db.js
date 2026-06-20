import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import { getRequiredEnv, isProduction } from './env';
import { decryptText, encryptText } from './crypto';

let pool;
let initialized = false;
const memoryEntries = new Map();
const memoryInsights = new Map();
const memoryThreads = new Map();
const memoryMessages = new Map();
const memoryGuestbook = [];
const memoryExamCountdowns = new Map();
const memoryWeeklyReports = new Map();
const memoryStreaks = new Map();
const memoryMockTests = new Map();

function getPool() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    if (isProduction()) {
      throw new Error('DATABASE_URL is required for production persistence');
    }
    return null;
  }

  if (!pool) {
    pool = new Pool({
      connectionString: getRequiredEnv('DATABASE_URL'),
      ssl: url.includes('localhost') || url.includes('127.0.0.1') ? false : { rejectUnauthorized: false }
    });
  }
  return pool;
}

async function initDb(client) {
  if (initialized) return;
  await client.query(`
    CREATE TABLE IF NOT EXISTS wellness_entries (
      id UUID PRIMARY KEY,
      user_key TEXT NOT NULL,
      session_key TEXT NOT NULL DEFAULT 'legacy',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      exam TEXT NOT NULL,
      mood INTEGER NOT NULL CHECK (mood BETWEEN 1 AND 10),
      energy INTEGER NOT NULL CHECK (energy BETWEEN 1 AND 10),
      sleep_hours NUMERIC(4, 1) NOT NULL CHECK (sleep_hours BETWEEN 0 AND 16),
      stress INTEGER NOT NULL DEFAULT 5 CHECK (stress BETWEEN 1 AND 10),
      anxiety INTEGER NOT NULL DEFAULT 5 CHECK (anxiety BETWEEN 1 AND 10),
      confidence INTEGER NOT NULL DEFAULT 5 CHECK (confidence BETWEEN 1 AND 10),
      study_hours NUMERIC(4, 1) NOT NULL DEFAULT 0 CHECK (study_hours BETWEEN 0 AND 24),
      emoji TEXT NOT NULL DEFAULT '😊',
      study_subject TEXT NOT NULL DEFAULT '',
      raw_text_encrypted JSONB NOT NULL,
      analysis JSONB NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_wellness_entries_session_created
      ON wellness_entries(user_key, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_wellness_entries_login_session
      ON wellness_entries(user_key, session_key, created_at DESC);

    CREATE TABLE IF NOT EXISTS journal_insights (
      id UUID PRIMARY KEY,
      entry_id UUID NOT NULL REFERENCES wellness_entries(id) ON DELETE CASCADE,
      user_key TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      category TEXT NOT NULL CHECK (category IN ('Mood', 'Pattern', 'Suggestion', 'Highlight')),
      text TEXT NOT NULL CHECK (char_length(text) BETWEEN 8 AND 700),
      accent TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_journal_insights_entry_created
      ON journal_insights(entry_id, created_at ASC);

    CREATE TABLE IF NOT EXISTS chat_threads (
      id UUID PRIMARY KEY,
      user_key TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT 'Companion chat',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_chat_threads_user_updated
      ON chat_threads(user_key, updated_at DESC);

    CREATE TABLE IF NOT EXISTS chat_messages (
      id UUID PRIMARY KEY,
      thread_id UUID NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
      user_key TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('student', 'companion')),
      content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 4000),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_created
      ON chat_messages(thread_id, created_at ASC);

    CREATE TABLE IF NOT EXISTS guestbook_posts (
      id UUID PRIMARY KEY,
      user_key TEXT NOT NULL,
      author_name TEXT NOT NULL,
      message TEXT NOT NULL CHECK (char_length(message) BETWEEN 2 AND 280),
      rotation NUMERIC(4, 1) NOT NULL,
      scale NUMERIC(3, 2) NOT NULL,
      x_offset INTEGER NOT NULL,
      y_offset INTEGER NOT NULL,
      color TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_guestbook_posts_created
      ON guestbook_posts(created_at DESC);

    CREATE TABLE IF NOT EXISTS exam_countdowns (
      id UUID PRIMARY KEY,
      user_key TEXT NOT NULL,
      exam_name TEXT NOT NULL,
      exam_date DATE NOT NULL,
      exam_type TEXT NOT NULL CHECK (exam_type IN ('NEET', 'JEE', 'UPSC', 'CAT', 'GATE', 'CUET', 'Custom')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_exam_countdowns_user
      ON exam_countdowns(user_key, exam_date ASC);

    CREATE TABLE IF NOT EXISTS weekly_reports (
      id UUID PRIMARY KEY,
      user_key TEXT NOT NULL,
      week_start DATE NOT NULL,
      report_json JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_weekly_reports_user_week
      ON weekly_reports(user_key, week_start DESC);

    CREATE TABLE IF NOT EXISTS wellness_streaks (
      id UUID PRIMARY KEY,
      user_key TEXT NOT NULL,
      streak_type TEXT NOT NULL CHECK (streak_type IN ('journal', 'checkin', 'meditation')),
      current_streak INTEGER NOT NULL DEFAULT 0,
      longest_streak INTEGER NOT NULL DEFAULT 0,
      last_activity_date DATE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (user_key, streak_type)
    );
    CREATE INDEX IF NOT EXISTS idx_wellness_streaks_user
      ON wellness_streaks(user_key);

    CREATE TABLE IF NOT EXISTS mock_tests (
      id UUID PRIMARY KEY,
      user_key TEXT NOT NULL,
      exam_type TEXT NOT NULL CHECK (exam_type IN ('NEET', 'JEE', 'UPSC', 'CAT', 'GATE', 'CUET', 'Custom')),
      score NUMERIC(7, 1) NOT NULL,
      max_score NUMERIC(7, 1) NOT NULL,
      confidence INTEGER NOT NULL CHECK (confidence BETWEEN 1 AND 10),
      notes TEXT NOT NULL DEFAULT '',
      ai_analysis JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_mock_tests_user_created
      ON mock_tests(user_key, created_at DESC);
  `);
  initialized = true;
}

/* ─── Wellness Entries ───────────────────────────────────────────────────── */

function publicEntry(entry) {
  const { journal, rawTextEncrypted, ...rest } = entry;
  return rest;
}

export async function saveEntry(userKey, sessionKey, entry) {
  const encryptedJournal = encryptText(entry.journal);
  const activePool = getPool();
  if (!activePool) {
    const list = memoryEntries.get(userKey) || [];
    list.unshift({
      ...publicEntry(entry),
      sessionKey,
      rawTextEncrypted: encryptedJournal,
      stress: entry.stress,
      anxiety: entry.anxiety,
      confidence: entry.confidence,
      studyHours: entry.studyHours,
      emoji: entry.emoji,
      studySubject: entry.studySubject
    });
    memoryEntries.set(userKey, list.slice(0, 50));
    return publicEntry(entry);
  }

  const client = await activePool.connect();
  try {
    await initDb(client);
    await client.query(
      `INSERT INTO wellness_entries
        (id, user_key, session_key, exam, mood, energy, sleep_hours, stress, anxiety, confidence, study_hours, emoji, study_subject, raw_text_encrypted, analysis)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        entry.id,
        userKey,
        sessionKey,
        entry.exam,
        entry.mood,
        entry.energy,
        entry.sleepHours,
        entry.stress || 5,
        entry.anxiety || 5,
        entry.confidence || 5,
        entry.studyHours || 0,
        entry.emoji || '😊',
        entry.studySubject || '',
        JSON.stringify(encryptedJournal),
        JSON.stringify(entry.analysis)
      ]
    );
    return publicEntry(entry);
  } finally {
    client.release();
  }
}

export async function listEntries(userKey, limit = 10, { includeJournal = false } = {}) {
  const activePool = getPool();
  if (!activePool) {
    const entries = (memoryEntries.get(userKey) || []).slice(0, limit);
    return entries.map((entry) => attachMemoryInsights({
      ...publicEntry(entry),
      stress: entry.stress,
      anxiety: entry.anxiety,
      confidence: entry.confidence,
      studyHours: entry.studyHours,
      emoji: entry.emoji,
      studySubject: entry.studySubject,
      ...(includeJournal ? { journal: decryptText(entry.rawTextEncrypted) } : {})
    }));
  }

  const client = await activePool.connect();
  try {
    await initDb(client);
    const result = await client.query(
      `SELECT id, created_at, exam, mood, energy, sleep_hours, stress, anxiety, confidence, study_hours, emoji, study_subject, raw_text_encrypted, analysis
       FROM wellness_entries
       WHERE user_key = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userKey, limit]
    );
    const entries = result.rows.map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      exam: row.exam,
      mood: row.mood,
      energy: row.energy,
      sleepHours: Number(row.sleep_hours),
      stress: row.stress || 5,
      anxiety: row.anxiety || 5,
      confidence: row.confidence || 5,
      studyHours: Number(row.study_hours || 0),
      emoji: row.emoji || '😊',
      studySubject: row.study_subject || '',
      ...(includeJournal ? { journal: decryptText(row.raw_text_encrypted) } : {}),
      analysis: row.analysis
    }));
    return attachInsights(client, userKey, entries);
  } finally {
    client.release();
  }
}

function attachMemoryInsights(entry) {
  return {
    ...entry,
    insightBubbles: memoryInsights.get(entry.id) || []
  };
}

async function attachInsights(client, userKey, entries) {
  if (!entries.length) return entries;
  const result = await client.query(
    `SELECT id, entry_id, created_at, category, text, accent
     FROM journal_insights
     WHERE user_key = $1 AND entry_id = ANY($2::uuid[])
     ORDER BY created_at ASC`,
    [userKey, entries.map((entry) => entry.id)]
  );
  const byEntry = new Map();
  result.rows.forEach((row) => {
    const list = byEntry.get(row.entry_id) || [];
    list.push({
      id: row.id,
      entryId: row.entry_id,
      createdAt: row.created_at,
      category: row.category,
      text: row.text,
      accent: row.accent
    });
    byEntry.set(row.entry_id, list);
  });
  return entries.map((entry) => ({
    ...entry,
    insightBubbles: byEntry.get(entry.id) || []
  }));
}

export async function saveEntryInsights(userKey, entryId, insights) {
  const activePool = getPool();
  if (!activePool) {
    const ownsEntry = (memoryEntries.get(userKey) || []).some((entry) => entry.id === entryId);
    if (!ownsEntry) {
      const error = new Error('Journal entry was not found');
      error.status = 404;
      throw error;
    }
    const current = memoryInsights.get(entryId) || [];
    const next = [...current, ...insights];
    memoryInsights.set(entryId, next);
    return next;
  }

  const client = await activePool.connect();
  try {
    await initDb(client);
    const owned = await client.query(
      'SELECT id FROM wellness_entries WHERE id = $1 AND user_key = $2',
      [entryId, userKey]
    );
    if (!owned.rowCount) {
      const error = new Error('Journal entry was not found');
      error.status = 404;
      throw error;
    }
    for (const insight of insights) {
      await client.query(
        `INSERT INTO journal_insights (id, entry_id, user_key, category, text, accent)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [insight.id, entryId, userKey, insight.category, insight.text, insight.accent]
      );
    }
    const result = await client.query(
      `SELECT id, entry_id, created_at, category, text, accent
       FROM journal_insights
       WHERE user_key = $1 AND entry_id = $2
       ORDER BY created_at ASC`,
      [userKey, entryId]
    );
    return result.rows.map((row) => ({
      id: row.id,
      entryId: row.entry_id,
      createdAt: row.created_at,
      category: row.category,
      text: row.text,
      accent: row.accent
    }));
  } finally {
    client.release();
  }
}

/* ─── Chat Threads & Messages ────────────────────────────────────────────── */

export async function getOrCreateThread(userKey) {
  const activePool = getPool();
  if (!activePool) {
    const existing = memoryThreads.get(userKey);
    if (existing) return existing;
    const thread = { id: randomUUID(), title: 'Companion chat', createdAt: new Date().toISOString() };
    memoryThreads.set(userKey, thread);
    memoryMessages.set(thread.id, []);
    return thread;
  }

  const client = await activePool.connect();
  try {
    await initDb(client);
    const existing = await client.query(
      `SELECT id, title, created_at, updated_at FROM chat_threads
       WHERE user_key = $1 ORDER BY updated_at DESC LIMIT 1`,
      [userKey]
    );
    if (existing.rowCount) {
      const row = existing.rows[0];
      return { id: row.id, title: row.title, createdAt: row.created_at, updatedAt: row.updated_at };
    }
    const id = randomUUID();
    await client.query(
      'INSERT INTO chat_threads (id, user_key) VALUES ($1, $2)',
      [id, userKey]
    );
    return { id, title: 'Companion chat', createdAt: new Date().toISOString() };
  } finally {
    client.release();
  }
}

export async function saveChatMessage(userKey, threadId, message) {
  const activePool = getPool();
  if (!activePool) {
    const list = memoryMessages.get(threadId) || [];
    const saved = { ...message, threadId, createdAt: new Date().toISOString() };
    list.push(saved);
    memoryMessages.set(threadId, list.slice(-80));
    return saved;
  }

  const client = await activePool.connect();
  try {
    await initDb(client);
    await client.query(
      `INSERT INTO chat_messages (id, thread_id, user_key, role, content)
       VALUES ($1, $2, $3, $4, $5)`,
      [message.id, threadId, userKey, message.role, message.content]
    );
    await client.query(
      'UPDATE chat_threads SET updated_at = NOW() WHERE id = $1 AND user_key = $2',
      [threadId, userKey]
    );
    return { ...message, threadId, createdAt: new Date().toISOString() };
  } finally {
    client.release();
  }
}

export async function listChatMessages(userKey, threadId, limit = 30) {
  const activePool = getPool();
  if (!activePool) return (memoryMessages.get(threadId) || []).slice(-limit);

  const client = await activePool.connect();
  try {
    await initDb(client);
    const result = await client.query(
      `SELECT id, role, content, created_at
       FROM chat_messages
       WHERE user_key = $1 AND thread_id = $2
       ORDER BY created_at ASC
       LIMIT $3`,
      [userKey, threadId, limit]
    );
    return result.rows.map((row) => ({
      id: row.id,
      role: row.role,
      content: row.content,
      createdAt: row.created_at
    }));
  } finally {
    client.release();
  }
}

/* ─── Guestbook ──────────────────────────────────────────────────────────── */

export async function listGuestbookPosts(limit = 80) {
  const activePool = getPool();
  if (!activePool) return memoryGuestbook.slice(0, limit);

  const client = await activePool.connect();
  try {
    await initDb(client);
    const result = await client.query(
      `SELECT id, author_name, message, rotation, scale, x_offset, y_offset, color, created_at
       FROM guestbook_posts
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );
    return result.rows.map(publicGuestbookPost);
  } finally {
    client.release();
  }
}

export async function saveGuestbookPost(userKey, post) {
  const activePool = getPool();
  if (!activePool) {
    memoryGuestbook.unshift(post);
    return post;
  }

  const client = await activePool.connect();
  try {
    await initDb(client);
    await client.query(
      `INSERT INTO guestbook_posts
       (id, user_key, author_name, message, rotation, scale, x_offset, y_offset, color)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        post.id,
        userKey,
        post.authorName,
        post.message,
        post.rotation,
        post.scale,
        post.xOffset,
        post.yOffset,
        post.color
      ]
    );
    return post;
  } finally {
    client.release();
  }
}

function publicGuestbookPost(row) {
  return {
    id: row.id,
    authorName: row.author_name,
    message: row.message,
    rotation: Number(row.rotation),
    scale: Number(row.scale),
    xOffset: Number(row.x_offset),
    yOffset: Number(row.y_offset),
    color: row.color,
    createdAt: row.created_at
  };
}

/* ─── Exam Countdowns ────────────────────────────────────────────────────── */

export async function saveExamCountdown(userKey, countdown) {
  const activePool = getPool();
  const record = { id: randomUUID(), ...countdown, createdAt: new Date().toISOString() };
  if (!activePool) {
    const list = memoryExamCountdowns.get(userKey) || [];
    list.push(record);
    memoryExamCountdowns.set(userKey, list);
    return record;
  }

  const client = await activePool.connect();
  try {
    await initDb(client);
    await client.query(
      `INSERT INTO exam_countdowns (id, user_key, exam_name, exam_date, exam_type)
       VALUES ($1, $2, $3, $4, $5)`,
      [record.id, userKey, countdown.examName, countdown.examDate, countdown.examType]
    );
    return record;
  } finally {
    client.release();
  }
}

export async function listExamCountdowns(userKey) {
  const activePool = getPool();
  if (!activePool) {
    return (memoryExamCountdowns.get(userKey) || []).map(addDaysRemaining);
  }

  const client = await activePool.connect();
  try {
    await initDb(client);
    const result = await client.query(
      `SELECT id, exam_name, exam_date, exam_type, created_at
       FROM exam_countdowns
       WHERE user_key = $1
       ORDER BY exam_date ASC`,
      [userKey]
    );
    return result.rows.map((row) => addDaysRemaining({
      id: row.id,
      examName: row.exam_name,
      examDate: row.exam_date,
      examType: row.exam_type,
      createdAt: row.created_at
    }));
  } finally {
    client.release();
  }
}

export async function deleteExamCountdown(userKey, countdownId) {
  const activePool = getPool();
  if (!activePool) {
    const list = memoryExamCountdowns.get(userKey) || [];
    const filtered = list.filter((c) => c.id !== countdownId);
    memoryExamCountdowns.set(userKey, filtered);
    return filtered.length < list.length;
  }

  const client = await activePool.connect();
  try {
    await initDb(client);
    const result = await client.query(
      'DELETE FROM exam_countdowns WHERE id = $1 AND user_key = $2',
      [countdownId, userKey]
    );
    return result.rowCount > 0;
  } finally {
    client.release();
  }
}

function addDaysRemaining(countdown) {
  const examDate = new Date(countdown.examDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  examDate.setHours(0, 0, 0, 0);
  const diffMs = examDate.getTime() - today.getTime();
  const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return { ...countdown, daysRemaining };
}

/* ─── Weekly Reports ─────────────────────────────────────────────────────── */

export async function saveWeeklyReport(userKey, weekStart, reportJson) {
  const activePool = getPool();
  const record = { id: randomUUID(), weekStart, reportJson, createdAt: new Date().toISOString() };
  if (!activePool) {
    const list = memoryWeeklyReports.get(userKey) || [];
    list.unshift(record);
    memoryWeeklyReports.set(userKey, list.slice(0, 12));
    return record;
  }

  const client = await activePool.connect();
  try {
    await initDb(client);
    await client.query(
      `INSERT INTO weekly_reports (id, user_key, week_start, report_json)
       VALUES ($1, $2, $3, $4)`,
      [record.id, userKey, weekStart, JSON.stringify(reportJson)]
    );
    return record;
  } finally {
    client.release();
  }
}

export async function getLatestWeeklyReport(userKey) {
  const activePool = getPool();
  if (!activePool) {
    const list = memoryWeeklyReports.get(userKey) || [];
    return list[0] || null;
  }

  const client = await activePool.connect();
  try {
    await initDb(client);
    const result = await client.query(
      `SELECT id, week_start, report_json, created_at
       FROM weekly_reports
       WHERE user_key = $1
       ORDER BY week_start DESC
       LIMIT 1`,
      [userKey]
    );
    if (!result.rowCount) return null;
    const row = result.rows[0];
    return {
      id: row.id,
      weekStart: row.week_start,
      reportJson: row.report_json,
      createdAt: row.created_at
    };
  } finally {
    client.release();
  }
}

/* ─── Wellness Streaks ───────────────────────────────────────────────────── */

export async function getStreaks(userKey) {
  const activePool = getPool();
  if (!activePool) {
    return memoryStreaks.get(userKey) || defaultStreaks();
  }

  const client = await activePool.connect();
  try {
    await initDb(client);
    const result = await client.query(
      `SELECT streak_type, current_streak, longest_streak, last_activity_date
       FROM wellness_streaks
       WHERE user_key = $1`,
      [userKey]
    );
    if (!result.rowCount) return defaultStreaks();
    const streaks = {};
    result.rows.forEach((row) => {
      streaks[row.streak_type] = {
        currentStreak: row.current_streak,
        longestStreak: row.longest_streak,
        lastActivityDate: row.last_activity_date
      };
    });
    return { ...defaultStreaks(), ...streaks };
  } finally {
    client.release();
  }
}

export async function updateStreak(userKey, streakType) {
  const today = new Date().toISOString().split('T')[0];
  const activePool = getPool();

  if (!activePool) {
    const all = memoryStreaks.get(userKey) || defaultStreaks();
    const current = all[streakType] || { currentStreak: 0, longestStreak: 0, lastActivityDate: null };
    const lastDate = current.lastActivityDate;

    if (lastDate === today) return all;

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const newStreak = lastDate === yesterdayStr ? current.currentStreak + 1 : 1;
    const newLongest = Math.max(current.longestStreak, newStreak);

    all[streakType] = { currentStreak: newStreak, longestStreak: newLongest, lastActivityDate: today };
    memoryStreaks.set(userKey, all);
    return all;
  }

  const client = await activePool.connect();
  try {
    await initDb(client);
    const existing = await client.query(
      'SELECT current_streak, longest_streak, last_activity_date FROM wellness_streaks WHERE user_key = $1 AND streak_type = $2',
      [userKey, streakType]
    );

    if (!existing.rowCount) {
      await client.query(
        `INSERT INTO wellness_streaks (id, user_key, streak_type, current_streak, longest_streak, last_activity_date)
         VALUES ($1, $2, $3, 1, 1, $4)`,
        [randomUUID(), userKey, streakType, today]
      );
    } else {
      const row = existing.rows[0];
      const lastDate = row.last_activity_date ? new Date(row.last_activity_date).toISOString().split('T')[0] : null;
      if (lastDate === today) {
        return getStreaks(userKey);
      }

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const newStreak = lastDate === yesterdayStr ? row.current_streak + 1 : 1;
      const newLongest = Math.max(row.longest_streak, newStreak);

      await client.query(
        `UPDATE wellness_streaks
         SET current_streak = $1, longest_streak = $2, last_activity_date = $3, updated_at = NOW()
         WHERE user_key = $4 AND streak_type = $5`,
        [newStreak, newLongest, today, userKey, streakType]
      );
    }
    return getStreaks(userKey);
  } finally {
    client.release();
  }
}

function defaultStreaks() {
  return {
    journal: { currentStreak: 0, longestStreak: 0, lastActivityDate: null },
    checkin: { currentStreak: 0, longestStreak: 0, lastActivityDate: null },
    meditation: { currentStreak: 0, longestStreak: 0, lastActivityDate: null }
  };
}

/* ─── Mock Tests ─────────────────────────────────────────────────────────── */

export async function saveMockTest(userKey, testData, aiAnalysis) {
  const activePool = getPool();
  const record = {
    id: randomUUID(),
    ...testData,
    aiAnalysis,
    createdAt: new Date().toISOString()
  };

  if (!activePool) {
    const list = memoryMockTests.get(userKey) || [];
    list.unshift(record);
    memoryMockTests.set(userKey, list.slice(0, 50));
    return record;
  }

  const client = await activePool.connect();
  try {
    await initDb(client);
    await client.query(
      `INSERT INTO mock_tests (id, user_key, exam_type, score, max_score, confidence, notes, ai_analysis)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [record.id, userKey, testData.examType, testData.score, testData.maxScore, testData.confidence, testData.notes || '', JSON.stringify(aiAnalysis)]
    );
    return record;
  } finally {
    client.release();
  }
}

export async function listMockTests(userKey, limit = 20) {
  const activePool = getPool();
  if (!activePool) {
    return (memoryMockTests.get(userKey) || []).slice(0, limit);
  }

  const client = await activePool.connect();
  try {
    await initDb(client);
    const result = await client.query(
      `SELECT id, exam_type, score, max_score, confidence, notes, ai_analysis, created_at
       FROM mock_tests
       WHERE user_key = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userKey, limit]
    );
    return result.rows.map((row) => ({
      id: row.id,
      examType: row.exam_type,
      score: Number(row.score),
      maxScore: Number(row.max_score),
      confidence: row.confidence,
      notes: row.notes,
      aiAnalysis: row.ai_analysis,
      createdAt: row.created_at
    }));
  } finally {
    client.release();
  }
}

/* ─── Aggregation ────────────────────────────────────────────────────────── */

export async function getWeeklyAggregation(userKey, days = 7) {
  const entries = await listEntries(userKey, days * 3);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const weekEntries = entries.filter((e) => new Date(e.createdAt) >= cutoff);

  if (!weekEntries.length) return null;

  const avg = (field) => {
    const vals = weekEntries.map((e) => Number(e[field])).filter((v) => !isNaN(v));
    return vals.length ? Number((vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1)) : 0;
  };

  return {
    entryCount: weekEntries.length,
    avgMood: avg('mood'),
    avgEnergy: avg('energy'),
    avgSleep: avg('sleepHours'),
    avgStress: avg('stress'),
    avgAnxiety: avg('anxiety'),
    avgConfidence: avg('confidence'),
    avgStudyHours: avg('studyHours'),
    entries: weekEntries
  };
}
