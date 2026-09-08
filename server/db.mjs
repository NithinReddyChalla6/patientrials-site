/**
 * Database dispatcher.
 *
 * Uses Postgres when DATABASE_URL is set (production — e.g. a Neon database) and
 * SQLite otherwise (local development, zero setup). Both backends expose the
 * same interface; callers `await` every function so the two are interchangeable.
 */
const usePostgres = Boolean(process.env.DATABASE_URL)

const impl = await import(usePostgres ? './db-postgres.mjs' : './db-sqlite.mjs')

console.log(`[db] using ${usePostgres ? 'Postgres (DATABASE_URL)' : 'SQLite (local file)'}`)

export const seedIfEmpty = impl.seedIfEmpty
export const findUserByEmail = impl.findUserByEmail
export const findUserById = impl.findUserById
export const emailExists = impl.emailExists
export const createUser = impl.createUser
export const toPublicUser = impl.toPublicUser
export const getSiteState = impl.getSiteState
export const saveSiteState = impl.saveSiteState
export const setPassword = impl.setPassword
export const setActive = impl.setActive
