import type {
  ApprovedLocation,
  AppointmentTemplate,
  Facility,
  FormCategory,
  FormType,
  IrbDetail,
  Lab,
  NotificationGroup,
  NotificationQuestion,
  Paged,
  PastTrial,
  PrescreeningGroup,
  PrescreeningQuestion,
  PublicTrial,
  Role,
  Site,
  SiteInitiationResponse,
  Study,
  Appointment,
  EConsent,
  GroupSession,
  Medication,
  SponsorQuery,
  Prescription,
  StudyAsset,
  StudyForm,
  StudyWithCounts,
  StudyPromotion,
  StudyRequest,
  Subject,
  SubjectStatus,
  TrialPhase,
  User,
} from './types'
import * as seed from './mock/seed'

/**
 * The single seam between the UI and its data.
 *
 * Every screen reads and writes through this module, so replacing the mock with
 * a real backend is a change to this file alone. It deliberately behaves like a
 * network: calls are async, they take time, and they can fail — which is what
 * makes the loading and error states in the UI real rather than decorative.
 */

/* -------------------------------------------------------- dev simulation */

export type SimulationMode = 'normal' | 'slow' | 'error' | 'empty'

interface DevSettings {
  mode: SimulationMode
  latency: number
}

const dev: DevSettings = { mode: 'normal', latency: 260 }

/** Read once at boot so a deep link like `?sim=error` reproduces a state. */
export function initSimulationFromUrl(search: string) {
  const mode = new URLSearchParams(search).get('sim') as SimulationMode | null
  if (mode && ['normal', 'slow', 'error', 'empty'].includes(mode)) dev.mode = mode
}

export function getSimulation() {
  return { ...dev }
}

export function setSimulation(mode: SimulationMode) {
  dev.mode = mode
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: 'duplicate' | 'not_found' | 'invalid' | 'network' = 'network',
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

function wait(): Promise<void> {
  const ms = dev.mode === 'slow' ? 2200 : dev.latency
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Gate for reads: honours the simulated error mode, then yields the payload. */
async function read<T>(produce: () => T, emptyValue?: T): Promise<T> {
  await wait()
  if (dev.mode === 'error') {
    throw new ApiError('We could not reach the server. Check your connection and try again.')
  }
  if (dev.mode === 'empty' && emptyValue !== undefined) return emptyValue
  return produce()
}

/**
 * Gate for writes: writes always run for real so the demo stays coherent, then
 * the whole store is persisted so nothing is lost on a refresh.
 */
async function write<T>(produce: () => T): Promise<T> {
  await wait()
  if (dev.mode === 'error') {
    throw new ApiError('The change could not be saved. Please try again.')
  }
  const result = produce()
  await persistState()
  return result
}

const emptyPage = <T>(): Paged<T> => ({ items: [], total: 0, page: 1, pageSize: 10 })

/* ------------------------------------------------------------ mutable db */

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T

const db = {
  site: clone(seed.site),
  users: clone(seed.users),
  pastTrials: clone(seed.pastTrials),
  irbDetails: clone(seed.irbDetails),
  labs: clone(seed.labs),
  facilities: clone(seed.facilities),
  studies: clone(seed.studies),
  studyRequests: clone(seed.studyRequests),
  subjects: clone(seed.subjects),
  prescreening: clone(seed.prescreeningQuestions),
  forms: clone(seed.forms),
  appointments: clone(seed.appointmentTemplates),
  notificationGroups: clone(seed.notificationGroups),
  approvedLocations: clone(seed.approvedLocations),
  bookings: clone(seed.bookings),
  eConsents: clone(seed.eConsents),
  groupSessions: clone(seed.groupSessions),
  sponsorQueries: clone(seed.sponsorQueries),
  medications: clone(seed.medications),
  prescriptions: clone(seed.prescriptions),
  studyAssets: clone(seed.studyAssets),
  publicTrials: clone(seed.publicTrials),
}

/**
 * Passwords an administrator has issued but the holder has not yet replaced.
 *
 * Deliberately module state and never part of `db`: `db` is persisted wholesale,
 * and a plaintext password must not be written to storage. A real backend stores
 * only a hash; this stands in for that one call.
 */
const issuedPasswords = new Map<string, string>()

const PW_LOWER = 'abcdefghijkmnopqrstuvwxyz'
const PW_UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const PW_DIGITS = '23456789'
const pick = (set: string) => set[Math.floor(Math.random() * set.length)]

/** The first rule a password fails, or undefined when it passes them all. */
export function passwordProblems(value: string): string | undefined {
  if (value.length < 8) return 'Password must be at least 8 characters.'
  if (value.length > 40) return 'Password must be no more than 40 characters.'
  if (!/[a-z]/.test(value)) return 'Password must include a lowercase letter.'
  if (!/[A-Z]/.test(value)) return 'Password must include an uppercase letter.'
  if (!/[0-9]/.test(value)) return 'Password must include a number.'
  return undefined
}

/** A password that already satisfies every rule we ask users to meet. */
function generatePassword(): string {
  const all = PW_LOWER + PW_UPPER + PW_DIGITS
  const chars = [pick(PW_LOWER), pick(PW_UPPER), pick(PW_DIGITS)]
  while (chars.length < 10) chars.push(pick(all))
  // Shuffle so the guaranteed characters are not always in the same position.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  return chars.join('')
}

let idCounter = 9000
const nextId = (prefix: string) => `${prefix}-${(idCounter += 1)}`
const now = () => new Date().toISOString()

/**
 * Stand-in for the ClinicalTrials.gov lookup the legacy "New Study Request"
 * performed. Only these identifiers resolve; anything else is reported as not
 * found, which is the error branch the legacy spec exercised.
 */
const REGISTRY: Record<
  string,
  { title: string; condition: string; phase: TrialPhase; sponsor: string; summary: string }
> = {
  NCT07764380: {
    title: 'Semaglutide for Weight Management in Adults With Type 2 Diabetes',
    condition: 'Type 2 Diabetes',
    phase: 'Phase III',
    sponsor: 'Novo Nordisk',
    summary:
      'This 52-week randomised trial evaluates whether once-weekly semaglutide improves glycaemic control and supports sustained weight loss in adults living with type 2 diabetes.',
  },
  NCT06612094: {
    title: 'Inhaled Triple Therapy in Moderate to Severe COPD',
    condition: 'COPD',
    phase: 'Phase II',
    sponsor: 'AstraZeneca',
    summary:
      'A randomised comparison of single-inhaler triple therapy against standard dual therapy on exacerbation rate and lung function in adults with moderate to severe COPD.',
  },
  NCT05820117: {
    title: 'Novel Anticoagulant After Acute Coronary Syndrome',
    condition: 'Acute Coronary Syndrome',
    phase: 'Phase II',
    sponsor: 'Johnson & Johnson',
    summary:
      'The purpose of this trial is to determine whether a novel oral anticoagulant reduces recurrent ischaemic events after acute coronary syndrome without increasing major bleeding.',
  },
  NCT09004471: {
    title: 'Early Detection Biomarkers in Non-Small Cell Lung Cancer',
    condition: 'Non-Small Cell Lung Cancer',
    phase: 'Phase I',
    sponsor: 'Roche',
    summary:
      'A prospective multi-centre study evaluating a blood-based biomarker panel for the early detection of non-small cell lung cancer in a high-risk screening population.',
  },
  NCT02551049: {
    title: 'Sleep Quality and Glycaemic Control in Adolescents',
    condition: 'Type 1 Diabetes',
    phase: 'Phase II',
    sponsor: 'Sanofi',
    summary:
      'An observational study of the relationship between sleep quality and glycaemic variability in adolescents with type 1 diabetes using continuous glucose monitoring.',
  },
  NCT01998877: {
    title: 'Vitamin D Supplementation in Post-Menopausal Osteoporosis',
    condition: 'Osteoporosis',
    phase: 'Phase IV',
    sponsor: 'Amgen',
    summary:
      'A double-blind trial of high-dose vitamin D supplementation on bone mineral density and fracture incidence in post-menopausal women with osteoporosis.',
  },
}

/** Exposed so the create-study screen can hint at what will resolve. */
export const REGISTRY_SAMPLE_IDS = Object.keys(REGISTRY)

function paginate<T>(items: T[], page: number, pageSize: number): Paged<T> {
  const start = (page - 1) * pageSize
  return { items: items.slice(start, start + pageSize), total: items.length, page, pageSize }
}

const matches = (haystack: string[], query: string) =>
  !query.trim() ||
  haystack.some((h) => h?.toLowerCase().includes(query.trim().toLowerCase()))

/* ------------------------------------------------------------------ auth */

/**
 * Base URL of the auth + persistence API (see `server/`). Read from
 * `VITE_API_BASE` at build time — set it on Vercel to the deployed backend URL.
 * When unset (local dev) it falls back to the dev server on :3001; when the
 * value is unreachable the app degrades to demo mode.
 */
const AUTH_API = (import.meta.env.VITE_API_BASE ?? 'http://localhost:3001').replace(/\/+$/, '')

export interface Session {
  user: User
  siteId: string
  /** Signed JWT from the auth API, held for authenticated calls. */
  token?: string
}

/**
 * Demo fallback for when no auth server is reachable — e.g. a static deploy
 * (Vercel) with no backend, or a page served over HTTPS that cannot reach the
 * local API. Any seeded account signs in with a 6+ character password.
 */
/** The stored bearer token, when there is a live session. */
const SESSION_STORAGE_KEY = 'patientrials.site.session'
function authToken(): string | undefined {
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Session).token : undefined
  } catch {
    return undefined
  }
}

function demoLogin(email: string, password: string): Session {
  const user = db.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase())
  if (!user || password.length < 6) {
    throw new ApiError('That email and password combination was not recognised.', 'invalid')
  }
  // Once an administrator has issued a password, only that password works —
  // otherwise the forced change below could be walked straight past.
  const issued = issuedPasswords.get(user.id)
  if (issued && password !== issued) {
    throw new ApiError('That email and password combination was not recognised.', 'invalid')
  }
  if (!user.active) {
    throw new ApiError('This account is inactive. Ask your site administrator to re-enable it.', 'invalid')
  }
  return { user, siteId: user.siteId }
}

/**
 * A new site administrator's registration sets up their site record: the name,
 * time zone, country and administrator they entered on the sign-up form become
 * the site they land on after signing in, with a fresh address to complete
 * during onboarding. This is a single-site demo, so it updates the one shared
 * site; other roles (nurses, participants) leave the site untouched.
 */
async function applyRegistrationToSite(input: {
  role: Role
  firstName: string
  lastName: string
  siteName?: string
  country?: string
  timeZone?: string
}): Promise<void> {
  if (input.role !== 'site_administrator') return
  const name = input.siteName?.trim()
  const timeZone = input.timeZone?.trim()
  const country = input.country?.trim()
  db.site = {
    ...db.site,
    ...(name ? { name } : {}),
    adminName: `${input.firstName} ${input.lastName}`.trim(),
    briefDescription: '',
    ...(timeZone ? { timeZone } : {}),
    address: {
      street: '',
      city: '',
      state: '',
      zip: '',
      country: country || db.site.address.country,
    },
  }
  await persistState()
}

export const auth = {
  /**
   * Real sign-in: the auth API checks the password against a bcrypt hash and
   * returns a signed token. This is the one call that no longer touches the mock.
   */
  async login(email: string, password: string): Promise<Session> {
    let res: Response
    try {
      res = await fetch(`${AUTH_API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
    } catch {
      // No auth server reachable (e.g. a static demo deploy) — use demo mode.
      return demoLogin(email, password)
    }
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string }
      throw new ApiError(body.error ?? 'Sign-in failed.', res.status === 401 ? 'invalid' : undefined)
    }
    const data = (await res.json()) as { token: string; user: User; siteId: string }
    return { user: data.user, siteId: data.siteId, token: data.token }
  },

  /** Real registration: creates a persisted, bcrypt-hashed account via the API. */
  async register(input: {
    email: string
    firstName: string
    lastName: string
    password: string
    role: Role
    siteId?: string
    /** Site details captured on the sign-up form — the name, country and time
     *  zone the new administrator entered, so their site reflects them on the
     *  onboarding screen after they sign in. */
    siteName?: string
    country?: string
    timeZone?: string
  }): Promise<void> {
    let res: Response
    try {
      res = await fetch(`${AUTH_API}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      })
    } catch {
      // No auth server reachable — accept the sign-up in demo mode.
      if (db.users.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) {
        throw new ApiError('An account already exists for this email address.', 'duplicate')
      }
      await applyRegistrationToSite(input)
      return
    }
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string }
      throw new ApiError(
        body.error ?? 'Registration failed.',
        res.status === 409 ? 'duplicate' : undefined,
      )
    }
    await applyRegistrationToSite(input)
  },

  /**
   * Choose a new password, replacing one an administrator issued.
   *
   * Enforces the same rules the form states, then clears the flag so the
   * account can be used normally.
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const token = authToken()
    if (token) {
      let res: Response | undefined
      try {
        res = await fetch(`${AUTH_API}/api/auth/change-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ currentPassword, newPassword }),
        })
      } catch {
        res = undefined // no server reachable — fall through to demo mode
      }
      if (res) {
        const body = (await res.json().catch(() => ({}))) as { user?: User; error?: string }
        if (!res.ok) throw new ApiError(body.error ?? 'We could not change your password.', 'invalid')
        const local = db.users.find((u) => u.id === userId)
        if (local) local.mustChangePassword = false
        issuedPasswords.delete(userId)
        return body.user as User
      }
    }
    return write(() => {
      const user = db.users.find((u) => u.id === userId)
      if (!user) throw new ApiError('Account not found.', 'not_found')
      const issued = issuedPasswords.get(user.id)
      if (issued && currentPassword !== issued) {
        throw new ApiError('That current password is not right.', 'invalid')
      }
      const failed = passwordProblems(newPassword)
      if (failed) throw new ApiError(failed, 'invalid')
      issuedPasswords.delete(user.id)
      user.mustChangePassword = false
      return clone(user)
    })
  },

  /** Demo affordance: sign in as any seeded user to see role-gated navigation. */
  async listDemoAccounts(): Promise<User[]> {
    return read(() => db.users.filter((u) => u.active))
  },
}

/* ----------------------------------------------------------- persistence */

const SITE_STATE_URL = `${AUTH_API}/api/site-state`

/**
 * The whole in-memory store is persisted to SQLite so entered data — onboarding,
 * studies, participants, forms, everything — survives a page refresh.
 * `hydrateSiteState` loads it on boot; every `write()` saves it back. On the
 * first run the store is empty, so the seed already in `db` is pushed up to
 * become the baseline. If the server is unreachable the app runs on the seed.
 */
export async function hydrateSiteState(): Promise<void> {
  try {
    const token = authToken()
    // The store is private to a signed-in site. Before sign-in there is nothing
    // to load, so the app opens on the seed and hydrates once you are in.
    if (!token) return
    const res = await fetch(SITE_STATE_URL, { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) return
    const data = await res.json()
    if (data && typeof data === 'object') {
      const store = db as Record<string, unknown>
      const saved = data as Record<string, unknown>
      for (const key of Object.keys(store)) {
        if (key in saved) store[key] = saved[key]
      }
    } else {
      await persistState()
    }
  } catch {
    // Data server not running — keep working on the in-memory seed.
  }
}

/** Save the whole store. Best-effort — the in-memory change already applied. */
async function persistState(): Promise<void> {
  try {
    const token = authToken()
    if (!token) return
    await fetch(SITE_STATE_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(db),
    })
  } catch {
    // ignore; persistence is best-effort
  }
}

/** Back-compat alias — `write()` persists automatically now. */
const writePersist = write

/* ------------------------------------------------------------------ site */

export const siteApi = {
  get: () => read<Site>(() => clone(db.site)),
  update: (patch: Partial<Site>) =>
    writePersist(() => {
      db.site = { ...db.site, ...patch }
      return clone(db.site)
    }),

  listPastTrials: () => read<PastTrial[]>(() => clone(db.pastTrials), []),
  addPastTrial: (input: Omit<PastTrial, 'id' | 'siteId'>) =>
    writePersist(() => {
      const record: PastTrial = { ...input, id: nextId('PT'), siteId: db.site.id }
      db.pastTrials.push(record)
      return record
    }),
  updatePastTrial: (id: string, patch: Partial<Omit<PastTrial, 'id' | 'siteId'>>) =>
    writePersist(() => {
      const i = db.pastTrials.findIndex((t) => t.id === id)
      if (i === -1) throw new ApiError('Past trial not found.', 'not_found')
      db.pastTrials[i] = { ...db.pastTrials[i], ...patch }
      return clone(db.pastTrials[i])
    }),
  removePastTrial: (id: string) =>
    writePersist(() => {
      db.pastTrials = db.pastTrials.filter((t) => t.id !== id)
    }),

  listIrb: () => read<IrbDetail[]>(() => clone(db.irbDetails), []),
  addIrb: (input: Omit<IrbDetail, 'id' | 'siteId'>) =>
    writePersist(() => {
      const record: IrbDetail = { ...input, id: nextId('IRB'), siteId: db.site.id }
      db.irbDetails.push(record)
      return record
    }),
  updateIrb: (id: string, patch: Partial<Omit<IrbDetail, 'id' | 'siteId'>>) =>
    writePersist(() => {
      const i = db.irbDetails.findIndex((t) => t.id === id)
      if (i === -1) throw new ApiError('IRB not found.', 'not_found')
      db.irbDetails[i] = { ...db.irbDetails[i], ...patch }
      return clone(db.irbDetails[i])
    }),
  removeIrb: (id: string) =>
    writePersist(() => {
      db.irbDetails = db.irbDetails.filter((t) => t.id !== id)
    }),

  listLabs: () => read<Lab[]>(() => clone(db.labs), []),
  addLab: (input: Omit<Lab, 'id' | 'siteId'>) =>
    writePersist(() => {
      const record: Lab = { ...input, id: nextId('LAB'), siteId: db.site.id }
      db.labs.push(record)
      return record
    }),
  updateLab: (id: string, patch: Partial<Omit<Lab, 'id' | 'siteId'>>) =>
    writePersist(() => {
      const i = db.labs.findIndex((t) => t.id === id)
      if (i === -1) throw new ApiError('Lab not found.', 'not_found')
      db.labs[i] = { ...db.labs[i], ...patch }
      return clone(db.labs[i])
    }),
  removeLab: (id: string) =>
    writePersist(() => {
      db.labs = db.labs.filter((t) => t.id !== id)
    }),

  listFacilities: () => read<Facility[]>(() => clone(db.facilities), []),
  addFacility: (input: Omit<Facility, 'id' | 'siteId'>) =>
    writePersist(() => {
      const record: Facility = { ...input, id: nextId('FAC'), siteId: db.site.id }
      db.facilities.push(record)
      return record
    }),
  updateFacility: (id: string, patch: Partial<Omit<Facility, 'id' | 'siteId'>>) =>
    writePersist(() => {
      const i = db.facilities.findIndex((t) => t.id === id)
      if (i === -1) throw new ApiError('Facility not found.', 'not_found')
      db.facilities[i] = { ...db.facilities[i], ...patch }
      return clone(db.facilities[i])
    }),
  removeFacility: (id: string) =>
    writePersist(() => {
      db.facilities = db.facilities.filter((t) => t.id !== id)
    }),

  listCollaborators: () => read<User[]>(() => clone(db.users), []),
  addCollaborator: (input: {
    firstName: string
    lastName: string
    email: string
    role: Role
  }) =>
    writePersist(() => {
      if (db.users.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) {
        throw new ApiError('This person has already been added to the site.', 'duplicate')
      }
      const record: User = {
        ...input,
        id: nextId('USR'),
        siteId: db.site.id,
        active: true,
        invitedAt: now(),
      }
      db.users.push(record)
      return record
    }),
  updateCollaborator: (id: string, patch: Partial<User>) =>
    writePersist(() => {
      const i = db.users.findIndex((u) => u.id === id)
      if (i === -1) throw new ApiError('Collaborator not found.', 'not_found')
      db.users[i] = { ...db.users[i], ...patch }
      return clone(db.users[i])
    }),
  removeCollaborator: (id: string) =>
    writePersist(() => {
      db.users = db.users.filter((u) => u.id !== id)
    }),
  /**
   * Issue a new password for a collaborator.
   *
   * There is no mail server in this build, so a reset that only promised an
   * email would leave the account unreachable. The administrator is handed the
   * password to pass on, and the account is flagged so its holder must choose
   * their own before they can do anything else.
   */
  resetCollaboratorPassword: async (id: string) => {
    const token = authToken()
    if (token) {
      let res: Response | undefined
      try {
        res = await fetch(`${AUTH_API}/api/auth/reset-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ userId: id }),
        })
      } catch {
        res = undefined // no server reachable — fall through to demo mode
      }
      if (res) {
        const body = (await res.json().catch(() => ({}))) as {
          password?: string
          user?: User
          error?: string
        }
        if (!res.ok) throw new ApiError(body.error ?? 'We could not reset the password.')
        const local = db.users.find((u) => u.id === id)
        if (local) local.mustChangePassword = true
        return { email: body.user?.email ?? local?.email ?? '', password: body.password ?? '' }
      }
    }
    return write(() => {
      const user = db.users.find((u) => u.id === id)
      if (!user) throw new ApiError('Collaborator not found.', 'not_found')
      const password = generatePassword()
      issuedPasswords.set(user.id, password)
      user.mustChangePassword = true
      return { email: user.email, password }
    })
  },

  /**
   * Everything the onboarding wizard needs, in one read.
   *
   * The wizard shows completion across all six sections at once, so fetching
   * them together keeps the stepper consistent and avoids six spinners.
   */
  onboardingSnapshot: () =>
    read(() => ({
      site: clone(db.site),
      pastTrials: clone(db.pastTrials),
      irbDetails: clone(db.irbDetails),
      labs: clone(db.labs),
      facilities: clone(db.facilities),
      collaborators: clone(db.users),
    })),

  /** Feeds the "assign a person" combobox that replaced the lookup popup. */
  lookupPeople: (role?: Role) =>
    read<User[]>(
      () => clone(db.users.filter((u) => u.active && (!role || u.role === role))),
      [],
    ),
}

/* --------------------------------------------------------------- studies */

export interface StudyQuery {
  query?: string
  status?: 'all' | 'promoted' | 'active' | 'archived'
  page?: number
  pageSize?: number
  /**
   * Limit to the studies one investigator leads. A Principal Investigator only
   * ever sees their own studies, so the console passes their id here.
   */
  investigatorId?: string
}

export const studiesApi = {
  list: ({ query = '', status = 'all', page = 1, pageSize = 12, investigatorId }: StudyQuery = {}) =>
    read<Paged<StudyWithCounts>>(() => {
      const filtered = db.studies
        .filter((s) => !investigatorId || s.principalInvestigatorId === investigatorId)
        .filter((s) => status === 'all' || s.status === status)
        .filter((s) => matches([s.id, s.nctId, s.title, s.condition, s.sponsor], query))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map<StudyWithCounts>((study) => {
          const people = db.subjects.filter((s) => s.studyId === study.id)
          return {
            ...study,
            // "Prospects" are everyone still in screening; "subjects" are enrolled.
            prospects: people.filter(
              (s) =>
                s.status === 'pending' || s.status === 'validated' || s.status === 'prescreened',
            ).length,
            subjects: people.filter((s) => s.status === 'recruited').length,
          }
        })
      return paginate(clone(filtered), page, pageSize)
    }, emptyPage<StudyWithCounts>()),

  counts: (investigatorId?: string) =>
    read(() => {
      const mine = db.studies.filter(
        (s) => !investigatorId || s.principalInvestigatorId === investigatorId,
      )
      return {
        promoted: mine.filter((s) => s.status === 'promoted').length,
        active: mine.filter((s) => s.status === 'active').length,
        archived: mine.filter((s) => s.status === 'archived').length,
        all: mine.length,
      }
    }),

  get: (id: string) =>
    read<Study>(() => {
      const study = db.studies.find((s) => s.id === id || s.nctId === id)
      if (!study) throw new ApiError(`No study found for ${id}.`, 'not_found')
      return clone(study)
    }),

  /** Step one of Create Study: resolve the NCT number, refusing duplicates. */
  lookupNct: (nctId: string) =>
    read(() => {
      const key = nctId.trim().toUpperCase()
      if (db.studies.some((s) => s.nctId === key)) {
        throw new ApiError(
          `${key} is already on your site as a study. Open it from the Studies list instead.`,
          'duplicate',
        )
      }
      const found = REGISTRY[key]
      if (!found) {
        throw new ApiError(
          `No registry record found for ${key}. Check the number and try again.`,
          'not_found',
        )
      }
      return { nctId: key, ...found }
    }),

  create: (input: {
    nctId: string
    title: string
    condition: string
    phase: TrialPhase
    sponsor: string
    summary: string
  }) =>
    write(() => {
      const study: Study = {
        id: `STU${String(1400 + db.studies.length + 1).padStart(5, '0')}`,
        nctId: input.nctId,
        title: input.title,
        condition: input.condition,
        phase: input.phase,
        sponsor: input.sponsor,
        status: 'active',
        recruitmentStatus: 'Not yet recruiting',
        briefSummary: input.summary,
        consentDocuments: 0,
        enrollmentTarget: 0,
        enrolled: 0,
        createdAt: now(),
      }
      db.studies.unshift(study)
      return clone(study)
    }),

  promote: (id: string, promotion: StudyPromotion) =>
    write(() => {
      const study = db.studies.find((s) => s.id === id)
      if (!study) throw new ApiError('Study not found.', 'not_found')
      study.status = 'promoted'
      study.promotion = promotion
      study.promotedAt = now()
      if (!db.publicTrials.some((t) => t.nctId === study.nctId)) {
        db.publicTrials.push({
          nctId: study.nctId,
          studyId: study.id,
          title: study.title,
          summary: promotion.upcomingResearch[0] ?? study.title,
          condition: study.condition,
          phase: study.phase,
          recruitmentStatus: study.recruitmentStatus,
          sponsor: study.sponsor,
          minimumAge: promotion.minimumAge,
          locations: promotion.locations,
          eligibility: promotion.conditions,
          estimatedDuration: 'To be confirmed',
        })
      }
      return clone(study)
    }),

  assignInvestigator: (studyId: string, userId: string, note: string) =>
    write(() => {
      const study = db.studies.find((s) => s.id === studyId)
      if (!study) throw new ApiError('Study not found.', 'not_found')
      if (!note.trim()) throw new ApiError('A change note is required.', 'invalid')
      study.principalInvestigatorId = userId
      return clone(study)
    }),

  setStatus: (studyId: string, status: Study['status']) =>
    write(() => {
      const study = db.studies.find((s) => s.id === studyId)
      if (!study) throw new ApiError('Study not found.', 'not_found')
      study.status = status
      return clone(study)
    }),
}

/* ----------------------------------------------------------- appointments */

export const bookingsApi = {
  listForStudy: (studyId: string) =>
    read<Appointment[]>(
      () =>
        clone(
          db.bookings
            .filter((b) => b.studyId === studyId)
            .sort((a, b) => (a.date + a.timeSlot).localeCompare(b.date + b.timeSlot)),
        ),
      [],
    ),

  listForSubject: (subjectId: string) =>
    read<Appointment[]>(
      () =>
        clone(
          db.bookings
            .filter((b) => b.subjectId === subjectId)
            .sort((a, b) => a.date.localeCompare(b.date)),
        ),
      [],
    ),

  /** Refuses a double booking: one participant cannot be in two places at once. */
  add: (input: Omit<Appointment, 'id' | 'createdAt'>) =>
    write(() => {
      if (!input.subjectId) throw new ApiError('Choose which participant this is for.', 'invalid')
      if (!input.date || !input.timeSlot) {
        throw new ApiError('Choose a date and a time.', 'invalid')
      }
      if (input.scheduleType === 'In person' && !input.locationId) {
        throw new ApiError('Choose where the visit takes place.', 'invalid')
      }
      const clash = db.bookings.some(
        (b) =>
          b.subjectId === input.subjectId &&
          b.date === input.date &&
          b.timeSlot === input.timeSlot,
      )
      if (clash) {
        throw new ApiError('This participant already has an appointment at that time.', 'duplicate')
      }
      const record: Appointment = { ...input, id: nextId('APT'), createdAt: now() }
      db.bookings.push(record)
      return clone(record)
    }),

  /**
   * Attach a booking to the protocol visit it satisfies, or detach it.
   *
   * Separate from a general update because it is the only field a booking gains
   * after the fact: a visit arranged before the protocol schedule was linked up
   * has to be tagged by someone who knows which visit it was, and guessing on
   * their behalf would write a compliance record nobody checked.
   */
  setTemplate: (id: string, templateId: string | undefined) =>
    write(() => {
      const booking = db.bookings.find((b) => b.id === id)
      if (!booking) throw new ApiError('Appointment not found.', 'not_found')
      booking.templateId = templateId
      return clone(booking)
    }),

  remove: (id: string) =>
    write(() => {
      db.bookings = db.bookings.filter((b) => b.id !== id)
    }),
}

/* ---------------------------------------------------------------- consent */

export const eConsentsApi = {
  list: (studyId: string) =>
    read<EConsent[]>(
      () =>
        clone(
          db.eConsents
            .filter((c) => c.studyId === studyId)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        ),
      [],
    ),

  /**
   * Created in one write when the wizard finishes, so an abandoned draft never
   * leaves a half-built consent behind.
   */
  add: (input: Omit<EConsent, 'id' | 'createdAt'>) =>
    write(() => {
      if (!input.description.trim()) {
        throw new ApiError('Describe what this consent covers.', 'invalid')
      }
      if (!input.documentName) {
        throw new ApiError('Attach the consent document.', 'invalid')
      }
      if (input.questions.length === 0) {
        throw new ApiError('Add at least one comprehension question.', 'invalid')
      }
      const record: EConsent = { ...input, id: nextId('ICF'), createdAt: now() }
      db.eConsents.push(record)
      const study = db.studies.find((s) => s.id === input.studyId)
      if (study) study.consentDocuments += 1
      return clone(record)
    }),

  remove: (id: string) =>
    write(() => {
      const consent = db.eConsents.find((c) => c.id === id)
      db.eConsents = db.eConsents.filter((c) => c.id !== id)
      const study = consent && db.studies.find((s) => s.id === consent.studyId)
      if (study && study.consentDocuments > 0) study.consentDocuments -= 1
    }),
}

/* -------------------------------------------------------- group sessions */

export const groupSessionsApi = {
  list: (studyId: string) =>
    read<GroupSession[]>(
      () =>
        clone(
          db.groupSessions
            .filter((g) => g.studyId === studyId)
            .sort((a, b) => a.startAt.localeCompare(b.startAt)),
        ),
      [],
    ),

  add: (input: Omit<GroupSession, 'id' | 'createdAt'>) =>
    write(() => {
      if (!input.locationId) throw new ApiError('Choose where the session is held.', 'invalid')
      if (!input.startAt || !input.endAt) {
        throw new ApiError('A session needs a start and an end.', 'invalid')
      }
      if (input.endAt <= input.startAt) {
        throw new ApiError('The session must end after it starts.', 'invalid')
      }
      const record: GroupSession = { ...input, id: nextId('GRP'), createdAt: now() }
      db.groupSessions.push(record)
      return clone(record)
    }),

  remove: (id: string) =>
    write(() => {
      db.groupSessions = db.groupSessions.filter((g) => g.id !== id)
    }),
}

/* --------------------------------------------------------- sponsor queries */

export const sponsorQueriesApi = {
  list: (studyId: string) =>
    read<SponsorQuery[]>(
      () =>
        clone(
          db.sponsorQueries
            .filter((q) => q.studyId === studyId)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        ),
      [],
    ),

  /** Raise a question. It stays open until the sponsor answers it. */
  add: (input: { studyId: string; question: string; raisedByName: string }) =>
    write(() => {
      const question = input.question.trim()
      if (!question) throw new ApiError('Write your question before sending it.', 'invalid')
      const record: SponsorQuery = {
        id: nextId('QRY'),
        studyId: input.studyId,
        question,
        raisedByName: input.raisedByName,
        createdAt: now(),
        status: 'open',
      }
      db.sponsorQueries.push(record)
      return clone(record)
    }),

  remove: (id: string) =>
    write(() => {
      db.sponsorQueries = db.sponsorQueries.filter((q) => q.id !== id)
    }),
}

/* ------------------------------------------------------------ medications */

export const medicationsApi = {
  list: (studyId: string) =>
    read<Medication[]>(
      () =>
        clone(
          db.medications
            .filter((m) => m.studyId === studyId)
            .sort((a, b) => a.name.localeCompare(b.name)),
        ),
      [],
    ),

  add: (input: Omit<Medication, 'id' | 'createdAt'>) =>
    write(() => {
      const exists = db.medications.some(
        (m) => m.studyId === input.studyId && m.name.toLowerCase() === input.name.trim().toLowerCase(),
      )
      if (exists) {
        throw new ApiError('That medication is already on this study.', 'duplicate')
      }
      const record: Medication = { ...input, id: nextId('MED'), createdAt: now() }
      db.medications.push(record)
      return clone(record)
    }),

  update: (id: string, patch: Partial<Omit<Medication, 'id' | 'studyId'>>) =>
    write(() => {
      const i = db.medications.findIndex((m) => m.id === id)
      if (i === -1) throw new ApiError('Medication not found.', 'not_found')
      db.medications[i] = { ...db.medications[i], ...patch }
      return clone(db.medications[i])
    }),

  /** Refuses while anyone is still prescribed it, so a course cannot dangle. */
  remove: (id: string) =>
    write(() => {
      const inUse = db.prescriptions.some((p) => p.medicationId === id)
      if (inUse) {
        throw new ApiError('This medication is prescribed to a participant, so it cannot be removed.', 'invalid')
      }
      db.medications = db.medications.filter((m) => m.id !== id)
    }),
}

export const prescriptionsApi = {
  listForSubject: (subjectId: string) =>
    read<Prescription[]>(
      () =>
        clone(
          db.prescriptions
            .filter((p) => p.subjectId === subjectId)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        ),
      [],
    ),

  add: (input: Omit<Prescription, 'id' | 'createdAt'>) =>
    write(() => {
      if (!db.medications.some((m) => m.id === input.medicationId)) {
        throw new ApiError('Choose a medication to prescribe.', 'invalid')
      }
      if (input.endDate && input.endDate < input.startDate) {
        throw new ApiError('The end date cannot be before the start date.', 'invalid')
      }
      if (input.doseWindows.length === 0) {
        throw new ApiError('Choose at least one time of day.', 'invalid')
      }
      if (input.days.length === 0) {
        throw new ApiError('Choose at least one day of the week.', 'invalid')
      }
      const record: Prescription = { ...input, id: nextId('RX'), createdAt: now() }
      db.prescriptions.push(record)
      return clone(record)
    }),

  remove: (id: string) =>
    write(() => {
      db.prescriptions = db.prescriptions.filter((p) => p.id !== id)
    }),
}

/* ---------------------------------------------------------- study assets */

export const studyAssetsApi = {
  list: (studyId: string) =>
    read<StudyAsset[]>(
      () =>
        clone(
          db.studyAssets
            .filter((a) => a.studyId === studyId)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        ),
      [],
    ),

  get: (id: string) =>
    read<StudyAsset>(() => {
      const asset = db.studyAssets.find((a) => a.id === id)
      if (!asset) throw new ApiError('Asset not found.', 'not_found')
      return clone(asset)
    }),

  /** Assets are created as drafts; publishing is a separate, deliberate step. */
  add: (input: Omit<StudyAsset, 'id' | 'status' | 'createdAt' | 'publishedAt'>) =>
    write(() => {
      const record: StudyAsset = {
        ...input,
        id: nextId('AST'),
        status: 'draft',
        createdAt: now(),
      }
      db.studyAssets.push(record)
      return clone(record)
    }),

  update: (id: string, patch: Partial<Omit<StudyAsset, 'id' | 'studyId'>>) =>
    write(() => {
      const i = db.studyAssets.findIndex((a) => a.id === id)
      if (i === -1) throw new ApiError('Asset not found.', 'not_found')
      db.studyAssets[i] = { ...db.studyAssets[i], ...patch }
      return clone(db.studyAssets[i])
    }),

  /**
   * Publish, which is what makes an asset visible to its audience. An audience
   * is required: publishing to nobody in particular is the mistake this guards.
   */
  publish: (id: string) =>
    write(() => {
      const asset = db.studyAssets.find((a) => a.id === id)
      if (!asset) throw new ApiError('Asset not found.', 'not_found')
      if (!asset.targetAudience) {
        throw new ApiError('Choose a target audience before publishing.', 'invalid')
      }
      asset.status = 'published'
      asset.publishedAt = now()
      return clone(asset)
    }),

  remove: (id: string) =>
    write(() => {
      db.studyAssets = db.studyAssets.filter((a) => a.id !== id)
    }),
}

/* -------------------------------------------------------- study requests */

export const requestsApi = {
  list: (query = '') =>
    read<StudyRequest[]>(
      () =>
        clone(
          db.studyRequests
            .filter((r) => matches([r.id, r.nctId, r.title, r.sponsor], query))
            .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
        ),
      [],
    ),

  get: (id: string) =>
    read<StudyRequest>(() => {
      const record = db.studyRequests.find((r) => r.id === id)
      if (!record) throw new ApiError(`No study request found for ${id}.`, 'not_found')
      return clone(record)
    }),

  /** Mirrors the legacy Insert: duplicates are rejected, not silently merged. */
  create: (nctId: string) =>
    write(() => {
      const key = nctId.trim().toUpperCase()
      if (db.studyRequests.some((r) => r.nctId === key)) {
        throw new ApiError(
          `A study request for ${key} already exists on this site.`,
          'duplicate',
        )
      }
      const found = REGISTRY[key]
      if (!found) {
        throw new ApiError(`No registry record found for ${key}.`, 'not_found')
      }
      const record: StudyRequest = {
        id: `SR${String(1600 + db.studyRequests.length).padStart(7, '0')}`,
        nctId: key,
        title: found.title,
        sponsor: found.sponsor,
        status: 'submitted',
        submittedAt: now(),
      }
      db.studyRequests.unshift(record)
      return clone(record)
    }),

  respond: (id: string, response: Omit<SiteInitiationResponse, 'submittedAt'>) =>
    write(() => {
      const record = db.studyRequests.find((r) => r.id === id)
      if (!record) throw new ApiError('Study request not found.', 'not_found')
      record.response = { ...response, submittedAt: now() }
      record.status = response.interested === 'yes' ? 'under_review' : 'declined'
      return clone(record)
    }),
}

/* -------------------------------------------------------------- subjects */

export interface SubjectQuery {
  studyId: string
  query?: string
  status?: SubjectStatus | 'all'
  page?: number
  pageSize?: number
}

export const subjectsApi = {
  list: ({ studyId, query = '', status = 'all', page = 1, pageSize = 10 }: SubjectQuery) =>
    read<Paged<Subject>>(() => {
      const filtered = db.subjects
        .filter((s) => s.studyId === studyId)
        .filter((s) => status === 'all' || s.status === status)
        .filter((s) => matches([s.id, s.firstName, s.lastName, s.email, s.city], query))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      return paginate(clone(filtered), page, pageSize)
    }, emptyPage<Subject>()),

  counts: (studyId: string) =>
    read(() => {
      const all = db.subjects.filter((s) => s.studyId === studyId)
      return {
        all: all.length,
        pending: all.filter((s) => s.status === 'pending').length,
        validated: all.filter((s) => s.status === 'validated').length,
        prescreened: all.filter((s) => s.status === 'prescreened').length,
        recruited: all.filter((s) => s.status === 'recruited').length,
        rejected: all.filter((s) => s.status === 'rejected').length,
        dropped: all.filter((s) => s.status === 'dropped').length,
      }
    }),

  /**
   * Apply one decision to many participants.
   *
   * Screening arrives in batches, so acting one row at a time is the single
   * biggest cost in the legacy flow. Returns the ids actually changed so the UI
   * can report precisely.
   */
  setStatusMany: (ids: string[], status: SubjectStatus) =>
    write(() => {
      const changed: string[] = []
      ids.forEach((id) => {
        const subject = db.subjects.find((s) => s.id === id)
        if (!subject || subject.status === status) return
        subject.status = status
        changed.push(id)
        if (status === 'recruited') {
          subject.recruitedAt = now()
          const study = db.studies.find((s) => s.id === subject.studyId)
          if (study) study.enrolled += 1
        }
      })
      return changed
    }),

  /** Validate / Reject / Recruit, the three legacy record actions. */
  setStatus: (id: string, status: SubjectStatus) =>
    write(() => {
      const subject = db.subjects.find((s) => s.id === id)
      if (!subject) throw new ApiError('Participant not found.', 'not_found')
      // Only a real transition counts. Recruiting someone already recruited must
      // not stamp a second enrolment date, nor inflate the study's `enrolled`
      // tally — the batch setter above already guards itself this way.
      const becameRecruited = status === 'recruited' && subject.status !== 'recruited'
      subject.status = status
      if (becameRecruited) {
        subject.recruitedAt = now()
        const study = db.studies.find((s) => s.id === subject.studyId)
        if (study) study.enrolled += 1
      }
      return clone(subject)
    }),
}

/* --------------------------------------------------------- pre-screening */

export const prescreeningApi = {
  list: (studyId: string, group: PrescreeningGroup) =>
    read<PrescreeningQuestion[]>(
      () =>
        clone(
          db.prescreening
            .filter((q) => q.studyId === studyId && q.group === group)
            .sort((a, b) => a.order - b.order),
        ),
      [],
    ),

  create: (input: Omit<PrescreeningQuestion, 'id'>) =>
    write(() => {
      const record: PrescreeningQuestion = { ...input, id: nextId('PSQ') }
      db.prescreening.push(record)
      return clone(record)
    }),

  update: (id: string, patch: Partial<PrescreeningQuestion>) =>
    write(() => {
      const i = db.prescreening.findIndex((q) => q.id === id)
      if (i === -1) throw new ApiError('Question not found.', 'not_found')
      db.prescreening[i] = { ...db.prescreening[i], ...patch }
      return clone(db.prescreening[i])
    }),

  remove: (id: string) =>
    write(() => {
      db.prescreening = db.prescreening.filter((q) => q.id !== id)
    }),
}

/* ----------------------------------------------------------------- forms */

export interface FormQuery {
  category?: FormCategory
  status?: 'all' | 'draft' | 'published'
  query?: string
}

export const formsApi = {
  list: ({ category, status = 'all', query = '' }: FormQuery = {}) =>
    read<StudyForm[]>(
      () =>
        clone(
          db.forms
            .filter((f) => !category || f.category === category)
            .filter((f) => status === 'all' || f.status === status)
            .filter((f) => matches([f.title, f.description, f.type], query))
            .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
        ),
      [],
    ),

  get: (id: string) =>
    read<StudyForm>(() => {
      const form = db.forms.find((f) => f.id === id)
      if (!form) throw new ApiError('Form not found.', 'not_found')
      return clone(form)
    }),

  create: (input: { title: string; description: string; category: FormCategory }) =>
    write(() => {
      const record: StudyForm = {
        id: nextId('FRM'),
        title: input.title,
        description: input.description,
        category: input.category,
        type: 'Unassigned',
        status: 'draft',
        sections: [],
        createdAt: now(),
        updatedAt: now(),
        assignedStudyIds: [],
      }
      db.forms.unshift(record)
      return clone(record)
    }),

  update: (id: string, patch: Partial<StudyForm>) =>
    write(() => {
      const i = db.forms.findIndex((f) => f.id === id)
      if (i === -1) throw new ApiError('Form not found.', 'not_found')
      db.forms[i] = { ...db.forms[i], ...patch, updatedAt: now() }
      return clone(db.forms[i])
    }),

  publish: (id: string, startDate: string) =>
    write(() => {
      const form = db.forms.find((f) => f.id === id)
      if (!form) throw new ApiError('Form not found.', 'not_found')
      const questionCount = form.sections.reduce((n, s) => n + s.questions.length, 0)
      if (questionCount === 0) {
        throw new ApiError('Add at least one question before publishing.', 'invalid')
      }
      form.status = 'published'
      form.publishedAt = now()
      form.startDate = startDate
      form.updatedAt = now()
      return clone(form)
    }),

  setType: (id: string, type: FormType) =>
    write(() => {
      const form = db.forms.find((f) => f.id === id)
      if (!form) throw new ApiError('Form not found.', 'not_found')
      form.type = type
      form.updatedAt = now()
      return clone(form)
    }),

  /** Replaces the legacy slushbucket: the full assigned set is sent at once. */
  setStudyAssignments: (studyId: string, category: FormCategory, formIds: string[]) =>
    write(() => {
      db.forms
        .filter((f) => f.category === category)
        .forEach((f) => {
          const shouldHave = formIds.includes(f.id)
          const has = f.assignedStudyIds.includes(studyId)
          if (shouldHave && !has) f.assignedStudyIds.push(studyId)
          if (!shouldHave && has) {
            f.assignedStudyIds = f.assignedStudyIds.filter((s) => s !== studyId)
          }
        })
      return clone(db.forms.filter((f) => f.assignedStudyIds.includes(studyId)))
    }),

  listForStudy: (studyId: string, category: FormCategory) =>
    read<StudyForm[]>(
      () =>
        clone(
          db.forms.filter((f) => f.category === category && f.assignedStudyIds.includes(studyId)),
        ),
      [],
    ),
}

/* ---------------------------------------------------------- appointments */

export const appointmentsApi = {
  list: (studyId: string) =>
    read<AppointmentTemplate[]>(
      () => clone(db.appointments.filter((a) => a.studyId === studyId)),
      [],
    ),
  create: (input: Omit<AppointmentTemplate, 'id' | 'createdAt'>) =>
    write(() => {
      const record: AppointmentTemplate = { ...input, id: nextId('APT'), createdAt: now() }
      db.appointments.push(record)
      return clone(record)
    }),
  update: (id: string, patch: Partial<AppointmentTemplate>) =>
    write(() => {
      const i = db.appointments.findIndex((a) => a.id === id)
      if (i === -1) throw new ApiError('Appointment template not found.', 'not_found')
      db.appointments[i] = { ...db.appointments[i], ...patch }
      return clone(db.appointments[i])
    }),
  remove: (id: string) =>
    write(() => {
      db.appointments = db.appointments.filter((a) => a.id !== id)
    }),
}

/* ---------------------------------------------------------- notifications */

export const notificationsApi = {
  list: (studyId: string) =>
    read<NotificationGroup[]>(
      () => clone(db.notificationGroups.filter((g) => g.studyId === studyId)),
      [],
    ),
  createGroup: (input: { studyId: string; title: string; templateName: string }) =>
    write(() => {
      const record: NotificationGroup = {
        ...input,
        id: nextId('NG'),
        questions: [],
        createdAt: now(),
      }
      db.notificationGroups.push(record)
      return clone(record)
    }),
  addQuestion: (groupId: string, question: Omit<NotificationQuestion, 'id'>) =>
    write(() => {
      const group = db.notificationGroups.find((g) => g.id === groupId)
      if (!group) throw new ApiError('Question group not found.', 'not_found')
      const record: NotificationQuestion = { ...question, id: nextId('NQ') }
      group.questions.push(record)
      return clone(record)
    }),
  removeQuestion: (groupId: string, questionId: string) =>
    write(() => {
      const group = db.notificationGroups.find((g) => g.id === groupId)
      if (!group) return
      group.questions = group.questions.filter((q) => q.id !== questionId)
    }),
  removeGroup: (groupId: string) =>
    write(() => {
      db.notificationGroups = db.notificationGroups.filter((g) => g.id !== groupId)
    }),
}

/* ------------------------------------------------------ approved locations */

export const locationsApi = {
  list: (studyId: string) =>
    read<ApprovedLocation[]>(
      () => clone(db.approvedLocations.filter((l) => l.studyId === studyId)),
      [],
    ),
  create: (input: Omit<ApprovedLocation, 'id'>) =>
    write(() => {
      if (
        db.approvedLocations.some(
          (l) => l.studyId === input.studyId && l.facilityName === input.facilityName,
        )
      ) {
        throw new ApiError('That location is already approved for this study.', 'duplicate')
      }
      const record: ApprovedLocation = { ...input, id: nextId('AL') }
      db.approvedLocations.push(record)
      return clone(record)
    }),
  setEnabled: (id: string, enabled: boolean) =>
    write(() => {
      const record = db.approvedLocations.find((l) => l.id === id)
      if (!record) throw new ApiError('Location not found.', 'not_found')
      record.enabled = enabled
      return clone(record)
    }),
  remove: (id: string) =>
    write(() => {
      db.approvedLocations = db.approvedLocations.filter((l) => l.id !== id)
    }),
}

/* --------------------------------------------------------- public trials */

export const publicApi = {
  search: (query: string) =>
    read<PublicTrial[]>(
      () =>
        clone(
          db.publicTrials.filter((t) =>
            matches([t.nctId, t.title, t.condition, t.sponsor, ...t.locations], query),
          ),
        ),
      [],
    ),

  get: (nctId: string) =>
    read<PublicTrial>(() => {
      const trial = db.publicTrials.find((t) => t.nctId.toLowerCase() === nctId.toLowerCase())
      if (!trial) throw new ApiError(`No trial found for ${nctId}.`, 'not_found')
      return clone(trial)
    }),

  /** Pre-screening questions a participant answers before the sign-up form. */
  prescreening: (nctId: string) =>
    read<PrescreeningQuestion[]>(() => {
      const trial = db.publicTrials.find((t) => t.nctId === nctId)
      if (!trial) return []
      return clone(
        db.prescreening
          .filter((q) => q.studyId === trial.studyId && q.group === 'primary')
          .sort((a, b) => a.order - b.order),
      )
    }, []),

  enroll: (payload: {
    nctId: string
    firstName: string
    lastName: string
    email: string
    phone: string
    city: string
    zipcode: string
    gender: string
    dateOfBirth: string
    smokingStatus: string
    primaryLanguage: string
    ethnicity: string[]
    healthCondition: string
    prescreeningAnswers: { question: string; answer: string }[]
  }) =>
    write(() => {
      const trial = db.publicTrials.find((t) => t.nctId === payload.nctId)
      if (!trial) throw new ApiError('This trial is no longer accepting sign-ups.', 'not_found')
      if (db.subjects.some((s) => s.email.toLowerCase() === payload.email.toLowerCase())) {
        throw new ApiError(
          'This email address has already been used to sign up for a study.',
          'duplicate',
        )
      }
      const id = `PT${String(240000 + db.subjects.length + 1).padStart(6, '0')}`
      const subject: Subject = {
        id,
        studyId: trial.studyId,
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email,
        phone: payload.phone,
        city: payload.city,
        zipcode: payload.zipcode,
        gender: payload.gender,
        dateOfBirth: payload.dateOfBirth,
        smokingStatus: payload.smokingStatus,
        primaryLanguage: payload.primaryLanguage,
        ethnicity: payload.ethnicity,
        healthCondition: payload.healthCondition,
        status: 'pending',
        createdAt: now(),
        prescreeningAnswers: payload.prescreeningAnswers,
      }
      db.subjects.unshift(subject)
      return { participantId: id, studyId: trial.studyId }
    }),
}

/* ---------------------------------------------------------- global search */

export interface SearchHit {
  id: string
  kind: 'study' | 'participant' | 'form' | 'request'
  title: string
  subtitle: string
  to: string
}

export const searchApi = {
  /**
   * One query across every record a site works with.
   *
   * Feeds the command palette. Deliberately server-shaped — a real backend
   * would run this as a single indexed query rather than four scans.
   */
  global: (query: string, limit = 6) =>
    read<SearchHit[]>(() => {
      const q = query.trim().toLowerCase()
      if (!q) return []
      const hits: SearchHit[] = []

      db.studies
        .filter((s) => matches([s.id, s.nctId, s.title, s.condition, s.sponsor], q))
        .slice(0, limit)
        .forEach((s) =>
          hits.push({
            id: s.id,
            kind: 'study',
            title: s.title,
            subtitle: `${s.id} · ${s.nctId} · ${s.condition}`,
            to: `/studies/${s.id}`,
          }),
        )

      db.subjects
        .filter((s) => matches([s.id, s.firstName, s.lastName, s.email], q))
        .slice(0, limit)
        .forEach((s) =>
          hits.push({
            id: s.id,
            kind: 'participant',
            title: `${s.firstName} ${s.lastName}`,
            subtitle: `${s.id} · ${s.city}`,
            to: `/studies/${s.studyId}/participants`,
          }),
        )

      db.forms
        .filter((f) => matches([f.title, f.type, f.description], q))
        .slice(0, limit)
        .forEach((f) =>
          hits.push({
            id: f.id,
            kind: 'form',
            title: f.title,
            subtitle: `${f.category === 'form' ? 'Form' : 'Survey'} · ${f.type}`,
            to: `/${f.category === 'form' ? 'forms' : 'surveys'}/${f.id}`,
          }),
        )

      db.studyRequests
        .filter((r) => matches([r.id, r.nctId, r.title, r.sponsor], q))
        .slice(0, limit)
        .forEach((r) =>
          hits.push({
            id: r.id,
            kind: 'request',
            title: r.title,
            subtitle: `${r.id} · ${r.sponsor}`,
            to: `/requests/${r.id}`,
          }),
        )

      return hits
    }, []),
}

/* ------------------------------------------------------------- dashboard */

export interface DashboardSummary {
  studies: { active: number; promoted: number; archived: number }
  enrollment: { target: number; enrolled: number }
  pipeline: { pending: number; validated: number; recruited: number; rejected: number }
  openRequests: StudyRequest[]
  draftForms: StudyForm[]
  recentSubjects: Subject[]
}

export const dashboardApi = {
  get: () =>
    read<DashboardSummary>(() => ({
      studies: {
        active: db.studies.filter((s) => s.status === 'active').length,
        promoted: db.studies.filter((s) => s.status === 'promoted').length,
        archived: db.studies.filter((s) => s.status === 'archived').length,
      },
      enrollment: {
        target: db.studies.reduce((n, s) => n + s.enrollmentTarget, 0),
        enrolled: db.studies.reduce((n, s) => n + s.enrolled, 0),
      },
      pipeline: {
        pending: db.subjects.filter((s) => s.status === 'pending').length,
        validated: db.subjects.filter((s) => s.status === 'validated').length,
        prescreened: db.subjects.filter((s) => s.status === 'prescreened').length,
        recruited: db.subjects.filter((s) => s.status === 'recruited').length,
        rejected: db.subjects.filter((s) => s.status === 'rejected').length,
        dropped: db.subjects.filter((s) => s.status === 'dropped').length,
      },
      openRequests: clone(
        db.studyRequests.filter((r) => r.status === 'submitted' || r.status === 'under_review'),
      ),
      draftForms: clone(db.forms.filter((f) => f.status === 'draft')),
      recentSubjects: clone(
        [...db.subjects].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6),
      ),
    })),
}
