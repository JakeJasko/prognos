import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const DATA_DIR = path.resolve(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, "predictions.db");
let dbInstance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(DB_PATH);
    dbInstance.exec("PRAGMA foreign_keys = ON;");
    dbInstance.exec("PRAGMA journal_mode = WAL;");
    initSchema(dbInstance);
  }
  return dbInstance;
}

function initSchema(db: DatabaseSync) {
  // 1. Users Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      google_id TEXT UNIQUE,
      email TEXT UNIQUE,
      name TEXT NOT NULL,
      avatar TEXT DEFAULT '🔭',
      created_at TEXT NOT NULL
    );
  `);

  // Migration: Add columns if table already existed
  try {
    db.exec("ALTER TABLE users ADD COLUMN email TEXT;");
  } catch {}
  try {
    db.exec("ALTER TABLE users ADD COLUMN google_id TEXT;");
  } catch {}

  // 2. Households Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS households (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      creator_id TEXT NOT NULL,
      invite_code TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS household_members (
      household_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT DEFAULT 'member',
      joined_at TEXT NOT NULL,
      PRIMARY KEY (household_id, user_id),
      FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // 3. Questions Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      creator_id TEXT NOT NULL,
      household_id TEXT,
      visibility TEXT NOT NULL DEFAULT 'PUBLIC',
      title TEXT NOT NULL,
      notes TEXT,
      resolve_by TEXT NOT NULL,
      resolved INTEGER NOT NULL DEFAULT 0,
      resolution TEXT,
      resolved_at TEXT,
      resolution_notes TEXT,
      tags TEXT DEFAULT '',
      created_at TEXT NOT NULL,
      FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE SET NULL
    );
  `);

  // Migration: Add visibility and household_id if needed
  try {
    db.exec("ALTER TABLE questions ADD COLUMN visibility TEXT NOT NULL DEFAULT 'PUBLIC';");
  } catch {}
  try {
    db.exec("ALTER TABLE questions ADD COLUMN household_id TEXT;");
  } catch {}

  // 4. Forecasts Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS forecasts (
      id TEXT PRIMARY KEY,
      question_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      probability REAL NOT NULL,
      comment TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_questions_resolve_by ON questions(resolve_by);
    CREATE INDEX IF NOT EXISTS idx_questions_visibility ON questions(visibility);
    CREATE INDEX IF NOT EXISTS idx_questions_household ON questions(household_id);
    CREATE INDEX IF NOT EXISTS idx_forecasts_question_id ON forecasts(question_id);
    CREATE INDEX IF NOT EXISTS idx_forecasts_user_id ON forecasts(user_id);
  `);

  // 5. Settings Table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Persist OAuth Client ID
  db.prepare(`
    INSERT INTO settings (key, value)
    VALUES ('GOOGLE_CLIENT_ID', '41612729297-7uth0o0td8rge7ipgjtnu2jnleimu3mh.apps.googleusercontent.com')
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run();

  // Seed default user if empty
  const userCountRow = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
  if (userCountRow.count === 0) {
    seedDemoData(db);
  }
}

export function getSetting(key: string): string | null {
  const db = getDb();
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as { value: string } | undefined;
  return row ? row.value : null;
}

export function setSetting(key: string, value: string): void {
  const db = getDb();
  db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, value);
}

export function seedDemoData(db: DatabaseSync) {
  // Clear existing
  db.exec(`
    DELETE FROM forecasts;
    DELETE FROM questions;
    DELETE FROM household_members;
    DELETE FROM households;
    DELETE FROM users;
  `);

  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;

  // 3 Distinct Forecasters
  const userJake = {
    id: "u_jake",
    google_id: "google_jake",
    email: "jake@prognos.local",
    name: "Jake",
    avatar: "🔭",
    created_at: new Date(now - 70 * DAY).toISOString()
  };
  const userSarah = {
    id: "u_sarah",
    google_id: "google_sarah",
    email: "sarah@prognos.local",
    name: "Sarah",
    avatar: "🪐",
    created_at: new Date(now - 60 * DAY).toISOString()
  };
  const userElena = {
    id: "u_elena",
    google_id: "google_elena",
    email: "elena@prognos.local",
    name: "Dr. Elena Vance",
    avatar: "🦉",
    created_at: new Date(now - 50 * DAY).toISOString()
  };

  for (const u of [userJake, userSarah, userElena]) {
    db.prepare("INSERT INTO users (id, google_id, email, name, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(
      u.id, u.google_id, u.email, u.name, u.avatar, u.created_at
    );
  }

  // Household: "Kepler Observatory Circle"
  const householdKepler = {
    id: "h_kepler",
    name: "Kepler Home Circle",
    creator_id: userJake.id,
    invite_code: "KEPLER-77",
    created_at: new Date(now - 45 * DAY).toISOString()
  };

  db.prepare("INSERT INTO households (id, name, creator_id, invite_code, created_at) VALUES (?, ?, ?, ?, ?)").run(
    householdKepler.id, householdKepler.name, householdKepler.creator_id, householdKepler.invite_code, householdKepler.created_at
  );

  // Members: Jake (owner) and Sarah (member)
  db.prepare("INSERT INTO household_members (household_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)").run(
    householdKepler.id, userJake.id, "owner", householdKepler.created_at
  );
  db.prepare("INSERT INTO household_members (household_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)").run(
    householdKepler.id, userSarah.id, "member", new Date(now - 40 * DAY).toISOString()
  );

  // Predictions: mix of Public and Household
  const demoQuestions = [
    // 1. PUBLIC - Resolved YES (Current Month)
    {
      id: "q_pub_1",
      creator_id: userJake.id,
      household_id: null,
      visibility: "PUBLIC",
      title: "Will the Federal Reserve cut benchmark interest rates at the September FOMC meeting?",
      notes: "Jerome Powell's Jackson Hole speech strongly signaled rate easing.",
      resolve_by: new Date(now - 2 * DAY).toISOString(),
      resolved: 1,
      resolution: "YES",
      resolved_at: new Date(now - 2 * DAY).toISOString(),
      resolution_notes: "Fed instituted a 50 bps reduction.",
      tags: "Finance, Macro",
      created_at: new Date(now - 30 * DAY).toISOString(),
      forecasts: [
        { user_id: userJake.id, prob: 0.90, comment: "High confidence given softening labor data", time: -30 * DAY },
        { user_id: userSarah.id, prob: 0.80, comment: "Likely 25 or 50 bps cut", time: -25 * DAY },
        { user_id: userElena.id, prob: 0.85, comment: "Bond markets have fully priced it in", time: -20 * DAY }
      ]
    },
    // 2. PUBLIC - Resolved YES (Current Month)
    {
      id: "q_pub_2",
      creator_id: userElena.id,
      household_id: null,
      visibility: "PUBLIC",
      title: "Will OpenAI release an o1 reasoning model series before Q4?",
      notes: "Industry reporting indicates Strawberry was slated for an early Autumn launch.",
      resolve_by: new Date(now - 4 * DAY).toISOString(),
      resolved: 1,
      resolution: "YES",
      resolved_at: new Date(now - 4 * DAY).toISOString(),
      resolution_notes: "o1-preview was officially announced.",
      tags: "AI, Tech",
      created_at: new Date(now - 40 * DAY).toISOString(),
      forecasts: [
        { user_id: userElena.id, prob: 0.95, comment: "Confident on competitive timing", time: -40 * DAY },
        { user_id: userJake.id, prob: 0.80, comment: "Seems plausible given demo cadence", time: -35 * DAY },
        { user_id: userSarah.id, prob: 0.65, comment: "Safety evaluations could delay", time: -30 * DAY }
      ]
    },
    // 3. PUBLIC - Resolved NO (Past Month)
    {
      id: "q_pub_3",
      creator_id: userSarah.id,
      household_id: null,
      visibility: "PUBLIC",
      title: "Will SpaceX conduct Flight 5 of Starship before the end of August?",
      notes: "FAA license approval timelines remained the primary bottleneck.",
      resolve_by: new Date(now - 25 * DAY).toISOString(),
      resolved: 1,
      resolution: "NO",
      resolved_at: new Date(now - 24 * DAY).toISOString(),
      resolution_notes: "Target moved to October due to regulatory review.",
      tags: "Space, Tech",
      created_at: new Date(now - 55 * DAY).toISOString(),
      forecasts: [
        { user_id: userSarah.id, prob: 0.35, comment: "FAA review typically takes longer", time: -55 * DAY },
        { user_id: userJake.id, prob: 0.40, comment: "Hardware ready, paperwork pending", time: -50 * DAY },
        { user_id: userElena.id, prob: 0.25, comment: "Unlikely before September", time: -45 * DAY }
      ]
    },
    // 4. PUBLIC - Active Question with competing forecasts
    {
      id: "q_pub_4",
      creator_id: userElena.id,
      household_id: null,
      visibility: "PUBLIC",
      title: "Will global crude oil prices remain below $85/barrel through next month?",
      notes: "Weighing OPEC+ production quota shifts against geopolitical friction.",
      resolve_by: new Date(now + 20 * DAY).toISOString(),
      resolved: 0,
      resolution: null,
      resolved_at: null,
      resolution_notes: null,
      tags: "Commodities, Macro",
      created_at: new Date(now - 8 * DAY).toISOString(),
      forecasts: [
        { user_id: userElena.id, prob: 0.70, comment: "Weak global demand exerts downward pressure", time: -8 * DAY },
        { user_id: userJake.id, prob: 0.60, comment: "Volatile supply chains keep risk premium high", time: -5 * DAY },
        { user_id: userSarah.id, prob: 0.75, comment: "Inventories appear adequate", time: -3 * DAY }
      ]
    },
    // 5. PUBLIC - Active Question
    {
      id: "q_pub_5",
      creator_id: userJake.id,
      household_id: null,
      visibility: "PUBLIC",
      title: "Will Apple announce an M4 Mac Mini redesign before November?",
      notes: "Supply chain leaks indicate smaller form factor similar to Apple TV size.",
      resolve_by: new Date(now + 35 * DAY).toISOString(),
      resolved: 0,
      resolution: null,
      resolved_at: null,
      resolution_notes: null,
      tags: "Tech, Hardware",
      created_at: new Date(now - 6 * DAY).toISOString(),
      forecasts: [
        { user_id: userJake.id, prob: 0.85, comment: "Mark Gurman and supply chain reports concur", time: -6 * DAY },
        { user_id: userSarah.id, prob: 0.80, comment: "Overdue for a chassis update", time: -2 * DAY }
      ]
    },
    // 6. HOUSEHOLD (Private to Kepler Circle) - Resolved YES
    {
      id: "q_hh_1",
      creator_id: userJake.id,
      household_id: householdKepler.id,
      visibility: "HOUSEHOLD",
      title: "Will we finish the living room painting project by the holiday weekend?",
      notes: "Need primer and two coats of matte finish.",
      resolve_by: new Date(now - 12 * DAY).toISOString(),
      resolved: 1,
      resolution: "YES",
      resolved_at: new Date(now - 12 * DAY).toISOString(),
      resolution_notes: "Finished on Sunday afternoon.",
      tags: "Home, Personal",
      created_at: new Date(now - 25 * DAY).toISOString(),
      forecasts: [
        { user_id: userJake.id, prob: 0.80, comment: "Weekend cleared specifically for this", time: -25 * DAY },
        { user_id: userSarah.id, prob: 0.70, comment: "Depends on paint drying time", time: -20 * DAY }
      ]
    },
    // 7. HOUSEHOLD (Private to Kepler Circle) - Active
    {
      id: "q_hh_2",
      creator_id: userSarah.id,
      household_id: householdKepler.id,
      visibility: "HOUSEHOLD",
      title: "Will our home network backup server maintain 99.9% uptime throughout this month?",
      notes: "UPS battery installed, ISP scheduled maintenance is sole variable.",
      resolve_by: new Date(now + 15 * DAY).toISOString(),
      resolved: 0,
      resolution: null,
      resolved_at: null,
      resolution_notes: null,
      tags: "Tech, Home",
      created_at: new Date(now - 10 * DAY).toISOString(),
      forecasts: [
        { user_id: userSarah.id, prob: 0.85, comment: "Hardware has been very reliable", time: -10 * DAY },
        { user_id: userJake.id, prob: 0.90, comment: "Monitoring alarms configured", time: -8 * DAY }
      ]
    }
  ];

  for (const q of demoQuestions) {
    db.prepare(`
      INSERT INTO questions (id, creator_id, household_id, visibility, title, notes, resolve_by, resolved, resolution, resolved_at, resolution_notes, tags, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      q.id, q.creator_id, q.household_id, q.visibility, q.title, q.notes, q.resolve_by, q.resolved, q.resolution, q.resolved_at, q.resolution_notes, q.tags, q.created_at
    );

    for (const f of q.forecasts) {
      const fid = "f_" + crypto.randomUUID().slice(0, 8);
      const fTime = new Date(now + f.time).toISOString();
      db.prepare(`
        INSERT INTO forecasts (id, question_id, user_id, probability, comment, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(fid, q.id, f.user_id, f.prob, f.comment, fTime);
    }
  }
}
