import type { AiProviderId } from "@/lib/ai/catalog"

/**
 * Connection probing for the configured AI server.
 *
 * A probe asks the server for its model list (Ollama: GET /api/tags, OpenAI-compatible: GET /v1/models)
 * and classifies any failure into something a user can act on. Browsers report "server not running",
 * "wrong host" and "blocked by CORS" with the same opaque `TypeError: Failed to fetch`, so on a network
 * error we send a second `mode: "no-cors"` request: if that one resolves, the server is up and the first
 * request was blocked by CORS; if it also fails, the server is unreachable.
 */

export type ConnectionFailureKind =
  | "invalid_url"
  | "mixed_content"
  | "unreachable"
  | "cors"
  | "timeout"
  | "not_found"
  | "unauthorized"
  | "server_error"
  | "bad_response"

export interface ConnectionTarget {
  providerId: AiProviderId
  baseUrl: string
  apiKey?: string
}

export interface ConnectionSuccess {
  ok: true
  models: string[]
  /** Path that answered, e.g. `/api/tags`. */
  endpoint: string
  latencyMs: number
}

export interface ConnectionFailure {
  ok: false
  kind: ConnectionFailureKind
  /** Short headline, e.g. "Server unreachable". */
  title: string
  /** One-line guidance on what to do next. */
  hint: string
  /** Optional copy-pasteable fix (shell snippet / env var). */
  fix?: string
  status?: number
  /** Raw detail for debugging (HTTP body, error message). */
  detail?: string
  url: string
}

export type ConnectionResult = ConnectionSuccess | ConnectionFailure

export const DEFAULT_PROBE_TIMEOUT_MS = 6000

function trimSlash(url: string) {
  return url.replace(/\/+$/, "")
}

export function isLoopbackUrl(url: string) {
  try {
    const host = new URL(url).hostname
    return host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1"
  } catch {
    return false
  }
}

function pageOrigin() {
  return typeof window === "undefined" ? "" : window.location.origin
}

/** The env var a user needs so Ollama accepts requests from this page. */
export function ollamaOriginsFix(origin = pageOrigin()) {
  return `OLLAMA_ORIGINS="${origin || "*"}" ollama serve`
}

function corsFailure(target: ConnectionTarget, url: string, detail?: string): ConnectionFailure {
  const origin = pageOrigin()
  if (target.providerId === "ollama") {
    return {
      ok: false,
      kind: "cors",
      title: "Blocked by CORS",
      hint: `Ollama is running but rejects requests from ${origin || "this page"}. Restart it with OLLAMA_ORIGINS set to this origin.`,
      fix: ollamaOriginsFix(origin),
      detail,
      url,
    }
  }
  return {
    ok: false,
    kind: "cors",
    title: "Blocked by CORS",
    hint: `The server answered but does not allow requests from ${origin || "this page"}. Add this origin to its CORS allow-list, or put a CORS-enabled proxy in front.`,
    detail,
    url,
  }
}

function unreachableFailure(target: ConnectionTarget, url: string, detail?: string): ConnectionFailure {
  return {
    ok: false,
    kind: "unreachable",
    title: "Server unreachable",
    hint:
      target.providerId === "ollama"
        ? "Nothing answered at this address. Check that Ollama is running (ollama serve) and the Base URL and port are right."
        : "Nothing answered at this address. Check that the server is running and the URL is right.",
    fix: target.providerId === "ollama" ? "ollama serve" : undefined,
    detail,
    url,
  }
}

function httpFailure(target: ConnectionTarget, url: string, status: number, detail: string): ConnectionFailure {
  if (status === 401 || status === 403) {
    // Ollama itself answers 403 to a disallowed Origin (CORS preflight passes through some setups).
    if (target.providerId === "ollama" && !target.apiKey) {
      return { ...corsFailure(target, url, detail), status, title: `Forbidden (${status})` }
    }
    return {
      ok: false,
      kind: "unauthorized",
      title: status === 401 ? "API key required (401)" : "Access denied (403)",
      hint: target.apiKey
        ? "The server rejected the API key. Check it in Settings."
        : "This server needs an API key. Add one in Settings.",
      status,
      detail,
      url,
    }
  }
  if (status === 404) {
    return {
      ok: false,
      kind: "not_found",
      title: "Endpoint not found (404)",
      hint:
        target.providerId === "ollama"
          ? "No /api/tags or /v1/models here. Use the server root (e.g. http://localhost:11434) without a path, and make sure it is Ollama."
          : "No /v1/models here. Use the base URL without /v1 or extra paths, and make sure the server is OpenAI-compatible.",
      status,
      detail,
      url,
    }
  }
  return {
    ok: false,
    kind: "server_error",
    title: `Server error (${status})`,
    hint: "The server answered with an error. Check its logs, then retry.",
    status,
    detail,
    url,
  }
}

type Attempt =
  | { ok: true; models: string[] }
  | { ok: false; status: number; detail: string }
  | { ok: false; network: true; error: unknown }
  | { ok: false; timeout: true }
  | { ok: false; parse: true; detail: string }

function parseModels(path: string, json: any): string[] | null {
  if (path === "/api/tags") {
    if (!json || !Array.isArray(json.models)) return null
    return json.models.map((m: any) => m?.name).filter((n: unknown): n is string => typeof n === "string" && n.length > 0)
  }
  if (!json || !Array.isArray(json.data)) return null
  return json.data.map((m: any) => m?.id).filter((n: unknown): n is string => typeof n === "string" && n.length > 0)
}

async function attempt(
  base: string,
  path: string,
  apiKey: string | undefined,
  timeoutMs: number,
  outer?: AbortSignal,
): Promise<Attempt> {
  const ac = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    ac.abort()
  }, timeoutMs)
  const onOuterAbort = () => ac.abort()
  outer?.addEventListener("abort", onOuterAbort)

  try {
    const headers: Record<string, string> = {}
    // Only send Authorization when needed: it turns the request into a CORS-preflighted one.
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`
    let res: Response
    try {
      res = await fetch(`${base}${path}`, { method: "GET", headers, signal: ac.signal, cache: "no-store" })
    } catch (error) {
      if (timedOut) return { ok: false, timeout: true }
      if (outer?.aborted) throw error
      return { ok: false, network: true, error }
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "")
      return { ok: false, status: res.status, detail: text.slice(0, 300) || res.statusText }
    }
    const json = await res.json().catch(() => null)
    const models = parseModels(path, json)
    if (!models) return { ok: false, parse: true, detail: "Response is not a model list" }
    return { ok: true, models: Array.from(new Set(models)).sort() }
  } finally {
    clearTimeout(timer)
    outer?.removeEventListener("abort", onOuterAbort)
  }
}

/** Resolves when the server accepts a TCP/HTTP connection, regardless of CORS. */
async function reachableIgnoringCors(url: string, timeoutMs: number): Promise<boolean> {
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), timeoutMs)
  try {
    await fetch(url, { method: "GET", mode: "no-cors", signal: ac.signal, cache: "no-store" })
    return true
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

export async function probeConnection(
  target: ConnectionTarget,
  opts: { timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<ConnectionResult> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_PROBE_TIMEOUT_MS
  const raw = target.baseUrl.trim()
  const base = trimSlash(raw)

  let parsed: URL | null = null
  try {
    parsed = new URL(base)
  } catch {
    parsed = null
  }
  if (!parsed || (parsed.protocol !== "http:" && parsed.protocol !== "https:")) {
    return {
      ok: false,
      kind: "invalid_url",
      title: "Invalid URL",
      hint: "Enter a full URL including the scheme, e.g. http://localhost:11434.",
      url: raw,
    }
  }

  if (
    typeof window !== "undefined" &&
    window.location.protocol === "https:" &&
    parsed.protocol === "http:" &&
    !isLoopbackUrl(base)
  ) {
    return {
      ok: false,
      kind: "mixed_content",
      title: "Blocked: insecure URL",
      hint: "This page is served over HTTPS, so the browser blocks plain http:// servers other than localhost. Use https:// or http://localhost.",
      url: base,
    }
  }

  // Native endpoint first, then the other API surface (Ollama also serves /v1/models).
  const paths = target.providerId === "ollama" ? ["/api/tags", "/v1/models"] : ["/v1/models", "/api/tags"]
  const started = typeof performance !== "undefined" ? performance.now() : Date.now()

  const first = await attempt(base, paths[0], target.apiKey, timeoutMs, opts.signal)
  const elapsed = () => Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - started)
  if (first.ok) return { ok: true, models: first.models, endpoint: paths[0], latencyMs: elapsed() }

  const firstUrl = `${base}${paths[0]}`

  if ("timeout" in first) {
    return {
      ok: false,
      kind: "timeout",
      title: "Timed out",
      hint: `No answer within ${Math.round(timeoutMs / 1000)}s. The server may be busy loading a model, or a firewall is dropping the request. Retry in a moment.`,
      url: firstUrl,
    }
  }

  if ("network" in first) {
    const detail = first.error instanceof Error ? first.error.message : String(first.error)
    const reachable = await reachableIgnoringCors(firstUrl, timeoutMs)
    return reachable ? corsFailure(target, firstUrl, detail) : unreachableFailure(target, firstUrl, detail)
  }

  // HTTP error or unexpected body on the primary path: try the fallback surface before giving up.
  if (("status" in first && first.status === 404) || "parse" in first) {
    const second = await attempt(base, paths[1], target.apiKey, timeoutMs, opts.signal)
    if (second.ok) return { ok: true, models: second.models, endpoint: paths[1], latencyMs: elapsed() }
    if ("status" in second && second.status !== 404) {
      return httpFailure(target, `${base}${paths[1]}`, second.status, second.detail)
    }
  }

  if ("parse" in first) {
    return {
      ok: false,
      kind: "bad_response",
      title: "Not a model server",
      hint: "The URL answered, but not with a model list. Check that it points at Ollama or an OpenAI-compatible API.",
      detail: first.detail,
      url: firstUrl,
    }
  }

  return httpFailure(target, firstUrl, first.status, first.detail)
}
