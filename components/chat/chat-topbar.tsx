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
import { Menu, Plus, Share2, Download, MoreHorizontal, Trash2 } from "lucide-react"
import { exportChatToJson, exportToJson, importFromJson } from "@/lib/chat/store"
import { toast } from "@/hooks/use-toast"
import type { ChatExportV1 } from "@/lib/chat/types"
import Link from "next/link"
import { AI_MODELS } from "@/lib/ai/catalog"
import { loadLocalSettings, saveLocalSettings } from "@/lib/settings/local"
import { getCachedModels } from "@/lib/ai/discovery"
import { useConnection } from "@/components/connection/connection-provider"
import { ConnectionBadge } from "@/components/connection/connection-status"
import { isModelMissing } from "@/hooks/use-connection-probe"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"

interface ChatTopbarProps {
  onToggleSidebar: () => void
  onNewChat: () => void
  chatId: string
  onDeleteCurrentChat: () => Promise<void> | void
  onDeleteOtherChats: () => Promise<void> | void
  onDeleteAllChats: () => Promise<void> | void
}

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

async function pickAndReadJsonFile(): Promise<ChatExportV1> {
  return await new Promise((resolve, reject) => {
    const input = document.createElement("input")
    input.type = "file"
    input.accept = "application/json"
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return reject(new Error("No file selected"))
      try {
        const text = await file.text()
        resolve(JSON.parse(text) as ChatExportV1)
      } catch (e) {
        reject(e instanceof Error ? e : new Error("Invalid JSON file"))
      }
    }
    input.click()
  })
}

export function ChatTopbar({
  onToggleSidebar,
  onNewChat,
  chatId,
  onDeleteCurrentChat,
  onDeleteOtherChats,
  onDeleteAllChats,
}: ChatTopbarProps) {
  const { settings, state, retry, target } = useConnection()
  const model = settings.ai.model.trim()
  const cachedModels = (() => {
    if (!target) return []
    return getCachedModels(settings.ai.providerId, target.baseUrl)?.models ?? []
  })()
  // Prefer the live list; fall back to the last known list, then to the static catalog.
  const discoveredModels = state.status === "connected" ? state.models : cachedModels
  const modelMissing = isModelMissing(state, model)

  const selectModel = (value: string) => {
    const s = loadLocalSettings()
    saveLocalSettings({ ...s, ai: { ...s.ai, model: value } })
  }

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

        <Select value={settings.ai.model} onValueChange={selectModel}>
          <SelectTrigger
            className={cn("w-[200px] h-9 bg-background text-foreground", modelMissing && "border-amber-500/60")}
            title={modelMissing ? `${model} is not available on this server` : undefined}
          >
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent>
            {discoveredModels.length > 0 ? (
              <>
                {model && !discoveredModels.includes(model) ? (
                  <SelectItem key={`missing-${model}`} value={model}>
                    {model} (not available)
                  </SelectItem>
                ) : null}
                {discoveredModels.map((m) => (
                  <SelectItem key={`discovered-${m}`} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </>
            ) : (
              <>
                {settings.ai.model.trim() && !AI_MODELS.some((m) => m.providerId === settings.ai.providerId && m.model === settings.ai.model) ? (
                  <SelectItem value={settings.ai.model}>{settings.ai.model}</SelectItem>
                ) : null}
                {AI_MODELS.filter((m) => m.providerId === settings.ai.providerId).map((m) => (
                <SelectItem key={m.id} value={m.model}>
                  {m.label}
                </SelectItem>
              ))}
              </>
            )}
          </SelectContent>
        </Select>

        <ConnectionBadge state={state} onRetry={retry} baseUrl={target?.baseUrl} modelMissing={modelMissing} />
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
          <Share2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={async () => {
            try {
              const data = await exportToJson()
              downloadJson(`edgen-chat-backup-${new Date().toISOString().slice(0, 10)}.json`, data)
            } catch (err) {
              toast({
                title: "Export failed",
                description: err instanceof Error ? err.message : "Could not export chats.",
                variant: "destructive",
              })
            }
          }}
        >
          <Download className="h-4 w-4" />
        </Button>
        <ThemeToggle buttonClassName="h-8 w-8" />
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
            <DropdownMenuItem
              disabled={!chatId}
              onSelect={async () => {
                try {
                  if (!chatId) return
                  const data = await exportChatToJson(chatId)
                  downloadJson(`chat-${chatId}.json`, data)
                } catch (err) {
                  toast({
                    title: "Export failed",
                    description: err instanceof Error ? err.message : "Could not export chat.",
                    variant: "destructive",
                  })
                }
              }}
            >
              Export chat
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={async () => {
                try {
                  const data = await pickAndReadJsonFile()
                  await importFromJson(data)
                  toast({ title: "Imported", description: "Chats imported successfully." })
                } catch (err) {
                  toast({
                    title: "Import failed",
                    description: err instanceof Error ? err.message : "Could not import.",
                    variant: "destructive",
                  })
                }
              }}
            >
              Import backup
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin">Settings</Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
