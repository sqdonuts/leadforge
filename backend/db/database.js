// ============================================================
// db/database.js — SQLite schema + helper methods
// ============================================================
const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');
const { logger } = require('../utils/logger');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../data/leadgen.db');

let _db;

function getDb() {
  if (!_db) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
  }
  return _db;
}

// ── Schema ─────────────────────────────────────────────────
function initDb() {
  const db = getDb();

  db.exec(`
    -- ── Search jobs ───────────────────────────────────────
    CREATE TABLE IF NOT EXISTS searches (
      id            TEXT PRIMARY KEY,
      category      TEXT NOT NULL,
      location      TEXT NOT NULL,
      lead_limit    INTEGER DEFAULT 100,
      status        TEXT DEFAULT 'pending',   -- pending|running|done|error|cancelled
      total_found   INTEGER DEFAULT 0,
      total_enriched INTEGER DEFAULT 0,
      created_at    TEXT DEFAULT (datetime('now')),
      finished_at   TEXT
    );

    -- ── Individual leads ──────────────────────────────────
    CREATE TABLE IF NOT EXISTS leads (
      id              TEXT PRIMARY KEY,
      search_id       TEXT NOT NULL REFERENCES searches(id) ON DELETE CASCADE,

      -- LinkedIn fields
      full_name       TEXT,
      title           TEXT,
      company         TEXT,
      linkedin_url    TEXT,
      location        TEXT,

      -- Company enrichment
      company_website TEXT,
      company_domain  TEXT,
      industry        TEXT,
      company_size    TEXT,

      -- Email
      email_professional TEXT,
      email_generic      TEXT,
      email_verified     INTEGER DEFAULT 0,
      phone              TEXT,
      email_source       TEXT,

      -- Google Business
      google_rating      REAL,
      review_count       INTEGER,
      google_address     TEXT,
      google_phone       TEXT,
      google_place_id    TEXT,

      -- Revenue analysis
      revenue_loss_pct   REAL,
      revenue_loss_est   TEXT,
      industry_avg_rating REAL DEFAULT 4.7,

      -- Lead scoring
      lead_score         TEXT,    -- hot|warm|cold
      score_value        INTEGER,

      -- Pipeline state
      linkedin_done      INTEGER DEFAULT 0,
      enrichment_done    INTEGER DEFAULT 0,
      email_done         INTEGER DEFAULT 0,
      google_done        INTEGER DEFAULT 0,
      pipeline_error     TEXT,

      created_at  TEXT DEFAULT (datetime('now')),
      updated_at  TEXT DEFAULT (datetime('now'))
    );

    -- ── Campaigns ────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS campaigns (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      search_id   TEXT REFERENCES searches(id),
      status      TEXT DEFAULT 'draft',
      created_at  TEXT DEFAULT (datetime('now'))
    );

    -- ── Campaign ↔ Lead mapping ───────────────────────────
    CREATE TABLE IF NOT EXISTS campaign_leads (
      campaign_id TEXT REFERENCES campaigns(id) ON DELETE CASCADE,
      lead_id     TEXT REFERENCES leads(id)     ON DELETE CASCADE,
      status      TEXT DEFAULT 'pending',
      sent_at     TEXT,
      PRIMARY KEY (campaign_id, lead_id)
    );

    -- ── Session storage (LinkedIn) ────────────────────────
    CREATE TABLE IF NOT EXISTS sessions (
      key         TEXT PRIMARY KEY,
      value       TEXT,
      expires_at  TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_leads_search  ON leads(search_id);
    CREATE INDEX IF NOT EXISTS idx_leads_score   ON leads(score_value DESC);
    CREATE INDEX IF NOT EXISTS idx_leads_email   ON leads(email_professional);
  `);

  logger.info('Database initialised');
  return db;
}

// ── CRUD helpers ───────────────────────────────────────────
const createSearch = (id, category, location, limit) => {
  return getDb().prepare(`
    INSERT INTO searches (id, category, location, lead_limit, status)
    VALUES (?, ?, ?, ?, 'running')
  `).run(id, category, location, limit);
};

const updateSearch = (id, fields) => {
  const sets = Object.keys(fields).map(k => `${k}=?`).join(',');
  return getDb().prepare(`UPDATE searches SET ${sets} WHERE id=?`)
    .run(...Object.values(fields), id);
};

const getSearch = (id) =>
  getDb().prepare('SELECT * FROM searches WHERE id=?').get(id);

const listSearches = () =>
  getDb().prepare('SELECT * FROM searches ORDER BY created_at DESC').all();

const upsertLead = (lead) => {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM leads WHERE id=?').get(lead.id);
  if (existing) {
    const sets = Object.keys(lead).filter(k => k !== 'id').map(k => `${k}=?`).join(',');
    return db.prepare(`UPDATE leads SET ${sets}, updated_at=datetime('now') WHERE id=?`)
      .run(...Object.keys(lead).filter(k => k !== 'id').map(k => lead[k]), lead.id);
  }
  const cols = Object.keys(lead).join(',');
  const phs  = Object.keys(lead).map(() => '?').join(',');
  return db.prepare(`INSERT OR IGNORE INTO leads (${cols}) VALUES (${phs})`).run(...Object.values(lead));
};

const updateLead = (id, fields) => {
  const sets = Object.keys(fields).map(k => `${k}=?`).join(',');
  return getDb().prepare(`UPDATE leads SET ${sets}, updated_at=datetime('now') WHERE id=?`)
    .run(...Object.values(fields), id);
};

const getLeads = (searchId) =>
  getDb().prepare('SELECT * FROM leads WHERE search_id=? ORDER BY score_value DESC').all(searchId);

const getLead = (id) =>
  getDb().prepare('SELECT * FROM leads WHERE id=?').get(id);

const countLeads = (searchId) =>
  getDb().prepare('SELECT COUNT(*) as n FROM leads WHERE search_id=?').get(searchId).n;

const saveSession = (key, value, ttlHours = 24) => {
  const expires = new Date(Date.now() + ttlHours * 3600 * 1000).toISOString();
  return getDb().prepare(`
    INSERT OR REPLACE INTO sessions (key, value, expires_at) VALUES (?,?,?)
  `).run(key, JSON.stringify(value), expires);
};

const loadSession = (key) => {
  const row = getDb().prepare('SELECT * FROM sessions WHERE key=?').get(key);
  if (!row) return null;
  if (new Date(row.expires_at) < new Date()) {
    getDb().prepare('DELETE FROM sessions WHERE key=?').run(key);
    return null;
  }
  return JSON.parse(row.value);
};

module.exports = {
  getDb, initDb,
  createSearch, updateSearch, getSearch, listSearches,
  upsertLead, updateLead, getLeads, getLead, countLeads,
  saveSession, loadSession
};
