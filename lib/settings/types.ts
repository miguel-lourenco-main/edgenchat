import type { AiConnectionMode, AiProviderId } from "@/lib/ai/catalog"

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

/** Browser-local settings blob persisted under edgen-chat:settings:v1. */
export interface LocalSettings {
  ai: LocalAiSettings
  voice: LocalVoiceSettings
}


