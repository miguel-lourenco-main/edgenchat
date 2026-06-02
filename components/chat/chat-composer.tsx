"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Paperclip, Mic, Square } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { addMessage, listMessages, updateMessage } from "@/lib/chat/store"
import { toast } from "@/hooks/use-toast"
import { getAiConfig } from "@/lib/ai/settings"
import { streamChatCompletion } from "@/lib/ai/openai_stream"
import Link from "next/link"
import { Spinner } from "@/components/ui/spinner"

export function ChatComposer({ chatId }: { chatId: string }) {
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [abortController, setAbortController] = useState<AbortController | null>(null)

  // Persists the user turn, streams the assistant reply into IndexedDB, and
  // supports mid-generation abort via AbortController.
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim()) {
      const content = message.trim()
      setMessage("")
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
        } finally {
          setSending(false)
          setAbortController(null)
        }
      })()
    }
  }

  const { provider, baseUrl, apiKey, model } = getAiConfig()
  const aiReady = !!baseUrl && !!model && (!provider.requiresApiKey || !!apiKey)

  return (
    <div className="border-t border-border bg-card p-4">
      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
        {!aiReady && (
          <div className="mb-3 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground flex items-center justify-between gap-3">
            <span>AI is not configured. Set up Proxy/Local + model in Settings.</span>
            <Button asChild size="sm" variant="secondary">
              <Link href="/admin">Open Settings</Link>
            </Button>
          </div>
        )}

        <div className="relative rounded-lg border border-border bg-background focus-within:border-primary transition-colors">
          <Textarea
            value={message}
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
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                    <Paperclip className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Attach files</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                    <Mic className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Voice input</TooltipContent>
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
                <Button type="submit" size="icon" className="h-8 w-8" disabled={!message.trim() || !aiReady}>
                  <Send className="h-4 w-4" />
                </Button>
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
