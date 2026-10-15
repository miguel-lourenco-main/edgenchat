"use client"

import { useState } from "react"
import Link from "next/link"
import { AlertTriangle, Check, Copy, ExternalLink, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import { isModelMissing, type ConnectionState } from "@/hooks/use-connection-probe"
import type { AiProviderId } from "@/lib/ai/catalog"

const OLLAMA_LIBRARY_URL = "https://ollama.com/library"
const SUGGESTED_PULL = "ollama pull llama3.2"

/** Short label for the indicator pill. */
export function connectionLabel(state: ConnectionState) {
  switch (state.status) {
    case "idle":
      return "Not configured"
    case "checking":
      return "Checking…"
    case "connected":
      return `Connected · ${state.models.length} ${state.models.length === 1 ? "model" : "models"}`
    case "failed":
      return state.failure.title
  }
}

/**
 * Why sending is not possible right now, or null when it is.
 * Used as the tooltip on the disabled send button.
 */
export function sendBlockedReason(state: ConnectionState, configured: boolean, model: string, providerId: AiProviderId) {
  if (!configured || state.status === "idle") return "Configure a provider and model in Settings first"
  if (state.status === "checking") return "Checking the connection…"
  if (state.status === "failed") return `Not connected: ${state.failure.title}`
  if (state.models.length === 0) return "No models available on this server"
  // Ollama answers 404 for a model it does not have; OpenAI-compatible lists can omit aliases, so only warn there.
  if (providerId === "ollama" && isModelMissing(state, model)) return `Model ${model.trim()} is not installed`
  return null
}

function StatusDot({ state }: { state: ConnectionState }) {
  if (state.status === "checking") return <Spinner className="size-3 text-muted-foreground" aria-hidden />
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-2 rounded-full",
        state.status === "connected" && "bg-green-500",
        state.status === "failed" && "bg-destructive",
        state.status === "idle" && "bg-muted-foreground/50",
      )}
    />
  )
}

function CopyableCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="mt-2 flex items-start gap-1 rounded bg-background/60 border border-border">
      <pre className="flex-1 overflow-x-auto p-2 text-[11px] leading-relaxed">
        <code>{code}</code>
      </pre>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        aria-label="Copy command"
        onClick={() => {
          void navigator.clipboard?.writeText(code).then(() => {
            setCopied(true)
            setTimeout(() => setCopied(false), 1500)
          })
        }}
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    </div>
  )
}

/** Full status panel: headline, one-line guidance, copyable fix, retry. */
export function ConnectionDetails({
  state,
  onRetry,
  baseUrl,
  showSettingsLink = false,
  className,
}: {
  state: ConnectionState
  onRetry: () => void
  baseUrl?: string
  showSettingsLink?: boolean
  className?: string
}) {
  const tone =
    state.status === "connected"
      ? "border-green-500/30 bg-green-500/5"
      : state.status === "failed"
        ? "border-destructive/30 bg-destructive/5"
        : "border-border bg-muted/30"

  return (
    <div className={cn("rounded-md border p-3 text-sm", tone, className)} data-testid="connection-details" data-status={state.status}>
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium inline-flex items-center gap-2">
          <StatusDot state={state} />
          {connectionLabel(state)}
        </p>
        {state.status !== "idle" ? (
          <Button type="button" variant="outline" size="sm" className="h-7" onClick={onRetry} disabled={state.status === "checking"}>
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        ) : null}
      </div>

      {baseUrl ? (
        <p className="mt-1 text-xs text-muted-foreground break-all">
          <code>{baseUrl}</code>
        </p>
      ) : null}

      {state.status === "idle" ? (
        <p className="mt-1 text-muted-foreground">Set a Base URL to check the connection.</p>
      ) : null}

      {state.status === "connected" ? (
        <p className="mt-1 text-xs text-muted-foreground">
          <code>{state.endpoint}</code> answered in {state.latencyMs}ms.
        </p>
      ) : null}

      {state.status === "failed" ? (
        <>
          <p className="mt-1 text-muted-foreground">{state.failure.hint}</p>
          {state.failure.fix ? <CopyableCode code={state.failure.fix} /> : null}
          {state.failure.detail ? (
            <p className="mt-2 text-[11px] text-muted-foreground/80 break-all">
              {state.failure.url} → {state.failure.detail}
            </p>
          ) : null}
        </>
      ) : null}

      {showSettingsLink ? (
        <Button asChild variant="link" size="sm" className="mt-1 h-auto px-0">
          <Link href="/admin">Open Settings</Link>
        </Button>
      ) : null}
    </div>
  )
}

/** Flags an empty model list or a selected model the server does not have. */
export function ModelAvailabilityNotice({
  state,
  model,
  providerId,
  onUseModel,
  onRetry,
  className,
}: {
  state: ConnectionState
  model: string
  providerId: AiProviderId
  onUseModel?: (model: string) => void
  onRetry?: () => void
  className?: string
}) {
  if (state.status !== "connected") return null

  if (state.models.length === 0) {
    return (
      <div className={cn("rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm", className)} data-testid="no-models">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium inline-flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" /> Connected, but no models are installed
          </p>
          {onRetry ? (
            <Button type="button" variant="outline" size="sm" className="h-7" onClick={onRetry}>
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </Button>
          ) : null}
        </div>
        {providerId === "ollama" ? (
          <>
            <p className="mt-1 text-muted-foreground">
              Download one with <code>ollama pull</code>, then retry.{" "}
              <a className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline" href={OLLAMA_LIBRARY_URL} target="_blank" rel="noreferrer">
                Browse models <ExternalLink className="h-3 w-3" />
              </a>
            </p>
            <CopyableCode code={SUGGESTED_PULL} />
          </>
        ) : (
          <p className="mt-1 text-muted-foreground">The server's model list is empty. Check its configuration.</p>
        )}
      </div>
    )
  }

  if (!isModelMissing(state, model)) return null
  const suggestion = state.models[0]
  return (
    <div className={cn("rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm", className)} data-testid="model-missing">
      <p className="font-medium inline-flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-500" /> Model <code>{model}</code> is not available on this server
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-muted-foreground">
        {providerId === "ollama" ? (
          <span>
            Install it with <code>ollama pull {model}</code> or pick another model.
          </span>
        ) : (
          <span>Pick one of the server's models.</span>
        )}
        {onUseModel && suggestion ? (
          <Button type="button" variant="secondary" size="sm" className="h-7" onClick={() => onUseModel(suggestion)}>
            Use {suggestion}
          </Button>
        ) : null}
      </div>
    </div>
  )
}

/** Compact indicator for the chat top bar; opens the full details in a popover. */
export function ConnectionBadge({
  state,
  onRetry,
  baseUrl,
  modelMissing = false,
}: {
  state: ConnectionState
  onRetry: () => void
  baseUrl?: string
  modelMissing?: boolean
}) {
  const warn = state.status === "connected" && (modelMissing || state.models.length === 0)
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-testid="connection-badge"
          data-status={state.status}
          aria-label={`Connection status: ${connectionLabel(state)}`}
          className={cn(
            "inline-flex h-9 max-w-[220px] items-center gap-2 rounded-md border px-3 text-xs font-medium transition-colors hover:bg-muted/40",
            state.status === "failed" ? "border-destructive/40 text-destructive" : "border-border text-muted-foreground",
          )}
        >
          <StatusDot state={state} />
          <span className="truncate">{connectionLabel(state)}</span>
          {warn ? <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" /> : null}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-96 p-2">
        <ConnectionDetails state={state} onRetry={onRetry} baseUrl={baseUrl} showSettingsLink className="border-0 bg-transparent" />
      </PopoverContent>
    </Popover>
  )
}
