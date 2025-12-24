"use client"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Menu, Plus, Share2, Download, MoreHorizontal } from "lucide-react"

interface ChatTopbarProps {
  onToggleSidebar: () => void
  onNewChat: () => void
}

export function ChatTopbar({ onToggleSidebar, onNewChat }: ChatTopbarProps) {
  return (
    <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={onToggleSidebar}
        >
          <Menu className="h-4 w-4" />
        </Button>

        <Select defaultValue="gpt-4">
          <SelectTrigger className="w-[200px] h-9 bg-background text-foreground">
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gpt-4">GPT-4 Turbo</SelectItem>
            <SelectItem value="gpt-3.5">GPT-3.5</SelectItem>
            <SelectItem value="claude-3">Claude 3 Opus</SelectItem>
            <SelectItem value="llama-2">Llama 2 70B</SelectItem>
            <SelectItem value="mixtral">Mixtral 8x7B</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
          <Share2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
          <Download className="h-4 w-4" />
        </Button>
        <Button size="sm" className="h-8" onClick={onNewChat}>
          <Plus className="h-4 w-4 mr-1.5" />
          New Chat
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Clear conversation</DropdownMenuItem>
            <DropdownMenuItem>Export chat</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Settings</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
