export interface OpenAIChatMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export interface StreamChatArgs {
  baseUrl: string
  apiKey?: string
  model: string
  messages: OpenAIChatMessage[]
  signal?: AbortSignal
}

// Minimal SSE parser for OpenAI-compatible chat completions streams.
export async function* streamChatCompletion({
  baseUrl,
  apiKey,
  model,
  messages,
  signal,
}: StreamChatArgs): AsyncGenerator<string> {
  const url = `${baseUrl.replace(/\/$/, "")}/v1/chat/completions`
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`

  const res = await fetch(url, {
    method: "POST",
    headers,
    signal,
    body: JSON.stringify({
      model,
      stream: true,
      messages,
    }),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Proxy error ${res.status}: ${text || res.statusText}`)
  }
  if (!res.body) throw new Error("No response body for streaming")

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    // SSE events are separated by blank line.
    // Support both LF and CRLF.
    const parts = buffer.split(/\r?\n\r?\n/)
    buffer = parts.pop() ?? ""

    for (const part of parts) {
      const lines = part.split(/\r?\n/)
      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed.startsWith("data:")) continue
        const data = trimmed.slice(5).trim()
        if (data === "[DONE]") return
        try {
          const json = JSON.parse(data)
          const delta = json?.choices?.[0]?.delta?.content
          const finish = json?.choices?.[0]?.finish_reason
          if (typeof delta === "string" && delta.length) {
            yield delta
          }
          // Some providers (and some proxies) may not send a final [DONE] marker.
          // Treat a finish_reason as end-of-stream.
          if (typeof finish === "string" && finish.length) {
            return
          }
        } catch {
          // Ignore non-JSON lines
        }
      }
    }
  }
}


