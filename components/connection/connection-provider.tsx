"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { loadLocalSettings } from "@/lib/settings/local"
import type { LocalSettings } from "@/lib/settings/types"
import { AI_PROVIDERS } from "@/lib/ai/catalog"
import type { ConnectionTarget } from "@/lib/ai/connection"
import { useConnectionProbe, type ConnectionState } from "@/hooks/use-connection-probe"

interface ConnectionContextValue {
  settings: LocalSettings
  target: ConnectionTarget | null
  state: ConnectionState
  retry: () => void
  /** Settings are complete enough to attempt a connection (URL, key if required, model). */
  configured: boolean
}

const ConnectionContext = createContext<ConnectionContextValue | null>(null)

export function targetFromSettings(s: LocalSettings): ConnectionTarget | null {
  const baseUrl = (s.ai.connectionMode === "proxy" ? s.ai.proxyBaseUrl : s.ai.baseUrl).trim()
  if (!baseUrl) return null
  return { providerId: s.ai.providerId, baseUrl, apiKey: s.ai.apiKey || undefined }
}

/** Shares one connection probe of the saved settings between the chat top bar and composer. */
export function ConnectionProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<LocalSettings>(() => loadLocalSettings())

  useEffect(() => {
    const reload = () => setSettings(loadLocalSettings())
    reload()
    const onStorage = (e: StorageEvent) => {
      if (e.key === "edgen-chat:settings:v1") reload()
    }
    window.addEventListener("edgen-chat:settings", reload)
    window.addEventListener("storage", onStorage)
    return () => {
      window.removeEventListener("edgen-chat:settings", reload)
      window.removeEventListener("storage", onStorage)
    }
  }, [])

  const target = useMemo(
    () => targetFromSettings(settings),
    [settings.ai.providerId, settings.ai.connectionMode, settings.ai.baseUrl, settings.ai.proxyBaseUrl, settings.ai.apiKey],
  )
  const { state, retry } = useConnectionProbe(target)
  const provider = AI_PROVIDERS[settings.ai.providerId]
  const configured = !!target && !!settings.ai.model.trim() && (!provider.requiresApiKey || !!settings.ai.apiKey)

  return (
    <ConnectionContext.Provider value={{ settings, target, state, retry, configured }}>{children}</ConnectionContext.Provider>
  )
}

export function useConnection() {
  const ctx = useContext(ConnectionContext)
  if (!ctx) throw new Error("useConnection must be used inside <ConnectionProvider>")
  return ctx
}
