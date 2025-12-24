"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Copy, Check, ThumbsUp, ThumbsDown, RotateCcw } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: string
}

const sampleMessages: Message[] = [
  {
    id: "1",
    role: "user",
    content: "Can you help me design a modern UI for a self-hosted AI chat application?",
    timestamp: "10:30 AM",
  },
  {
    id: "2",
    role: "assistant",
    content: `I'd be happy to help you design a modern UI for a self-hosted AI chat application! Here's a comprehensive approach:

## Key Design Principles

1. **Dark Mode First**: Use deep blacks with subtle elevation for cards
2. **Clean Typography**: Stick to system fonts for performance
3. **Accessible**: Ensure proper contrast and keyboard navigation
4. **Responsive**: Mobile-first approach with desktop enhancements

## Layout Structure

\`\`\`typescript
interface AppLayout {
  navRail: 'icon-only' | 'full';
  sidebar: 'chat-list' | 'collapsed';
  main: 'conversation' | 'workspace';
}
\`\`\`

Would you like me to elaborate on any specific area?`,
    timestamp: "10:31 AM",
  },
  {
    id: "3",
    role: "user",
    content: "Yes, can you show me how to implement the sidebar with folders and pinned chats?",
    timestamp: "10:32 AM",
  },
  {
    id: "4",
    role: "assistant",
    content: `Here's a comprehensive sidebar implementation with folders and pinned chats:

\`\`\`tsx
export function ChatSidebar() {
  const [expandedFolders, setExpandedFolders] = useState<string[]>([])
  
  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <SearchInput />
      
      {/* Pinned Chats */}
      <PinnedSection chats={pinnedChats} />
      
      {/* Folders */}
      <FolderList 
        folders={folders}
        expanded={expandedFolders}
        onToggle={setExpandedFolders}
      />
    </div>
  )
}
\`\`\`

The key features include:
- Collapsible folders with expand/collapse animations
- Pinned chats always visible at the top
- Time-based grouping (Today, Yesterday, etc.)
- Context menus for quick actions`,
    timestamp: "10:33 AM",
  },
]

export function ChatMessages({ chatId }: { chatId: string }) {
  return (
    <ScrollArea className="flex-1 px-4">
      <div className="mx-auto max-w-3xl py-8 space-y-6">
        {sampleMessages.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}
      </div>
    </ScrollArea>
  )
}

function MessageItem({ message }: { message: Message }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={cn("group flex gap-4", message.role === "user" ? "flex-row-reverse" : "flex-row")}>
      <Avatar className={cn("h-8 w-8 shrink-0", message.role === "user" ? "order-2" : "order-1")}>
        <AvatarFallback
          className={cn(
            "text-xs font-medium",
            message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
          )}
        >
          {message.role === "user" ? "JD" : "AI"}
        </AvatarFallback>
      </Avatar>

      <div className={cn("flex-1 space-y-2", message.role === "user" ? "order-1 flex flex-col items-end" : "order-2")}>
        <div
          className={cn(
            "rounded-lg px-4 py-3",
            message.role === "user" ? "bg-primary text-primary-foreground ml-12" : "bg-muted text-foreground mr-12",
          )}
        >
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {message.content.split("\n").map((line, i) => {
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
                const codeMatch = message.content.match(/```(?:tsx|typescript)\n([\s\S]*?)```/)
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
        </div>

        {message.role === "assistant" && (
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
        )}

        <span className="text-xs text-muted-foreground px-1">{message.timestamp}</span>
      </div>
    </div>
  )
}
