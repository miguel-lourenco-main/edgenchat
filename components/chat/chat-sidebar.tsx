"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Search, Plus, Pin, Folder, MessageSquare, MoreHorizontal, ChevronRight, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface ChatSidebarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedChatId: string
  onSelectChat: (id: string) => void
  onNewChat: () => void
  compact?: boolean
}

// Sample data
const pinnedChats = [
  { id: "chat-pinned-1", title: "API Integration Guide", timestamp: "2m ago" },
  { id: "chat-pinned-2", title: "Database Schema Design", timestamp: "1h ago" },
]

const folders = [
  {
    id: "folder-1",
    name: "Projects",
    chats: [
      { id: "chat-2", title: "Next.js App Router Migration", timestamp: "3h ago" },
      { id: "chat-3", title: "Tailwind CSS Setup", timestamp: "Yesterday" },
    ],
  },
  {
    id: "folder-2",
    name: "Research",
    chats: [{ id: "chat-4", title: "LLM Comparison Analysis", timestamp: "2d ago" }],
  },
]

const recentChats = {
  today: [
    { id: "chat-1", title: "Open WebUI Design System", timestamp: "5m ago" },
    { id: "chat-5", title: "React Server Components", timestamp: "2h ago" },
  ],
  yesterday: [
    { id: "chat-6", title: "TypeScript Best Practices", timestamp: "Yesterday" },
    { id: "chat-7", title: "Supabase Auth Setup", timestamp: "Yesterday" },
  ],
  previous7days: [
    { id: "chat-8", title: "Performance Optimization", timestamp: "3d ago" },
    { id: "chat-9", title: "Docker Configuration", timestamp: "5d ago" },
  ],
}

export function ChatSidebar({
  open,
  onOpenChange,
  selectedChatId,
  onSelectChat,
  onNewChat,
  compact,
}: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [expandedFolders, setExpandedFolders] = useState<string[]>(["folder-1"])
  const [expandedSections, setExpandedSections] = useState<string[]>(["today", "yesterday"])

  const toggleFolder = (folderId: string) => {
    setExpandedFolders((prev) => (prev.includes(folderId) ? prev.filter((id) => id !== folderId) : [...prev, folderId]))
  }

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => (prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]))
  }

  if (!open) return null

  return (
    <div className={cn("flex h-full w-full min-w-0 flex-col border-r border-border bg-card")}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-4">
        <h2 className="text-sm font-semibold">Chats</h2>
        {/* New chat action is in the topbar to avoid duplicates */}
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
            {/* Pinned Section */}
            {pinnedChats.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground">
                  <Pin className="h-3.5 w-3.5" />
                  Pinned
                </div>
                {pinnedChats.map((chat) => (
                  <ChatItem
                    key={chat.id}
                    chat={chat}
                    selected={selectedChatId === chat.id}
                    onSelect={() => onSelectChat(chat.id)}
                  />
                ))}
              </div>
            )}

            {/* Folders */}
            {folders.map((folder) => (
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
                  {recentChats.today.map((chat) => (
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
                  {recentChats.yesterday.map((chat) => (
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
                  {recentChats.previous7days.map((chat) => (
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
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">JD</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium">John Doe</p>
                <p className="text-xs text-muted-foreground truncate">john@example.com</p>
              </div>
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">Sign Out</DropdownMenuItem>
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
}

function ChatItem({ chat, selected, onSelect }: ChatItemProps) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        "group flex w-full min-w-0 items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors",
        selected ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-accent/50",
      )}
    >
      <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="flex-1 overflow-hidden text-left">
        <p className="truncate font-medium">{chat.title}</p>
        <p className="text-xs text-muted-foreground">{chat.timestamp}</p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>Rename</DropdownMenuItem>
          <DropdownMenuItem>Pin</DropdownMenuItem>
          <DropdownMenuItem>Move to folder</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </button>
  )
}
