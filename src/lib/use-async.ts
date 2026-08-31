import { useCallback, useEffect, useRef, useState } from 'react'

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error'

export interface AsyncState<T> {
  status: AsyncStatus
  data: T | undefined
  error: Error | undefined
  /** True on the first load only, so refreshes don't blank the screen. */
  isInitialLoading: boolean
  reload: () => void
}

/**
 * Runs an async read and exposes every state the UI must handle.
 *
 * Every data screen in this app reads through this hook, which is why loading,
 * error and empty states exist for real rather than as decoration: there is no
 * code path that renders data without also declaring what happens when the read
 * is slow, fails, or comes back with nothing.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [state, setState] = useState<{
    status: AsyncStatus
    data: T | undefined
    error: Error | undefined
  }>({ status: 'idle', data: undefined, error: undefined })
  const [nonce, setNonce] = useState(0)
  const loadedOnce = useRef(false)
  const fnRef = useRef(fn)
  fnRef.current = fn

  useEffect(() => {
    let cancelled = false
    setState((prev) => ({ ...prev, status: 'loading', error: undefined }))
    fnRef
      .current()
      .then((data) => {
        if (cancelled) return
        loadedOnce.current = true
        setState({ status: 'success', data, error: undefined })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        loadedOnce.current = true
        setState({
          status: 'error',
          data: undefined,
          error: error instanceof Error ? error : new Error(String(error)),
        })
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce])

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  return {
    status: state.status,
    data: state.data,
    error: state.error,
    isInitialLoading: state.status === 'loading' && !loadedOnce.current,
    reload,
  }
}

/**
 * The write counterpart: tracks in-flight state for a mutation so buttons can
 * disable themselves and errors can be surfaced next to the action.
 */
export function useAction<Args extends unknown[], R>(fn: (...args: Args) => Promise<R>) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<Error | undefined>()
  const fnRef = useRef(fn)
  fnRef.current = fn

  const run = useCallback(async (...args: Args): Promise<R | undefined> => {
    setPending(true)
    setError(undefined)
    try {
      return await fnRef.current(...args)
    } catch (e: unknown) {
      setError(e instanceof Error ? e : new Error(String(e)))
      return undefined
    } finally {
      setPending(false)
    }
  }, [])

  return { run, pending, error, clearError: useCallback(() => setError(undefined), []) }
}
