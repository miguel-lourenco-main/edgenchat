"use client"

import type React from "react"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Paperclip, Mic, MicOff, Square, X, FileText } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { addMessage, listMessages, updateMessage } from "@/lib/chat/store"
import { toast } from "@/hooks/use-toast"
import { getAiConfig } from "@/lib/ai/settings"
import { streamChatCompletion } from "@/lib/ai/openai_stream"
import Link from "next/link"
import { Spinner } from "@/components/ui/spinner"
import { useConnection } from "@/components/connection/connection-provider"
import { ConnectionDetails, ModelAvailabilityNotice, sendBlockedReason } from "@/components/connection/connection-status"
import { loadLocalSettings, saveLocalSettings } from "@/lib/settings/local"
import { useSpeechRecognition } from "@/hooks/use-speech-recognition"
import {
  AttachmentError,
  MAX_ATTACHMENTS,
  composeMessageWithAttachments,
  formatBytes,
  readAttachment,
  type ChatAttachment,
} from "@/lib/chat/attachments"

export function ChatComposer({ chatId }: { chatId: string }) {
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  const { settings, state, retry, configured, target } = useConnection()
  const blockedReason = sendBlockedReason(state, configured, settings.ai.model, settings.ai.providerId)
  const [attachments, setAttachments] = useState<ChatAttachment[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const speech = useSpeechRecognition({
    onFinalTranscript: (text) => setMessage((prev) => (prev && !/\s$/.test(prev) ? `${prev} ${text}` : `${prev}${text}`)),
    onError: (description) => toast({ title: "Voice input", description, variant: "destructive" }),
  })

  const addFiles = async (files: FileList | File[]) => {
    const list = Array.from(files)
    const room = MAX_ATTACHMENTS - attachments.length
    if (list.length > room) {
      toast({
        title: "Too many files",
        description: `You can attach up to ${MAX_ATTACHMENTS} files per message.`,
        variant: "destructive",
      })
    }
    const read: ChatAttachment[] = []
    for (const file of list.slice(0, Math.max(0, room))) {
      try {
        read.push(await readAttachment(file))
      } catch (err) {
        toast({
          title: "Could not attach file",
          description: err instanceof AttachmentError ? err.message : `Failed to read ${file.name}.`,
          variant: "destructive",
        })
      }
    }
    if (read.length) setAttachments((prev) => [...prev, ...read].slice(0, MAX_ATTACHMENTS))
  }

  const hasContent = message.trim().length > 0 || attachments.length > 0

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (blockedReason || sending) return
    if (hasContent) {
      const content = composeMessageWithAttachments(message.trim(), attachments)
      if (speech.listening) speech.stop()
      setMessage("")
      setAttachments([])
      void (async () => {
        try {
          const { provider, baseUrl, apiKey, model } = getAiConfig()
          if (!baseUrl || !model || (provider.requiresApiKey && !apiKey)) {
            toast({
              title: "AI not configured",
              description: "Go to Settings and choose provider/model and fill the required fields.",
              variant: "destructive",
            })
            return
          }

          setSending(true)
          const ac = new AbortController()
          setAbortController(ac)
          await addMessage(chatId, "user", content)
          const assistant = await addMessage(chatId, "assistant", "")

          // Build history from stored messages (including the one we just wrote).
          const history = await listMessages(chatId)
          const prompt = history.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          }))

          let acc = ""
          for await (const token of streamChatCompletion({
            baseUrl,
            apiKey,
            model,
            messages: prompt,
            signal: ac.signal,
          })) {
            acc += token
            // Throttle writes a bit (simple char-based throttle)
            if (acc.length % 32 === 0) {
              await updateMessage(assistant.id, { content: acc })
            }
          }
          await updateMessage(assistant.id, { content: acc || "(empty response)" })
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Could not send message."
          const aborted = msg.toLowerCase().includes("aborted") || msg.toLowerCase().includes("abort")
          toast({
            title: aborted ? "Stopped" : "Send failed",
            description: aborted ? "Generation stopped." : msg,
            variant: aborted ? "default" : "destructive",
          })
          // A failed send often means the server went away: refresh the status indicator.
          if (!aborted) retry()
        } finally {
          setSending(false)
          setAbortController(null)
        }
      })()
    }
  }

  return (
    <div className="border-t border-border bg-card p-4">
      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
        {!configured ? (
          <div className="mb-3 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground flex items-center justify-between gap-3">
            <span>AI is not configured. Set up Proxy/Local + model in Settings.</span>
            <Button asChild size="sm" variant="secondary">
              <Link href="/admin">Open Settings</Link>
            </Button>
          </div>
        ) : state.status === "failed" ? (
          <ConnectionDetails state={state} onRetry={retry} baseUrl={target?.baseUrl} showSettingsLink className="mb-3" />
        ) : (
          <ModelAvailabilityNotice
            state={state}
            model={settings.ai.model}
            providerId={settings.ai.providerId}
            onRetry={retry}
            onUseModel={(model) => {
              const s = loadLocalSettings()
              saveLocalSettings({ ...s, ai: { ...s.ai, model } })
            }}
            className="mb-3"
          />
        )}

        <div
          className="relative rounded-lg border border-border bg-background focus-within:border-primary transition-colors"
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes("Files")) e.preventDefault()
          }}
          onDrop={(e) => {
            if (!e.dataTransfer.files.length) return
            e.preventDefault()
            void addFiles(e.dataTransfer.files)
          }}
        >
          {attachments.length > 0 ? (
            <ul className="flex flex-wrap gap-2 px-3 pt-3" aria-label="Attached files">
              {attachments.map((a) => (
                <li
                  key={a.id}
                  className="inline-flex max-w-[16rem] items-center gap-1.5 rounded-md border border-border bg-muted/40 py-1 pl-2 pr-1 text-xs"
                >
                  <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate" title={a.name}>
                    {a.name}
                  </span>
                  <span className="shrink-0 text-muted-foreground">{formatBytes(a.size)}</span>
                  <button
                    type="button"
                    className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label={`Remove ${a.name}`}
                    onClick={() => setAttachments((prev) => prev.filter((x) => x.id !== a.id))}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            data-testid="composer-file-input"
            onChange={(e) => {
              const files = e.target.files
              if (files?.length) void addFiles(files)
              // Reset so picking the same file again still fires onChange.
              e.target.value = ""
            }}
          />
          <Textarea
            value={speech.interim ? `${message}${message && !/\s$/.test(message) ? " " : ""}${speech.interim}` : message}
            readOnly={speech.listening && !!speech.interim}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Send a message... (/ for commands, @ to mention)"
            className="min-h-[80px] resize-none border-0 bg-transparent text-foreground placeholder:text-muted-foreground p-4 pr-12 focus-visible:ring-0 focus-visible:ring-offset-0"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
          />

          <div className="absolute bottom-3 right-3 flex items-center gap-1">
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label="Attach text files"
                    disabled={attachments.length >= MAX_ATTACHMENTS}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Attach text files (or drop them here)</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  {/* A disabled button gets no pointer events, so the span carries the tooltip. */}
                  <span tabIndex={speech.supported ? -1 : 0} className="inline-flex">
                    <Button
                      type="button"
                      variant={speech.listening ? "destructive" : "ghost"}
                      size="icon"
                      className="h-8 w-8"
                      disabled={!speech.supported}
                      aria-pressed={speech.listening}
                      aria-label={speech.listening ? "Stop voice input" : "Start voice input"}
                      onClick={speech.toggle}
                    >
                      {speech.listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {!speech.supported
                    ? "Voice input is not supported in this browser"
                    : speech.listening
                      ? "Stop voice input"
                      : "Voice input"}
                </TooltipContent>
              </Tooltip>

              {sending ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8"
                      onClick={() => abortController?.abort()}
                    >
                      <Square className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Stop generating</TooltipContent>
                </Tooltip>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    {/* A disabled button gets no pointer events, so the span carries the tooltip. */}
                    <span tabIndex={blockedReason ? 0 : -1} className="inline-flex" data-testid="send-button-wrapper">
                      <Button
                        type="submit"
                        size="icon"
                        className="h-8 w-8"
                        disabled={!hasContent || !!blockedReason}
                        aria-label={blockedReason ?? "Send message"}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{blockedReason ?? (hasContent ? "Send message" : "Type a message to send")}</TooltipContent>
                </Tooltip>
              )}
            </TooltipProvider>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between px-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
              <span className="text-xs">↵</span>
            </kbd>
            <span>to send</span>
            <span className="text-border">•</span>
            <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
              <span className="text-xs">⇧</span>
              <span className="text-xs">↵</span>
            </kbd>
            <span>for new line</span>
          </div>
          <div className="flex items-center gap-2">
            {speech.listening ? (
              <span className="inline-flex items-center gap-1 text-destructive" role="status">
                <span className="size-2 animate-pulse rounded-full bg-destructive" /> listening…
              </span>
            ) : null}
            {sending ? (
              <span className="inline-flex items-center gap-1">
                <Spinner className="size-3" /> generating…
              </span>
            ) : null}
            <span>{message.length} / 4000</span>
          </div>
        </div>
      </form>
    </div>
  )
}
