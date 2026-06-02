"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Search, Plus, Pin, Folder, MessageSquare, MoreHorizontal, ChevronRight, ChevronDown, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import type { ChatThread } from "@/lib/chat/types"
import { createChat, deleteChat, listChats, renameChat } from "@/lib/chat/store"
import { toast } from "@/hooks/use-toast"

interface ChatSidebarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedChatId: string
  onSelectChat: (id: string) => void
  onNewChat: () => void
  onDeleteCurrentChat?: () => Promise<void> | void
  onDeleteOtherChats?: () => Promise<void> | void
  onDeleteAllChats?: () => Promise<void> | void
  compact?: boolean
}

function relativeTime(ts: number) {
  const diff = Date.now() - ts
  const min = Math.floor(diff / 60000)
  if (min < 1) return "just now"
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  const d = Math.floor(hr / 24)
  return `${d}d ago`
}

export function ChatSidebar({
  open,
  onOpenChange,
  selectedChatId,
  onSelectChat,
  onNewChat,
  onDeleteCurrentChat,
  onDeleteOtherChats,
  onDeleteAllChats,
  compact,
}: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedFolders, setExpandedFolders] = useState<string[]>(["folder-1"])
  const [expandedSections, setExpandedSections] = useState<string[]>(["today", "yesterday"])
  const [chats, setChats] = useState<ChatThread[]>([])
  // Folder grouping is UI-only for now; chats are flat in IndexedDB.
  const folders: Array<{
    id: string
    name: string
    chats: Array<{ id: string; title: string; timestamp: string }>
  }> = []

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => (prev.includes(folderId) ? prev.filter((id) => id !== folderId) : [...prev, folderId]))
  }

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => (prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]))
  }

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const next = await listChats()
        if (!mounted) return
        setChats(next)
      } catch (err) {
        toast({
          title: "Storage error",
          description: err instanceof Error ? err.message : "Could not load chats.",
          variant: "destructive",
        })
      }
    }
    void load()

    const onRefresh = () => void load()
    window.addEventListener("edgen-chat:refresh", onRefresh)
    window.addEventListener("storage", (e) => {
      if (e.key === "edgen-chat:refresh") onRefresh()
    })
    return () => {
      mounted = false
      window.removeEventListener("edgen-chat:refresh", onRefresh)
    }
  }, [])

  const filteredChats = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return chats
    return chats.filter((c) => c.title.toLowerCase().includes(q))
  }, [chats, searchQuery])

  if (!open) return null

  // Auth removed; footer shows a static local-user placeholder.
  const userEmail = "local@example.com"
  const userName = "Local User"
  const initials = "LU"

  return (
    <div className={cn("flex h-full w-full min-w-0 flex-col border-r border-border bg-card")}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-4">
        <h2 className="text-sm font-semibold">Chats</h2>
        {onDeleteCurrentChat || onDeleteOtherChats || onDeleteAllChats ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-white">
                <Trash2 className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onDeleteCurrentChat ? (
                <DropdownMenuItem
                  disabled={!selectedChatId}
                  onSelect={async () => {
                    await onDeleteCurrentChat()
                  }}
                >
                  Delete this chat
                </DropdownMenuItem>
              ) : null}
              {onDeleteOtherChats ? (
                <DropdownMenuItem
                  disabled={!selectedChatId}
                  onSelect={async () => {
                    await onDeleteOtherChats()
                  }}
                >
                  Delete other chats
                </DropdownMenuItem>
              ) : null}
              {onDeleteAllChats ? (
                <>
                  {onDeleteCurrentChat || onDeleteOtherChats ? <DropdownMenuSeparator /> : null}
                  <DropdownMenuItem
                    onSelect={async () => {
                      await onDeleteAllChats()
                    }}
                  >
                    Delete all chats
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      {/* Search */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-background"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-2 space-y-1">
            {/* Pinned Section (coming later) */}
            <div className="mb-4">
              <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground">
                <Pin className="h-3.5 w-3.5" />
                Pinned
              </div>
              <div className="px-2 py-2 text-xs text-muted-foreground">No pinned chats</div>
            </div>

            {/* Folders */}
            {folders.length > 0 &&
              folders.map((folder) => (
                <div key={folder.id} className="mb-2">
                  <button
                    onClick={() => toggleFolder(folder.id)}
                    className="flex w-full items-center gap-2 px-2 py-1.5 text-sm text-foreground hover:bg-accent rounded-md transition-colors"
                  >
                    {expandedFolders.includes(folder.id) ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <Folder className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 text-left">{folder.name}</span>
                    <span className="text-xs text-muted-foreground">{folder.chats.length}</span>
                  </button>
                  {expandedFolders.includes(folder.id) && (
                    <div className="ml-6 space-y-1 mt-1">
                      {folder.chats.map((chat) => (
                        <ChatItem
                          key={chat.id}
                          chat={chat}
                          selected={selectedChatId === chat.id}
                          onSelect={() => onSelectChat(chat.id)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}

            <Separator className="my-2" />

            {/* Today */}
            <div className="mb-2">
              <button
                onClick={() => toggleSection("today")}
                className="flex w-full items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {expandedSections.includes("today") ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
                Today
              </button>
              {expandedSections.includes("today") && (
                <div className="space-y-1 mt-1">
                  {filteredChats.map((chat) => (
                    <ChatItem
                      key={chat.id}
                      chat={{ id: chat.id, title: chat.title, timestamp: relativeTime(chat.updatedAt) }}
                      selected={selectedChatId === chat.id}
                      onSelect={() => onSelectChat(chat.id)}
                      onRename={async () => {
                        const title = window.prompt("Rename chat", chat.title)
                        if (!title) return
                        await renameChat(chat.id, title)
                      }}
                      onDelete={async () => {
                        const ok = window.confirm("Delete this chat? This cannot be undone.")
                        if (!ok) return
                        await deleteChat(chat.id)
                        if (selectedChatId === chat.id) {
                          const created = await createChat()
                          onSelectChat(created.id)
                        }
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Yesterday */}
            <div className="mb-2">
              <button
                onClick={() => toggleSection("yesterday")}
                className="flex w-full items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {expandedSections.includes("yesterday") ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
                Yesterday
              </button>
              {expandedSections.includes("yesterday") && (
                <div className="space-y-1 mt-1">
                  <div className="px-2 py-2 text-xs text-muted-foreground">Grouped history coming next</div>
                </div>
              )}
            </div>

            {/* Previous 7 Days */}
            <div>
              <button
                onClick={() => toggleSection("previous7days")}
                className="flex w-full items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {expandedSections.includes("previous7days") ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
                Previous 7 Days
              </button>
              {expandedSections.includes("previous7days") && (
                <div className="space-y-1 mt-1">
                  <div className="px-2 py-2 text-xs text-muted-foreground">Grouped history coming next</div>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* User Footer */}
      <div className="border-t border-border p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-start h-auto p-2 text-foreground hover:bg-accent/20 dark:hover:bg-accent/20"
            >
              <Avatar className="h-8 w-8 mr-2">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 text-left text-foreground">
                <p className="text-sm font-medium">{userName}</p>
                <p className="text-xs truncate">{userEmail}</p>
              </div>
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem asChild>
              <a href="/admin">Settings</a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onSelect={() => {
                window.location.href = "/auth"
              }}
            >
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

interface ChatItemProps {
  chat: { id: string; title: string; timestamp: string }
  selected: boolean
  onSelect: () => void
  onRename?: () => void
  onDelete?: () => void
}

function ChatItem({ chat, selected, onSelect, onRename, onDelete }: ChatItemProps) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "group flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors",
        selected ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-accent/65",
      )}
    >
      <MessageSquare className="h-4 w-4 shrink-0 group-hover:text-white" />
      <div className="flex-1 overflow-hidden text-left group-hover:text-white">
        <p className="truncate font-medium">{chat.title}</p>
        <p className={cn("text-xs", selected ? "text-white" : "")}>{chat.timestamp}</p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 group-hover:text-white">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onRename} disabled={!onRename}>
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem>Pin</DropdownMenuItem>
          <DropdownMenuItem>Move to folder</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onDelete} disabled={!onDelete} className="text-destructive">
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </button>
  )
}
