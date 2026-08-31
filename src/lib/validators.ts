/**
 * Field validators. Each returns an error string or undefined, so they compose
 * into the rule maps consumed by `useForm`.
 *
 * The legacy ServiceNow forms surfaced required fields only after submit, as a
 * strip of red chips at the bottom of the page. These same rules now run on
 * blur, inline, next to the field that failed.
 */
export type Validator<T = string> = (value: T) => string | undefined

export const required =
  (label = 'This field'): Validator<string> =>
  (v) =>
    v?.toString().trim() ? undefined : `${label} is required`

export const requiredList =
  (label = 'At least one item'): Validator<unknown[]> =>
  (v) =>
    v && v.length > 0 ? undefined : `${label} is required`

export const email: Validator = (v) =>
  !v || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()) ? undefined : 'Enter a valid email address'

export const minLength =
  (n: number, label = 'This field'): Validator =>
  (v) =>
    !v || v.length >= n ? undefined : `${label} must be at least ${n} characters`

export const maxLength =
  (n: number, label = 'This field'): Validator =>
  (v) =>
    !v || v.length <= n ? undefined : `${label} must be ${n} characters or fewer`

/** Mirrors the legacy password policy: 8+ chars, one letter, one number. */
export const password: Validator = (v) => {
  if (!v) return undefined
  if (v.length < 8) return 'Use at least 8 characters'
  if (!/[A-Za-z]/.test(v) || !/[0-9]/.test(v)) return 'Include at least one letter and one number'
  return undefined
}

export const matches =
  (other: string, label = 'Values'): Validator =>
  (v) =>
    !v || v === other ? undefined : `${label} do not match`

/** ClinicalTrials.gov identifier — "NCT" followed by 8 digits. */
export const nctNumber: Validator = (v) =>
  !v || /^NCT\d{8}$/i.test(v.trim())
    ? undefined
    : 'Enter a valid NCT number, for example NCT01234567'

export const numeric =
  (label = 'This field'): Validator =>
  (v) =>
    !v || /^\d+$/.test(v.trim()) ? undefined : `${label} must be a number`

export const inRange =
  (min: number, max: number, label = 'This field'): Validator =>
  (v) => {
    if (!v) return undefined
    const n = Number(v)
    if (Number.isNaN(n)) return `${label} must be a number`
    return n >= min && n <= max ? undefined : `${label} must be between ${min} and ${max}`
  }

export const phone: Validator = (v) =>
  !v || /^[\d\s+()-]{7,20}$/.test(v.trim()) ? undefined : 'Enter a valid phone number'

export const zip: Validator = (v) =>
  !v || /^[A-Za-z0-9\s-]{3,10}$/.test(v.trim()) ? undefined : 'Enter a valid postal code'

export const url: Validator = (v) => {
  if (!v) return undefined
  return URL.canParse(v) ? undefined : 'Enter a valid URL, including https://'
}

/** Run validators in order and return the first failure. */
export function all<T>(...validators: Validator<T>[]): Validator<T> {
  return (value) => {
    for (const v of validators) {
      const error = v(value)
      if (error) return error
    }
    return undefined
  }
}
