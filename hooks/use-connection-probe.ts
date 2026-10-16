"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { probeConnection, type ConnectionFailure, type ConnectionTarget } from "@/lib/ai/connection"
import { storeDiscoveredModels } from "@/lib/ai/discovery"

export type ConnectionState =
  | { status: "idle" }
  | { status: "checking" }
  | { status: "connected"; models: string[]; endpoint: string; latencyMs: number; checkedAt: number }
  | { status: "failed"; failure: ConnectionFailure; checkedAt: number }

export const DEFAULT_PROBE_DEBOUNCE_MS = 600

/**
 * Probes `target` on mount and whenever it changes (debounced), and exposes a manual `retry`.
 * A `null` target (missing URL) leaves the state idle.
 */
export function useConnectionProbe(target: ConnectionTarget | null, debounceMs = DEFAULT_PROBE_DEBOUNCE_MS) {
  const [state, setState] = useState<ConnectionState>(() => (target ? { status: "checking" } : { status: "idle" }))
  const [nonce, setNonce] = useState(0)
  const firstRun = useRef(true)
  const providerId = target?.providerId
  const baseUrl = target?.baseUrl.trim() ?? ""
  const apiKey = target?.apiKey ?? ""

  useEffect(() => {
    if (!providerId || !baseUrl) {
      setState({ status: "idle" })
      return
    }
    const ac = new AbortController()
    // No delay on first load or on an explicit retry; debounce while the user is typing.
    const delay = firstRun.current || nonce > 0 ? 0 : debounceMs
    firstRun.current = false
    const timer = setTimeout(async () => {
      setState({ status: "checking" })
      try {
        const result = await probeConnection({ providerId, baseUrl, apiKey: apiKey || undefined }, { signal: ac.signal })
        if (ac.signal.aborted) return
        if (result.ok) {
          storeDiscoveredModels(providerId, baseUrl, result.models)
          setState({
            status: "connected",
            models: result.models,
            endpoint: result.endpoint,
            latencyMs: result.latencyMs,
            checkedAt: Date.now(),
          })
        } else {
          setState({ status: "failed", failure: result, checkedAt: Date.now() })
        }
      } catch {
        // Aborted because the target changed or the component unmounted.
      }
    }, delay)
    return () => {
      clearTimeout(timer)
      ac.abort()
    }
    // `nonce` re-runs the probe on retry.
  }, [providerId, baseUrl, apiKey, debounceMs, nonce])

  const retry = useCallback(() => setNonce((n) => n + 1), [])

  return { state, retry }
}

/** Whether `model` is known to be missing from a connected server's list. */
export function isModelMissing(state: ConnectionState, model: string) {
  const m = model.trim()
  return state.status === "connected" && state.models.length > 0 && !!m && !state.models.includes(m)
}
