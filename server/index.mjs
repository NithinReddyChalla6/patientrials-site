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
  setPassword,
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

/** The signed-in user for a request, or null when the token is missing or bad. */
async function currentUser(req) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return null
  try {
    const { sub } = jwt.verify(token, JWT_SECRET)
    return await findUserById(sub)
  } catch {
    return null
  }
}

/** The first rule a password fails, or null when it passes them all. */
function passwordProblem(value) {
  const v = String(value ?? '')
  if (v.length < 8) return 'Password must be at least 8 characters.'
  if (v.length > 40) return 'Password must be no more than 40 characters.'
  if (!/[a-z]/.test(v)) return 'Password must include a lowercase letter.'
  if (!/[A-Z]/.test(v)) return 'Password must include an uppercase letter.'
  if (!/[0-9]/.test(v)) return 'Password must include a number.'
  return null
}

// Ambiguous characters (l, I, 1, O, 0) are left out so the password survives
// being read aloud or copied by hand.
const PW_LOWER = 'abcdefghijkmnopqrstuvwxyz'
const PW_UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const PW_DIGITS = '23456789'
const pickFrom = (set) => set[Math.floor(Math.random() * set.length)]

function generatePassword() {
  const all = PW_LOWER + PW_UPPER + PW_DIGITS
  const chars = [pickFrom(PW_LOWER), pickFrom(PW_UPPER), pickFrom(PW_DIGITS)]
  while (chars.length < 10) chars.push(pickFrom(all))
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}

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

// Site data persistence.
//
// This is the whole site's record — people, studies, participants. It is
// readable and writable only by someone signed in to the site; an unauthenticated
// caller gets 401 rather than the data.
app.get('/api/site-state', async (req, res) => {
  const caller = await currentUser(req)
  if (!caller) return res.status(401).json({ error: 'Not signed in.' })
  res.json(await getSiteState())
})

app.put('/api/site-state', async (req, res) => {
  const caller = await currentUser(req)
  if (!caller) return res.status(401).json({ error: 'Not signed in.' })

  const body = req.body
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ error: 'Invalid site state.' })
  }
  await saveSiteState(body)
  res.json({ ok: true })
})

/**
 * Issue a new password for a collaborator. Administrators only.
 *
 * The plaintext is returned exactly once, for the administrator to pass on;
 * only its hash is stored. The account is flagged so its holder must choose
 * their own password before they can use it for anything else.
 */
app.post('/api/auth/reset-password', async (req, res) => {
  const caller = await currentUser(req)
  if (!caller) return res.status(401).json({ error: 'Not signed in.' })
  if (caller.role !== 'site_administrator') {
    return res.status(403).json({ error: 'Only a site administrator can reset a password.' })
  }

  const { userId } = req.body ?? {}
  if (!userId) return res.status(400).json({ error: 'userId is required.' })

  const target = await findUserById(userId)
  if (!target) return res.status(404).json({ error: 'Collaborator not found.' })

  const password = generatePassword()
  await setPassword(target.id, bcrypt.hashSync(password, 10), true)
  res.json({ password, user: toPublicUser(await findUserById(target.id)) })
})

/** Replace an issued password with one of your own. */
app.post('/api/auth/change-password', async (req, res) => {
  const me = await currentUser(req)
  if (!me) return res.status(401).json({ error: 'Not signed in.' })

  const { currentPassword, newPassword } = req.body ?? {}
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required.' })
  }
  if (!bcrypt.compareSync(String(currentPassword), me.passwordHash)) {
    return res.status(401).json({ error: 'That current password is not right.' })
  }
  const problem = passwordProblem(newPassword)
  if (problem) return res.status(400).json({ error: problem })

  await setPassword(me.id, bcrypt.hashSync(String(newPassword), 10), false)
  res.json({ user: toPublicUser(await findUserById(me.id)) })
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


/* ------------------------------------------------------------- assistant */

/**
 * The study assistant.
 *
 * Any OpenAI-compatible provider works — Groq, OpenAI, a local Ollama — because
 * they share a request shape. Which one is in use is three environment
 * variables rather than a code change, so moving between a free tier and a paid
 * one, or between a hosted model and a laptop, costs a redeploy and nothing
 * else.
 *
 * The key lives here and only here. A key in the front end is readable by
 * anyone who opens their developer tools, so the browser talks to this route
 * and this route talks to the provider.
 */
const LLM_API_KEY = process.env.LLM_API_KEY
const LLM_BASE_URL = process.env.LLM_BASE_URL || 'https://api.groq.com/openai/v1'
const LLM_MODEL = process.env.LLM_MODEL || 'openai/gpt-oss-20b'

/**
 * How the assistant speaks.
 *
 * Warm first, useful second. A greeting gets a greeting — a coordinator who
 * says hello and is answered with a table has learnt the thing is a form with a
 * cursor, and stops talking to it. But warmth without honesty is worse than
 * neither here: it must say plainly when it does not know, because a confident
 * wrong answer about a participant is the one failure this cannot afford.
 */
const ASSISTANT_SYSTEM = `You are the assistant inside PatienTrials, a portal that clinical research sites use to run trials.

You are talking to site staff — coordinators, investigators, administrators — usually mid-task.

How to talk:
- Warm and direct. If someone greets you, greet them back in one short line.
- Two or three sentences. Say the thing, stop.
- Write like a colleague, not a brochure. No "think of me as", no "I'm here to help you navigate", no listing your own features unless asked.
- If something has gone wrong, acknowledge it before getting practical.

How to format:
- Plain sentences. You are in a narrow side panel about 380 pixels wide.
- Never use tables. A markdown table renders as raw pipe characters here and is unreadable.
- For more than three items, use short lines starting with "- ". Keep each under about ten words.
- No headings, no bold, no markdown of any kind.

What you can actually do, if asked:
- Answer questions about the studies you are shown: status, recruitment, targets, who the investigator is, how many participants sit at each stage.
- Explain what those numbers mean and which look worth attention.
- Open a screen. When someone asks to see or go to something, call the open_screen tool with one of the paths you were given, and write your usual short reply as well.
- Propose booking a visit. When someone asks to book, schedule or arrange an appointment, call propose_booking with what they said. Repeat their words back — the participant as they named them, the visit as they named it. Work out the date from today's date, given below, and return it as YYYY-MM-DD. Do not invent a participant or a visit they did not mention. Nothing is booked by this: they are shown what you understood and decide whether it happens, so say what you are proposing in your reply.
You cannot see individual participants, and you never change anything yourself — a booking only happens if the person confirms it. Say so plainly rather than implying otherwise.

Only ever pass a path from the list you were given, copied exactly. Never invent one. If nothing in the list fits, say where they would find it and do not call the tool.


What you must never do:
- Never invent a number, a name, or a date. If it is not in what you were given, say you cannot see it.
- Never give medical advice or judge whether someone is eligible. That is the investigator's decision.
- Never claim you have done something.

If you are unsure, say so. Being wrong about a study is worse than being unhelpful.`

const WEEKDAYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
]

/**
 * The date a phrase like "next Tuesday" actually means.
 *
 * Calendar arithmetic is the one part of a booking a small model gets wrong
 * reliably: given today's date and weekday it still answered "next Tuesday"
 * with a Saturday. Working it out here is deterministic and costs nothing, so
 * the model's guess is only used for dates this cannot resolve.
 *
 * "This Friday" and "next Friday" both resolve to the next Friday after today.
 * The two are used interchangeably when booking, and the card shows the weekday
 * beside the date, so the reader settles any genuine ambiguity rather than a
 * rule nobody agreed on.
 */
function dateFromPhrase(text, today = new Date()) {
  const said = String(text ?? '').toLowerCase()
  const at = (d) => d.toISOString().slice(0, 10)
  const shifted = (days) => {
    const d = new Date(today)
    d.setDate(d.getDate() + days)
    return at(d)
  }

  // Checked before the weekday names, so a sentence saying both does not have
  // "tomorrow" beaten by a day mentioned later in it.
  if (/\btomorrow\b/.test(said)) return shifted(1)
  if (/\btoday\b/.test(said)) return shifted(0)

  const inDays = /\bin (\d{1,2}) days?\b/.exec(said)
  if (inDays) return shifted(Number(inDays[1]))

  const named = new RegExp(String.raw`\b(${WEEKDAYS.join("|")})\b`).exec(said)
  if (named) {
    const wanted = WEEKDAYS.indexOf(named[1])
    // Strictly after today, so "this Friday" said on a Friday means the next
    // one rather than a booking in the past.
    const ahead = (wanted - today.getDay() + 7) % 7 || 7
    return shifted(ahead)
  }

  return undefined
}

app.post('/api/assistant', async (req, res) => {
  const caller = await currentUser(req)
  if (!caller) return res.status(401).json({ error: 'Not signed in.' })

  if (!LLM_API_KEY) {
    return res.status(503).json({
      error: 'The assistant is not configured. Set LLM_API_KEY on the server.',
    })
  }

  const { messages, context, destinations } = req.body ?? {}
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Nothing to answer.' })
  }

  // Only the last few turns travel: a free tier is rate limited by tokens, and
  // a conversation that grows without bound eventually fails mid-sentence.
  const recent = messages.slice(-10).map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: String(m.content ?? '').slice(0, 4000),
  }))

  // The screens the browser says this person may open. It is both the menu the
  // model chooses from and the list its answer is checked against below, so a
  // route it invents cannot become a button.
  const places = (Array.isArray(destinations) ? destinations : [])
    .filter((d) => typeof d?.path === 'string' && typeof d?.label === 'string')
    .slice(0, 120)

  const system = [
    ASSISTANT_SYSTEM,
    // The weekday, not just the date. Asked for "next Tuesday" from a bare
    // 2026-09-09 the model answered 2026-09-12, a Saturday: it cannot reliably
    // work out what day a date falls on, so it is told.
    `

Today is ${new Date().toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })} (${new Date().toISOString().slice(0, 10)}). Work dates out from this, and check the weekday you return matches the one you were asked for.`,
    context ? `\n\nHere is what you can see right now:\n${String(context).slice(0, 6000)}` : '',
    places.length
      ? `\n\nScreens and records you may offer to open:\n${places.map((d) => `- ${d.path} — ${d.label}`).join('\n')}`
      : '',
  ].join('')

  try {
    const upstream = await fetch(`${LLM_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LLM_API_KEY}`,
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [{ role: 'system', content: system }, ...recent],
        temperature: 0.6,
        max_tokens: 700,
        tool_choice: 'auto',
        tools: [
          ...(places.length
            ? [
                {
                  type: 'function',
                  function: {
                    name: 'open_screen',
                    description:
                      'Open a screen in the portal. Only paths from the list in the system message are allowed.',
                    parameters: {
                      type: 'object',
                      properties: {
                        path: {
                          type: 'string',
                          description: 'One of the listed paths, copied exactly.',
                        },
                      },
                      required: ['path'],
                    },
                  },
                },
              ]
            : []),
          ...[
                {
                  type: 'function',
                  function: {
                    name: 'propose_booking',
                    description:
                      'Propose an appointment for someone to confirm. Books nothing on its own.',
                    parameters: {
                      type: 'object',
                      properties: {
                        participant: {
                          type: 'string',
                          description: 'The participant as the person named them.',
                        },
                        visit: {
                          type: 'string',
                          description: 'The protocol visit as they named it, if they named one.',
                        },
                        date: { type: 'string', description: 'YYYY-MM-DD.' },
                        time: {
                          type: 'string',
                          description: 'A time such as "10:00 AM", if they gave one.',
                        },
                      },
                      required: ['participant', 'date'],
                    },
                  },
                },
              ],
        ],
      }),
    })

    if (upstream.status === 429) {
      return res.status(429).json({
        error: 'The assistant is busy right now. Give it a moment and ask again.',
      })
    }
    if (!upstream.ok) {
      const detail = await upstream.text()
      console.error('[assistant] provider error', upstream.status, detail.slice(0, 300))
      return res.status(502).json({ error: 'The assistant could not answer just now.' })
    }

    const body = await upstream.json()
    const message = body?.choices?.[0]?.message
    const reply = message?.content?.trim()

    // A tool call is a suggestion, not an instruction. The path is passed on
    // only if it is one we offered, so a route the model invents is dropped
    // rather than becoming a button to a page that does not exist — or to one
    // this person has no permission to open.
    let navigateTo
    let proposal
    for (const call of message?.tool_calls ?? []) {
      let args
      try {
        args = JSON.parse(call?.function?.arguments || '{}')
      } catch {
        continue
      }

      if (call.function.name === 'open_screen') {
        if (places.some((d) => d.path === args.path)) {
          navigateTo = args.path
          continue
        }
        console.warn('[assistant] ignored a path that was never offered:', args.path)
      }

      // Passed on as written. Turning a name into a participant needs the
      // records, and those are in the browser — which is also the only place
      // that can tell whether the person meant anyone real.
      if (call.function.name === 'propose_booking' && args.participant && args.date) {
        // The phrase the person used beats the model's arithmetic wherever it
        // can be read; the model's date is the fallback for everything else.
        const asked = recent.filter((m) => m.role === 'user').at(-1)?.content
        proposal = {
          participant: String(args.participant).slice(0, 120),
          visit: args.visit ? String(args.visit).slice(0, 120) : undefined,
          date: dateFromPhrase(asked) ?? String(args.date).slice(0, 10),
          time: args.time ? String(args.time).slice(0, 20) : undefined,
        }
      }
    }

    // Some models answer with a tool call and no prose. A bare button reads as
    // the assistant having said nothing, so give it a sentence.
    const text = reply || (navigateTo ? 'Here you go.' : proposal ? 'Here is what I understood.' : '')
    if (!text) return res.status(502).json({ error: 'The assistant returned nothing.' })

    res.json({ reply: text, navigateTo, proposal })
  } catch (err) {
    console.error('[assistant] request failed', err)
    res.status(502).json({ error: 'The assistant could not be reached.' })
  }
})

app.listen(PORT, () => console.log(`[auth] PatienTrials auth API on http://localhost:${PORT}`))
