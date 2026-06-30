import type { AiConnectionMode, AiProviderId } from "@/lib/ai/catalog"

// Shape of settings persisted in localStorage (lib/settings/local.ts).

export interface LocalAiSettings {
  providerId: AiProviderId
  connectionMode: AiConnectionMode
  /**
   * Provider-specific model identifier (string). For OpenAI-compatible providers,
   * this is the `model` sent to `/v1/chat/completions`.
   */
  model: string
  /**
   * Used when connectionMode = "proxy"
   */
  proxyBaseUrl: string
  /**
   * Used when connectionMode = "direct"
   */
  baseUrl: string
  /**
   * Stored locally only. Some providers do not require this.
   */
  apiKey: string
}

export interface LocalVoiceSettings {
  autoSpeak: boolean
}

export interface LocalSettings {
  ai: LocalAiSettings
  voice: LocalVoiceSettings
}


