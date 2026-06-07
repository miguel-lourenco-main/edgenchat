export type AiProviderId = "openai_compatible" | "ollama"

export type AiConnectionMode = "proxy" | "direct"

// Static registry of supported AI backends and their default model presets.
export interface AiProvider {
  id: AiProviderId
  name: string
  requiresApiKey: boolean
  defaultBaseUrl?: string
  supportsModelDiscovery: boolean
}

export interface AiModelOption {
  id: string
  providerId: AiProviderId
  label: string
  model: string
}

export const AI_PROVIDERS: Record<AiProviderId, AiProvider> = {
  openai_compatible: {
    id: "openai_compatible",
    name: "OpenAI-compatible (any provider)",
    requiresApiKey: true,
    supportsModelDiscovery: true,
  },
  ollama: {
    id: "ollama",
    name: "Ollama",
    requiresApiKey: false,
    defaultBaseUrl: "http://localhost:11434",
    supportsModelDiscovery: true,
  },
}

export const AI_MODELS: AiModelOption[] = [
  // OpenAI-compatible defaults (works via proxy or direct)
  { id: "oa_gpt_4o_mini", providerId: "openai_compatible", label: "GPT-4o mini", model: "gpt-4o-mini" },
  { id: "oa_gpt_4o", providerId: "openai_compatible", label: "GPT-4o", model: "gpt-4o" },
  { id: "oa_gpt_4_1_mini", providerId: "openai_compatible", label: "GPT-4.1 mini", model: "gpt-4.1-mini" },
  { id: "oa_gpt_4_1", providerId: "openai_compatible", label: "GPT-4.1", model: "gpt-4.1" },
  { id: "oa_gpt_4_1_nano", providerId: "openai_compatible", label: "GPT-4.1 nano", model: "gpt-4.1-nano" },
  { id: "oa_o3_mini", providerId: "openai_compatible", label: "o3-mini", model: "o3-mini" },
  { id: "oa_o3", providerId: "openai_compatible", label: "o3", model: "o3" },
  { id: "oa_o1", providerId: "openai_compatible", label: "o1", model: "o1" },
  { id: "oa_o1_mini", providerId: "openai_compatible", label: "o1-mini", model: "o1-mini" },
  { id: "oa_o1_preview", providerId: "openai_compatible", label: "o1-preview", model: "o1-preview" },
  { id: "oa_gpt_4_turbo", providerId: "openai_compatible", label: "GPT-4 Turbo", model: "gpt-4-turbo" },
  { id: "oa_gpt_4o_realtime_preview", providerId: "openai_compatible", label: "GPT-4o Realtime (preview)", model: "gpt-4o-realtime-preview" },
  { id: "oa_gpt_4o_audio_preview", providerId: "openai_compatible", label: "GPT-4o Audio (preview)", model: "gpt-4o-audio-preview" },
  { id: "oa_gpt_4o_mini_realtime_preview", providerId: "openai_compatible", label: "GPT-4o mini Realtime (preview)", model: "gpt-4o-mini-realtime-preview" },
  { id: "oa_gpt_4o_mini_audio_preview", providerId: "openai_compatible", label: "GPT-4o mini Audio (preview)", model: "gpt-4o-mini-audio-preview" },

  // Ollama defaults
  { id: "ollama_llama3_1_8b", providerId: "ollama", label: "Llama 3.1 8B", model: "llama3.1:8b" },
  { id: "ollama_qwen2_5_7b", providerId: "ollama", label: "Qwen 2.5 7B", model: "qwen2.5:7b" },
  { id: "ollama_mistral", providerId: "ollama", label: "Mistral", model: "mistral" },
]

// Lookup helpers for the static preset list (distinct from runtime discovery).
export function getModelById(modelId: string | null | undefined) {
  return AI_MODELS.find((m) => m.id === modelId) ?? null
}

export function getModelsForProvider(providerId: AiProviderId) {
  return AI_MODELS.filter((m) => m.providerId === providerId)
}


