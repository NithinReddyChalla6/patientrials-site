import pg from 'pg'
import bcrypt from 'bcryptjs'
import { SEED_USERS } from './seed-users.mjs'

/**
 * Postgres backend — used in production when DATABASE_URL is set (e.g. a Neon
 * database). Column names are quoted so their camelCase survives (Postgres
 * folds unquoted identifiers to lowercase), and the site document is stored as
 * JSONB. Same interface as the SQLite backend; here the calls are genuinely
 * async.
 */
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
})

await pool.query(`
  CREATE TABLE IF NOT EXISTS users (
    id             TEXT PRIMARY KEY,
    "firstName"    TEXT NOT NULL,
    "lastName"     TEXT NOT NULL,
    email          TEXT NOT NULL UNIQUE,
    role           TEXT NOT NULL,
    "siteId"       TEXT NOT NULL,
    active         BOOLEAN NOT NULL DEFAULT TRUE,
    "passwordHash" TEXT NOT NULL,
    "invitedAt"    TEXT
  );
`)

await pool.query(`
  CREATE TABLE IF NOT EXISTS site_state (
    id   INTEGER PRIMARY KEY,
    data JSONB NOT NULL
  );
`)

export async function seedIfEmpty() {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM users')
  const n = rows[0].n
  if (n > 0) return { seeded: false, count: n }

  const invitedAt = new Date().toISOString()
  for (const u of SEED_USERS) {
    await pool.query(
      `INSERT INTO users (id, "firstName", "lastName", email, role, "siteId", active, "passwordHash", "invitedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        u.id,
        u.firstName,
        u.lastName,
        u.email.toLowerCase(),
        u.role,
        u.siteId,
        u.active,
        bcrypt.hashSync(u.password, 10),
        invitedAt,
      ],
    )
  }
  return { seeded: true, count: SEED_USERS.length }
}

export async function findUserByEmail(email) {
  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [
    String(email).trim().toLowerCase(),
  ])
  return rows[0] ?? null
}

export async function findUserById(id) {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id])
  return rows[0] ?? null
}

export async function emailExists(email) {
  return Boolean(await findUserByEmail(email))
}

export async function createUser({ firstName, lastName, email, role, siteId, password }) {
  const id = 'USR-' + Math.random().toString(36).slice(2, 8).toUpperCase()
  await pool.query(
    `INSERT INTO users (id, "firstName", "lastName", email, role, "siteId", active, "passwordHash", "invitedAt")
     VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7, $8)`,
    [id, firstName, lastName, email.toLowerCase(), role, siteId, bcrypt.hashSync(password, 10), new Date().toISOString()],
  )
  return findUserById(id)
}

export function toPublicUser(row) {
  if (!row) return null
  const { passwordHash: _hash, active, ...rest } = row
  return { ...rest, active: Boolean(active) }
}

export async function getSiteState() {
  const { rows } = await pool.query('SELECT data FROM site_state WHERE id = 1')
  return rows[0] ? rows[0].data : null
}

export async function saveSiteState(data) {
  await pool.query(
    `INSERT INTO site_state (id, data) VALUES (1, $1::jsonb)
     ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
    [JSON.stringify(data)],
  )
}
