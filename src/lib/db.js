import { Pool } from 'pg';
import { getRequiredEnv, isProduction } from './env';
import { decryptText, encryptText } from './crypto';

let pool;
let initialized = false;
const memoryStore = new Map();

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
      raw_text_encrypted JSONB NOT NULL,
      analysis JSONB NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_wellness_entries_session_created
      ON wellness_entries(user_key, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_wellness_entries_login_session
      ON wellness_entries(user_key, session_key, created_at DESC);
  `);
  initialized = true;
}

function publicEntry(entry) {
  const { journal, ...rest } = entry;
  return rest;
}

export async function saveEntry(userKey, sessionKey, entry) {
  const encryptedJournal = encryptText(entry.journal);
  const activePool = getPool();
  if (!activePool) {
    const list = memoryStore.get(userKey) || [];
    list.unshift({ ...publicEntry(entry), sessionKey, rawTextEncrypted: encryptedJournal });
    memoryStore.set(userKey, list.slice(0, 20));
    return publicEntry(entry);
  }

  const client = await activePool.connect();
  try {
    await initDb(client);
    await client.query(
      `INSERT INTO wellness_entries
        (id, user_key, session_key, exam, mood, energy, sleep_hours, raw_text_encrypted, analysis)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        entry.id,
        userKey,
        sessionKey,
        entry.exam,
        entry.mood,
        entry.energy,
        entry.sleepHours,
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
    const entries = memoryStore.get(userKey) || [];
    if (!includeJournal) {
      return entries.map(({ rawTextEncrypted, ...entry }) => entry);
    }
    return entries.map((entry) => ({
      ...entry,
      journal: decryptText(entry.rawTextEncrypted)
    }));
  }

  const client = await activePool.connect();
  try {
    await initDb(client);
    const result = await client.query(
      `SELECT id, created_at, exam, mood, energy, sleep_hours, raw_text_encrypted, analysis
       FROM wellness_entries
       WHERE user_key = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userKey, limit]
    );
    return result.rows.map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      exam: row.exam,
      mood: row.mood,
      energy: row.energy,
      sleepHours: Number(row.sleep_hours),
      ...(includeJournal ? { journal: decryptText(row.raw_text_encrypted) } : {}),
      analysis: row.analysis
    }));
  } finally {
    client.release();
  }
}
