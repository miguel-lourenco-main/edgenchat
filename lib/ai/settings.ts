import { loadLocalSettings } from "@/lib/settings/local"
import { AI_PROVIDERS } from "@/lib/ai/catalog"

// Resolves the active AI connection from local settings: the proxy URL in proxy mode, otherwise the direct base URL.
export function getAiConfig() {
  const s = loadLocalSettings()
  const provider = AI_PROVIDERS[s.ai.providerId]
  return {
    provider,
    baseUrl: (s.ai.connectionMode === "proxy" ? s.ai.proxyBaseUrl : s.ai.baseUrl).trim(),
    apiKey: s.ai.apiKey,
    model: s.ai.model.trim(),
  }
}


