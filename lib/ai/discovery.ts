import { AI_PROVIDERS, type AiProviderId } from "@/lib/ai/catalog"

// In-memory model lists keyed by provider + base URL, persisted in localStorage.
const KEY = "edgen-chat:models-cache:v1"

type CacheEntry = {
  fetchedAt: number
  models: string[]
}

type Cache = Record<string, CacheEntry> // key = `${providerId}::${baseUrl}`

function loadCache(): Cache {
  if (typeof window === "undefined") return {}
  try {
    return (JSON.parse(localStorage.getItem(KEY) || "{}") as Cache) || {}
  } catch {
    return {}
  }
}

function saveCache(cache: Cache) {
  localStorage.setItem(KEY, JSON.stringify(cache))
  try {
    window.dispatchEvent(new Event("edgen-chat:models"))
  } catch {
    // ignore
  }
}

function cacheKey(providerId: AiProviderId, baseUrl: string) {
  return `${providerId}::${baseUrl.replace(/\/$/, "")}`
}

function isLoopbackBaseUrl(baseUrl: string) {
  try {
    const u = new URL(baseUrl)
    return u.hostname === "localhost" || u.hostname === "127.0.0.1" || u.hostname === "::1"
  } catch {
    return false
  }
}

function maybeCorsHint(baseUrl: string) {
  if (typeof window === "undefined") return ""
  const hosted = window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1"
  if (!hosted) return ""
  if (!isLoopbackBaseUrl(baseUrl)) return ""

  // Keep this short; UI + README can contain the full recipe.
  return `\n\nCORS hint: You're using a hosted site (${window.location.origin}) but calling a local server (${baseUrl}). Your local server must allow CORS for this origin (or run a local reverse proxy that adds CORS headers).`
}

// Returns cached model names if present; null when nothing has been fetched yet.
export function getCachedModels(providerId: AiProviderId, baseUrl: string): CacheEntry | null {
  const key = cacheKey(providerId, baseUrl)
  const cache = loadCache()
  return cache[key] ?? null
}

// Lists model ids via GET /v1/models (OpenAI-compatible providers).
export async function discoverModelsOpenAICompatible(baseUrl: string, apiKey?: string): Promise<string[]> {
  const url = `${baseUrl.replace(/\/$/, "")}/v1/models`
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`

  let res: Response
  try {
    res = await fetch(url, { method: "GET", headers })
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Failed to fetch"
    throw new Error(`Model discovery failed: ${detail}${maybeCorsHint(baseUrl)}`)
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Model discovery failed ${res.status}: ${text || res.statusText}${maybeCorsHint(baseUrl)}`)
  }
  const json = await res.json()
  const ids = (json?.data ?? [])
    .map((m: any) => m?.id)
    .filter((id: any) => typeof id === "string" && id.length)
  return Array.from(new Set(ids)).sort()
}

// Lists installed tags via GET /api/tags (native Ollama API).
export async function discoverModelsOllama(baseUrl: string): Promise<string[]> {
  const url = `${baseUrl.replace(/\/$/, "")}/api/tags`
  let res: Response
  try {
    res = await fetch(url, { method: "GET" })
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Failed to fetch"
    throw new Error(`Ollama model discovery failed: ${detail}${maybeCorsHint(baseUrl)}`)
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Ollama model discovery failed ${res.status}: ${text || res.statusText}${maybeCorsHint(baseUrl)}`)
  }
  const json = await res.json()
  const names = (json?.models ?? [])
    .map((m: any) => m?.name)
    .filter((name: any) => typeof name === "string" && name.length)
  return Array.from(new Set(names)).sort()
}

// Fetches models from the provider, caches them in localStorage, and emits edgen-chat:models.
export async function refreshDiscoveredModels(providerId: AiProviderId, baseUrl: string, apiKey?: string) {
  const provider = AI_PROVIDERS[providerId]
  if (!provider?.supportsModelDiscovery) return
  if (!baseUrl) throw new Error("Missing base URL for model discovery")

  // Try the most likely discovery mechanism first, then fallback for common setups.
  // - OpenAI-compatible: GET /v1/models
  // - Ollama: GET /api/tags (native), and optionally /v1/models (OpenAI compatibility)
  let models: string[] = []
  if (providerId === "ollama") {
    try {
      models = await discoverModelsOllama(baseUrl)
    } catch {
      // Some setups expose only the OpenAI-compatible API surface.
      models = await discoverModelsOpenAICompatible(baseUrl, apiKey)
    }
  } else {
    try {
      models = await discoverModelsOpenAICompatible(baseUrl, apiKey)
    } catch (err) {
      // A common case: proxy points to Ollama, but /v1/models is missing or blocked.
      // Try Ollama-native tags as a fallback.
      try {
        models = await discoverModelsOllama(baseUrl)
      } catch {
        throw err
      }
    }
  }

  const cache = loadCache()
  cache[cacheKey(providerId, baseUrl)] = { fetchedAt: Date.now(), models }
  saveCache(cache)
  return models
}



