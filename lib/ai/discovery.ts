import type { AiProviderId } from "@/lib/ai/catalog"

const KEY = "edgen-chat:models-cache:v1"

type CacheEntry = {
  fetchedAt: number
  models: string[]
}

type Cache = Record<string, CacheEntry> // key = `${providerId}::${baseUrl}`

// Model lists are cached in localStorage, keyed by provider and base URL, so the picker works offline and across tabs.
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

export function getCachedModels(providerId: AiProviderId, baseUrl: string): CacheEntry | null {
  const key = cacheKey(providerId, baseUrl)
  const cache = loadCache()
  return cache[key] ?? null
}

/** Store a model list obtained elsewhere (e.g. a connection probe) so every view shares it. */
export function storeDiscoveredModels(providerId: AiProviderId, baseUrl: string, models: string[]) {
  if (typeof window === "undefined" || !baseUrl) return
  const cache = loadCache()
  const key = cacheKey(providerId, baseUrl)
  const prev = cache[key]
  cache[key] = { fetchedAt: Date.now(), models }
  // Only broadcast when the list actually changed, to avoid listener loops.
  if (prev && prev.models.join("\n") === models.join("\n")) {
    localStorage.setItem(KEY, JSON.stringify(cache))
    return
  }
  saveCache(cache)
}
