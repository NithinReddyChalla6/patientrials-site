import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import bcrypt from 'bcryptjs'
import { SEED_USERS } from './seed-users.mjs'

/**
 * SQLite backend — used for local development (no DATABASE_URL). A single file
 * on disk, zero setup. Passwords live only as bcrypt hashes. The functions are
 * synchronous but callers `await` them so this and the Postgres backend share
 * one interface.
 */
const dir = dirname(fileURLToPath(import.meta.url))
// DB_PATH lets a host point the database at a persistent volume; locally it
// lives next to the server.
const DB_PATH = process.env.DB_PATH || join(dir, 'data.sqlite')

const db = new DatabaseSync(DB_PATH)

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id           TEXT PRIMARY KEY,
    firstName    TEXT NOT NULL,
    lastName     TEXT NOT NULL,
    email        TEXT NOT NULL UNIQUE,
    role         TEXT NOT NULL,
    siteId       TEXT NOT NULL,
    active       INTEGER NOT NULL DEFAULT 1,
    passwordHash TEXT NOT NULL,
    invitedAt    TEXT,
    mustChangePassword INTEGER NOT NULL DEFAULT 0
  );
`)

// Existing databases predate the column. SQLite has no ADD COLUMN IF NOT EXISTS,
// so adding it twice is expected to throw and is safe to ignore.
try {
  db.exec('ALTER TABLE users ADD COLUMN mustChangePassword INTEGER NOT NULL DEFAULT 0')
} catch {
  // already present
}

db.exec(`
  CREATE TABLE IF NOT EXISTS site_state (
    id   INTEGER PRIMARY KEY CHECK (id = 1),
    data TEXT NOT NULL
  );
`)

export function seedIfEmpty() {
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM users').get()
  if (n > 0) return { seeded: false, count: n }

  const insert = db.prepare(
    `INSERT INTO users (id, firstName, lastName, email, role, siteId, active, passwordHash, invitedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  const invitedAt = new Date().toISOString()
  for (const u of SEED_USERS) {
    insert.run(
      u.id,
      u.firstName,
      u.lastName,
      u.email.toLowerCase(),
      u.role,
      u.siteId,
      u.active ? 1 : 0,
      bcrypt.hashSync(u.password, 10),
      invitedAt,
    )
  }
  return { seeded: true, count: SEED_USERS.length }
}

export function findUserByEmail(email) {
  return (
    db.prepare('SELECT * FROM users WHERE email = ?').get(String(email).trim().toLowerCase()) ?? null
  )
}

export function findUserById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) ?? null
}

export function emailExists(email) {
  return Boolean(findUserByEmail(email))
}

export function createUser({ firstName, lastName, email, role, siteId, password }) {
  const id = 'USR-' + Math.random().toString(36).slice(2, 8).toUpperCase()
  db.prepare(
    `INSERT INTO users (id, firstName, lastName, email, role, siteId, active, passwordHash, invitedAt)
     VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
  ).run(
    id,
    firstName,
    lastName,
    email.toLowerCase(),
    role,
    siteId,
    bcrypt.hashSync(password, 10),
    new Date().toISOString(),
  )
  return findUserById(id)
}

export function toPublicUser(row) {
  if (!row) return null
  const { passwordHash: _hash, active, mustChangePassword, ...rest } = row
  return { ...rest, active: Boolean(active), mustChangePassword: Boolean(mustChangePassword) }
}

export function getSiteState() {
  const row = db.prepare('SELECT data FROM site_state WHERE id = 1').get()
  return row ? JSON.parse(row.data) : null
}

export function saveSiteState(data) {
  db.prepare(
    `INSERT INTO site_state (id, data) VALUES (1, ?)
     ON CONFLICT(id) DO UPDATE SET data = excluded.data`,
  ).run(JSON.stringify(data))
}

/** Replace someone's password hash, and say whether they must change it next. */
/** Enable or disable a sign-in. The login refuses an inactive account. */
export function setActive(id, active) {
  db.prepare('UPDATE users SET active = ? WHERE id = ?').run(active ? 1 : 0, id)
  return findUserById(id)
}

export function setPassword(id, passwordHash, mustChangePassword) {
  db.prepare('UPDATE users SET passwordHash = ?, mustChangePassword = ? WHERE id = ?').run(
    passwordHash,
    mustChangePassword ? 1 : 0,
    id,
  )
  return findUserById(id)
}
