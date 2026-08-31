import { useCallback, useMemo, useRef, useState } from 'react'
import type { Validator } from './validators'

export type Rules<V> = Partial<{ [K in keyof V]: Validator<V[K]> }>
export type Errors<V> = Partial<Record<keyof V, string>>

interface UseFormOptions<V> {
  initialValues: V
  rules?: Rules<V>
  onSubmit?: (values: V) => void | Promise<void>
}

/**
 * Minimal typed form state: values, touched, errors, submit gating.
 *
 * Deliberately hand-rolled rather than pulling in a form library — the app's
 * validation needs are "required / shape" rules that the `validators` module
 * already expresses, and this keeps the dependency list short.
 *
 * Behaviour contract used by every form in the app:
 *  - validate on blur (first feedback only after the user leaves the field)
 *  - once a field is touched, re-validate as they type so errors clear live
 *  - on submit, touch everything and surface a linked error summary
 */
export function useForm<V extends Record<string, unknown>>({
  initialValues,
  rules,
  onSubmit,
}: UseFormOptions<V>) {
  const [values, setValues] = useState<V>(initialValues)
  const [touched, setTouched] = useState<Partial<Record<keyof V, boolean>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const rulesRef = useRef(rules)
  rulesRef.current = rules

  const allErrors = useMemo(() => {
    const next: Errors<V> = {}
    const r = rulesRef.current
    if (!r) return next
    for (const key of Object.keys(r) as (keyof V)[]) {
      const error = r[key]?.(values[key] as never)
      if (error) next[key] = error
    }
    return next
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, rules])

  /** Errors the user should see right now (touched fields, or after a submit). */
  const errors = useMemo(() => {
    const visible: Errors<V> = {}
    for (const key of Object.keys(allErrors) as (keyof V)[]) {
      if (touched[key] || submitAttempted) visible[key] = allErrors[key]
    }
    return visible
  }, [allErrors, touched, submitAttempted])

  const isValid = Object.keys(allErrors).length === 0
  const isDirty = useMemo(
    () => JSON.stringify(values) !== JSON.stringify(initialValues),
    [values, initialValues],
  )

  const setValue = useCallback(<K extends keyof V>(key: K, value: V[K]) => {
    setValues((prev) => (Object.is(prev[key], value) ? prev : { ...prev, [key]: value }))
  }, [])

  const setMany = useCallback((patch: Partial<V>) => {
    setValues((prev) => ({ ...prev, ...patch }))
  }, [])

  const blur = useCallback(<K extends keyof V>(key: K) => {
    setTouched((prev) => (prev[key] ? prev : { ...prev, [key]: true }))
  }, [])

  const reset = useCallback(
    (next?: V) => {
      setValues(next ?? initialValues)
      setTouched({})
      setSubmitAttempted(false)
      setSubmitting(false)
    },
    [initialValues],
  )

  /** Wire a text-like control in one spread: value, onChange, onBlur, aria. */
  const field = useCallback(
    <K extends keyof V>(key: K) => ({
      value: (values[key] ?? '') as string,
      onChange: (e: { target: { value: string } }) =>
        setValue(key, e.target.value as V[K]),
      onBlur: () => blur(key),
    }),
    [values, setValue, blur],
  )

  const submit = useCallback(
    async (e?: { preventDefault: () => void }) => {
      e?.preventDefault()
      setSubmitAttempted(true)
      const r = rulesRef.current
      if (r) setTouched(Object.fromEntries(Object.keys(r).map((k) => [k, true])) as never)
      if (Object.keys(allErrors).length > 0) return { ok: false as const, errors: allErrors }
      setSubmitting(true)
      try {
        await onSubmit?.(values)
        return { ok: true as const }
      } finally {
        setSubmitting(false)
      }
    },
    [allErrors, onSubmit, values],
  )

  return {
    values,
    errors,
    allErrors,
    touched,
    isValid,
    isDirty,
    submitting,
    submitAttempted,
    setValue,
    setMany,
    setValues,
    blur,
    field,
    submit,
    reset,
  }
}
