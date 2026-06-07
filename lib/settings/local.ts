import type { LocalSettings } from "@/lib/settings/types"
import { AI_MODELS, AI_PROVIDERS } from "@/lib/ai/catalog"

// All AI/voice preferences are browser-local; no server round-trip.
const STORAGE_KEY = "edgen-chat:settings:v1"

const DEFAULTS: LocalSettings = {
  ai: {
    providerId: "openai_compatible",
    connectionMode: "proxy",
    model: "gpt-4.1-mini",
    proxyBaseUrl: "",
    baseUrl: "",
    apiKey: "",
  },
  voice: {
    autoSpeak: false,
  },
}

const DEFAULT_PROXY = {
  // Sensible defaults when the user picks the OpenAI-compatible proxy path.
  providerId: "openai_compatible" as const,
  connectionMode: "proxy" as const,
  model: "gpt-4.1-mini",
}

const DEFAULT_LOCAL = {
  // Sensible defaults when the user picks direct Ollama.
  providerId: "ollama" as const,
  connectionMode: "direct" as const,
  model: "llama3.1:8b",
}

// Merges persisted settings with defaults and migrates legacy field names.
export function loadLocalSettings(): LocalSettings {
  if (typeof window === "undefined") return DEFAULTS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    const parsed = JSON.parse(raw) as Partial<LocalSettings>
    const merged: LocalSettings = {
      ai: {
        ...DEFAULTS.ai,
        ...(parsed.ai ?? {}),
      },
      voice: {
        ...DEFAULTS.voice,
        ...(parsed.voice ?? {}),
      },
    }

    // Back-compat: older settings stored `defaultModel` only.
    const legacyDefaultModel = (parsed as any)?.ai?.defaultModel as string | undefined
    if (legacyDefaultModel && !merged.ai.model) {
      merged.ai.model = legacyDefaultModel
    }

    // Back-compat: old provider IDs.
    if (merged.ai.providerId === ("openai_compat_proxy" as any) || merged.ai.providerId === ("openai_compat_direct" as any)) {
      merged.ai.providerId = "openai_compatible"
      if (!merged.ai.connectionMode) merged.ai.connectionMode = "proxy"
    }
    if (merged.ai.providerId === ("ollama_direct" as any)) {
      merged.ai.providerId = "ollama"
      if (!merged.ai.connectionMode) merged.ai.connectionMode = "direct"
    }

    // Back-compat: old model IDs (map to model strings)
    const legacyModelId = (merged.ai as any).modelId as string | undefined
    if (!merged.ai.model && legacyModelId) {
      const map: Record<string, string> = {
        oa_gpt_4o_mini: "gpt-4o-mini",
        oa_gpt_4o: "gpt-4o",
        oa_gpt_4_1_mini: "gpt-4.1-mini",
        oa_gpt_4_1: "gpt-4.1",
        oa_o3_mini: "o3-mini",
        openai_proxy_gpt_4o_mini: "gpt-4o-mini",
        openai_proxy_gpt_4o: "gpt-4o",
        openai_proxy_gpt_4_1_mini: "gpt-4.1-mini",
        openai_direct_gpt_4o_mini: "gpt-4o-mini",
        openai_direct_gpt_4o: "gpt-4o",
        openai_direct_gpt_4_1_mini: "gpt-4.1-mini",
        ollama_llama3_1_8b: "llama3.1:8b",
        ollama_qwen2_5_7b: "qwen2.5:7b",
      }
      merged.ai.model = map[legacyModelId] ?? DEFAULTS.ai.model
    }

    // If provider has a default base URL and user hasn't set one, prefill.
    const provider = AI_PROVIDERS[merged.ai.providerId]
    if (provider?.defaultBaseUrl && !merged.ai.baseUrl) {
      merged.ai.baseUrl = provider.defaultBaseUrl
    }

    // Enforce sane defaults for the two supported setups.
    if (merged.ai.providerId === "ollama") {
      if (!merged.ai.connectionMode) merged.ai.connectionMode = "direct"
      if (!merged.ai.model) merged.ai.model = DEFAULT_LOCAL.model
    } else {
      // Proxy path (OpenAI-compatible). We keep connectionMode as-is but default to proxy if missing.
      if (!merged.ai.connectionMode) merged.ai.connectionMode = "proxy"
      if (!merged.ai.model) merged.ai.model = DEFAULT_PROXY.model
      merged.ai.providerId = "openai_compatible"
    }

    return merged
  } catch {
    return DEFAULTS
  }
}

// Persists settings and notifies listeners via edgen-chat:settings.
export function saveLocalSettings(next: LocalSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  try {
    window.dispatchEvent(new Event("edgen-chat:settings"))
  } catch {
    // ignore
  }
}


