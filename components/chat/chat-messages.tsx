"use client"

import { Button } from "@/components/ui/button"
import { Copy, Check, ThumbsUp, ThumbsDown, RotateCcw } from "lucide-react"
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import type { ChatMessage } from "@/lib/chat/types"
import { listMessages } from "@/lib/chat/store"
import { toast } from "@/hooks/use-toast"
import { Spinner } from "@/components/ui/spinner"
import { Skeleton } from "@/components/ui/skeleton"

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

export function ChatMessages({
  chatId,
}: {
  chatId: string
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [stickToBottom, setStickToBottom] = useState(true)
  const stickToBottomRef = useRef(true)
  const initialMessageIdsRef = useRef<Set<string> | null>(null)
  const sessionStartedAtRef = useRef<number>(Date.now())

  useEffect(() => {
    stickToBottomRef.current = stickToBottom
  }, [stickToBottom])

  useEffect(() => {
    let mounted = true
    // Reset per chat. We'll populate this once from the first load for this chatId.
    initialMessageIdsRef.current = null
    sessionStartedAtRef.current = Date.now()
    void (async () => {
      try {
        const msgs = await listMessages(chatId)
        if (!mounted) return
        if (initialMessageIdsRef.current === null) {
          initialMessageIdsRef.current = new Set(msgs.map((m) => m.id))
        }
        setMessages(msgs)
      } catch (err) {
        toast({
          title: "Storage error",
          description: err instanceof Error ? err.message : "Could not load messages.",
          variant: "destructive",
        })
      }
    })()
    return () => {
      mounted = false
    }
  }, [chatId])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "edgen-chat:refresh") {
        void listMessages(chatId).then(setMessages).catch(() => {})
      }
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [chatId])

  useEffect(() => {
    const onRefresh = () => {
      void listMessages(chatId).then(setMessages).catch(() => {})
    }
    window.addEventListener("edgen-chat:refresh", onRefresh)
    return () => window.removeEventListener("edgen-chat:refresh", onRefresh)
  }, [chatId])

  // Track whether user is near the bottom; only auto-scroll when they are.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => {
      const remaining = el.scrollHeight - el.scrollTop - el.clientHeight
      setStickToBottom(remaining < 80)
    }
    el.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => el.removeEventListener("scroll", onScroll as any)
  }, [])

  // Keep up with new content while user is at/near bottom.
  useLayoutEffect(() => {
    if (!stickToBottom) return
    bottomRef.current?.scrollIntoView({ block: "end" })
  }, [messages, stickToBottom])

  // Also keep up with layout growth caused by streaming / typewriter (message content changes without `messages` array changing).
  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    if (typeof ResizeObserver === "undefined") return
    let raf = 0
    const ro = new ResizeObserver(() => {
      if (!stickToBottomRef.current) return
      if (raf) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ block: "end" })
      })
    })
    ro.observe(el)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [])

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto px-4">
      <div ref={contentRef} className="mx-auto max-w-3xl py-8 space-y-6">
        {messages.map((message, idx) => (
          <MessageItem
            key={message.id}
            message={message}
            isLast={idx === messages.length - 1}
            fromInitialLoad={initialMessageIdsRef.current?.has(message.id) ?? true}
            sessionStartedAt={sessionStartedAtRef.current}
          />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

function useTypewriterText(
  resetKey: string,
  fullText: string,
  opts?: { tickMs?: number },
) {
  // Strict "letter-by-letter" (grapheme-by-grapheme) typing:
  // exactly 1 visible grapheme per tick, no catch-up acceleration.
  const tickMs = opts?.tickMs ?? 4
  const [visibleCount, setVisibleCount] = useState(0)

  const graphemes = useMemo(() => {
    // Grapheme-safe splitting prevents "tofu"/block glyphs caused by slicing in the middle of
    // surrogate pairs / emoji sequences / combined marks during streaming.
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Seg = (Intl as any)?.Segmenter as
        | (new (locales?: string | string[], options?: { granularity: "grapheme" }) => {
            segment: (input: string) => Iterable<{ segment: string }>
          })
        | undefined
      if (Seg) {
        const segmenter = new Seg(undefined, { granularity: "grapheme" })
        return Array.from(segmenter.segment(fullText), (x) => x.segment)
      }
    } catch {
      // Fall through to code-point splitting.
    }
    return Array.from(fullText)
  }, [fullText])
  const totalCount = graphemes.length

  // Reset only when the message identity changes (NOT on every streamed update).
  useEffect(() => {
    setVisibleCount(0)
  }, [resetKey])

  // Never let visibleLen exceed the currently available text (guards against any out-of-order updates).
  useEffect(() => {
    setVisibleCount((v) => Math.min(v, totalCount))
  }, [totalCount])

  // Smoothly advance toward fullText length.
  useEffect(() => {
    if (visibleCount >= totalCount) return
    const t = window.setTimeout(() => {
      setVisibleCount((v) => Math.min(totalCount, v + 1))
    }, tickMs)
    return () => window.clearTimeout(t)
  }, [visibleCount, totalCount, tickMs])

  return {
    text: graphemes.slice(0, visibleCount).join(""),
    visibleCount,
    totalCount,
  }
}

function renderMessageContent(text: string) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none">
      {text.split("\n").map((line, i) => {
        if (line.startsWith("```")) {
          return null // Code blocks handled separately
        }
        if (line.startsWith("## ")) {
          return (
            <h2 key={i} className="text-base font-semibold mt-4 mb-2">
              {line.replace("## ", "")}
            </h2>
          )
        }
        if (line.startsWith("`") && line.endsWith("`")) {
          return (
            <code key={i} className="bg-background/50 px-1.5 py-0.5 rounded text-sm font-mono">
              {line.slice(1, -1)}
            </code>
          )
        }
        if (line.trim().startsWith("-")) {
          return (
            <li key={i} className="ml-4">
              {line.replace(/^-\s*/, "")}
            </li>
          )
        }
        if (line.includes("```tsx") || line.includes("```typescript")) {
          const codeMatch = text.match(/```(?:tsx|typescript)\n([\s\S]*?)```/)
          if (codeMatch) {
            return (
              <pre key={i} className="bg-background rounded-md p-4 my-3 overflow-x-auto">
                <code className="text-sm font-mono">{codeMatch[1]}</code>
              </pre>
            )
          }
        }
        return line ? (
          <p key={i} className="leading-relaxed">
            {line}
          </p>
        ) : (
          <br key={i} />
        )
      })}
    </div>
  )
}

const ANIMATED_ASSISTANT_MESSAGE_IDS = new Set<string>()

function MessageItem({
  message,
  isLast,
  fromInitialLoad,
  sessionStartedAt,
}: {
  message: ChatMessage
  isLast: boolean
  fromInitialLoad: boolean
  sessionStartedAt: number
}) {
  const [copied, setCopied] = useState(false)
  const [settled, setSettled] = useState(false)
  const [animate, setAnimate] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const isAssistant = message.role === "assistant"
  const isUser = message.role === "user"
  const isThinking = isAssistant && isLast && message.content.trim().length === 0
  // Determine "new message" in a race-proof way:
  // - Prefer initial-load membership (history), but fall back to createdAt vs when this chat UI mounted
  //   so we still animate if the initial load races with the first streamed tokens.
  const isNewInThisSession = message.createdAt >= sessionStartedAt
  const canAnimateThisMessage = isAssistant && isLast && (!fromInitialLoad || isNewInThisSession)
  // Important: don't depend on `animate` here, otherwise the first streamed chunk can render "in a block"
  // before `animate` flips true on the next effect tick.
  const showTypewriter = canAnimateThisMessage && !isThinking && message.content.trim().length > 0
  const typewriter = useTypewriterText(message.id, message.content, { tickMs: 10 })
  const contentToRender = showTypewriter ? typewriter.text : message.content

  // Consider an assistant message "fully rendered" only after:
  // - the typewriter caught up, and
  // - content has stopped changing for a short window (stream finished).
  useEffect(() => {
    if (!showTypewriter) {
      setSettled(true)
      return
    }
    setSettled(false)
    const t = window.setTimeout(() => setSettled(true), 650)
    return () => window.clearTimeout(t)
  }, [showTypewriter, message.content])

  // Typewriter should only apply to newly-generated assistant messages:
  // - messages that were NOT present in the initial load for this chat (new in this session)
  // - and only once per message id for this session.
  useEffect(() => {
    if (!isAssistant || !isLast) return

    if (!canAnimateThisMessage) {
      setAnimate(false)
      return
    }

    if (ANIMATED_ASSISTANT_MESSAGE_IDS.has(message.id)) {
      setAnimate(false)
      return
    }

    // Enable as soon as any content exists (even if the message first appears already non-empty).
    if (message.content.trim().length > 0) {
      setAnimate(true)
    }
  }, [canAnimateThisMessage, isAssistant, isLast, message.content, message.id])

  const isFullyRendered = useMemo(() => {
    if (isUser) return true
    if (!isAssistant) return true
    if (isThinking) return false
    if (!showTypewriter) return true
    return settled && typewriter.visibleCount >= typewriter.totalCount
  }, [isAssistant, isThinking, isUser, settled, showTypewriter, typewriter.totalCount, typewriter.visibleCount])

  useEffect(() => {
    if (!isAssistant) return
    if (ANIMATED_ASSISTANT_MESSAGE_IDS.has(message.id)) return
    if (isFullyRendered) {
      ANIMATED_ASSISTANT_MESSAGE_IDS.add(message.id)
      setAnimate(false)
    }
  }, [isAssistant, isFullyRendered, message.id])

  return (
    <div className={cn("group w-full", isUser ? "flex justify-end" : "flex justify-start")}>
      <div className={cn("flex items-start gap-3 w-full", isUser ? "flex-row-reverse" : "flex-row")}>
        <div className={cn("space-y-2", isUser ? "max-w-[78%] flex flex-col items-end" : "flex-1")}>
        {/* Bubble for user only (OpenAI-like); assistant is plain */}
        {isUser ? (
          <div className="rounded-2xl bg-primary text-primary-foreground px-4 py-3">
            {renderMessageContent(message.content)}
          </div>
        ) : (
          <div className="text-foreground">
            {isThinking ? (
              <div className="space-y-3 py-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Spinner className="size-4" />
                  <span>Thinking…</span>
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[85%]" />
                  <Skeleton className="h-4 w-[72%]" />
                  <Skeleton className="h-4 w-[66%]" />
                </div>
              </div>
            ) : (
              renderMessageContent(contentToRender)
            )}
          </div>
        )}

        {/* Actions + timestamp only after the message is fully rendered */}
        {isAssistant && isFullyRendered ? (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy}>
              {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <ThumbsUp className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <ThumbsDown className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : null}

        {isFullyRendered ? <span className="text-xs text-muted-foreground px-1">{formatTime(message.createdAt)}</span> : null}
        </div>
      </div>
    </div>
  )
}
