"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Paperclip, Mic } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function ChatComposer() {
  const [message, setMessage] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim()) {
      console.log("Sending message:", message)
      setMessage("")
    }
  }

  return (
    <div className="border-t border-border bg-card p-4">
      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
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

              <Button type="submit" size="icon" className="h-8 w-8" disabled={!message.trim()}>
                <Send className="h-4 w-4" />
              </Button>
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
          <span>{message.length} / 4000</span>
        </div>
      </form>
    </div>
  )
}
