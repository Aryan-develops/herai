import { useCallback, useEffect, useRef, useState } from 'react'

export type AsyncState<T> =
  | { status: 'idle'; data?: undefined; error?: undefined }
  | { status: 'loading'; data?: T; error?: undefined }
  | { status: 'success'; data: T; error?: undefined }
  | { status: 'error'; data?: T; error: Error }

/** Runs an async function on demand, ignoring stale responses. */
export function useAsync<T, A extends unknown[]>(fn: (...args: A) => Promise<T>) {
  const [state, setState] = useState<AsyncState<T>>({ status: 'idle' })
  const callId = useRef(0)
  const lastArgs = useRef<A | null>(null)
  const fnRef = useRef(fn)
  fnRef.current = fn

  const run = useCallback(async (...args: A) => {
    const id = ++callId.current
    lastArgs.current = args
    setState((s) => ({ status: 'loading', data: s.data }))
    try {
      const data = await fnRef.current(...args)
      if (id === callId.current) setState({ status: 'success', data })
      return data
    } catch (e) {
      if (id === callId.current) setState({ status: 'error', error: e as Error })
      return undefined
    }
  }, [])

  const retry = useCallback(() => {
    if (lastArgs.current) void run(...lastArgs.current)
  }, [run])

  const reset = useCallback(() => {
    callId.current++
    setState({ status: 'idle' })
  }, [])

  return { ...state, run, retry, reset }
}

/** Loads once on mount. */
export function useLoad<T>(fn: () => Promise<T>) {
  const a = useAsync(fn)
  const { run } = a
  useEffect(() => {
    void run()
  }, [run])
  return a
}
