import { loadLocalSettings } from "@/lib/settings/local"
import { AI_PROVIDERS } from "@/lib/ai/catalog"

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


