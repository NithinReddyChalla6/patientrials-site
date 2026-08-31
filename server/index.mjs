import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import {
  seedIfEmpty,
  findUserByEmail,
  findUserById,
  emailExists,
  createUser,
  toPublicUser,
  getSiteState,
  saveSiteState,
} from './db.mjs'

/**
 * PatienTrials auth + persistence API.
 *
 * A small Express service backed by SQLite (local dev) or Postgres (production,
 * via DATABASE_URL). It verifies who someone is — passwords checked against
 * bcrypt hashes, a signed JWT to keep them logged in — and stores the site's
 * data so it survives a refresh. Every database call is awaited so the two
 * backends are interchangeable.
 */
const PORT = process.env.PORT || 3001
const JWT_SECRET = process.env.JWT_SECRET || 'patientrials-dev-secret-change-in-prod'
const TOKEN_TTL = '12h'

const app = express()
app.use(cors())
app.use(express.json({ limit: '2mb' }))

const seeded = await seedIfEmpty()
console.log(
  `[auth] database ready — ${
    seeded.seeded ? `seeded ${seeded.count} demo accounts` : `${seeded.count} existing accounts`
  }`,
)

function sessionFor(row) {
  const user = toPublicUser(row)
  const token = jwt.sign({ sub: row.id }, JWT_SECRET, { expiresIn: TOKEN_TTL })
  return { token, user, siteId: user.siteId }
}

app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body ?? {}
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' })
  }
  const row = await findUserByEmail(email)
  if (!row || !bcrypt.compareSync(String(password), row.passwordHash)) {
    return res.status(401).json({ error: 'That email and password combination was not recognised.' })
  }
  if (!row.active) {
    return res
      .status(403)
      .json({ error: 'This account is inactive. Ask your site administrator to re-enable it.' })
  }
  res.json(sessionFor(row))
})

app.post('/api/auth/register', async (req, res) => {
  const { firstName, lastName, email, password, role, siteId } = req.body ?? {}
  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required.' })
  }
  if (String(password).length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' })
  }
  if (await emailExists(email)) {
    return res.status(409).json({ error: 'An account already exists for this email address.' })
  }
  const row = await createUser({
    firstName,
    lastName,
    email,
    password: String(password),
    role: role || 'site_administrator',
    siteId: siteId || 'SITE-MDASIT10',
  })
  res.status(201).json({ user: toPublicUser(row) })
})

// Site data persistence. Returns null until the client seeds it, then stores
// whatever the client sends after each edit.
app.get('/api/site-state', async (_req, res) => {
  res.json(await getSiteState())
})

app.put('/api/site-state', async (req, res) => {
  const body = req.body
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ error: 'Invalid site state.' })
  }
  await saveSiteState(body)
  res.json({ ok: true })
})

app.get('/api/auth/me', async (req, res) => {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Not signed in.' })
  let sub
  try {
    ;({ sub } = jwt.verify(token, JWT_SECRET))
  } catch {
    return res.status(401).json({ error: 'Your session has expired. Please sign in again.' })
  }
  const user = toPublicUser(await findUserById(sub))
  if (!user) return res.status(401).json({ error: 'Account not found.' })
  res.json({ user, siteId: user.siteId })
})

app.listen(PORT, () => console.log(`[auth] PatienTrials auth API on http://localhost:${PORT}`))
