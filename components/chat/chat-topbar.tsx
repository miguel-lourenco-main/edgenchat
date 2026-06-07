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
import { useEffect, useState } from "react"
import { AI_MODELS } from "@/lib/ai/catalog"
import { loadLocalSettings, saveLocalSettings } from "@/lib/settings/local"
import { getCachedModels, refreshDiscoveredModels } from "@/lib/ai/discovery"
import { ThemeToggle } from "@/components/theme-toggle"

interface ChatTopbarProps {
  onToggleSidebar: () => void
  onNewChat: () => void
  chatId: string
  onDeleteCurrentChat: () => Promise<void> | void
  onDeleteOtherChats: () => Promise<void> | void
  onDeleteAllChats: () => Promise<void> | void
}

// Triggers a browser download of JSON export data from the chat topbar.
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

// Top bar: model picker, theme toggle, and chat backup import/export actions.
export function ChatTopbar({
  onToggleSidebar,
  onNewChat,
  chatId,
  onDeleteCurrentChat,
  onDeleteOtherChats,
  onDeleteAllChats,
}: ChatTopbarProps) {
  const [settings, setSettings] = useState(() => loadLocalSettings())
  const [discoveredModels, setDiscoveredModels] = useState<string[]>([])
  const [warnedDiscovery, setWarnedDiscovery] = useState(false)

  useEffect(() => {
    const onSettings = () => {
      const s = loadLocalSettings()
      setSettings(s)
    }
    window.addEventListener("edgen-chat:settings", onSettings)
    return () => window.removeEventListener("edgen-chat:settings", onSettings)
  }, [])

  // When model discovery finishes elsewhere (e.g. Settings page), update the dropdown from cache.
  useEffect(() => {
    const onModels = () => {
      const s = loadLocalSettings()
      if (s.ai.providerId !== "ollama") return
      const baseUrl = s.ai.baseUrl.trim()
      if (!baseUrl) return
      const cached = getCachedModels("ollama", baseUrl)
      if (cached?.models?.length) {
        setDiscoveredModels(cached.models)
      }
    }
    window.addEventListener("edgen-chat:models", onModels)
    return () => window.removeEventListener("edgen-chat:models", onModels)
  }, [])

  // When switching into Local (Ollama), refresh models once automatically.
  useEffect(() => {
    let cancelled = false
    async function run() {
      if (settings.ai.providerId !== "ollama") {
        setDiscoveredModels([])
        setWarnedDiscovery(false)
        return
      }
      const baseUrl = settings.ai.baseUrl.trim()
      if (!baseUrl) return

      // Show cached immediately.
      const cached = getCachedModels("ollama", baseUrl)
      if (cached?.models?.length) {
        setDiscoveredModels(cached.models)
        // Ensure the current selection is valid for the dropdown.
        const current = settings.ai.model.trim()
        if (!current || !cached.models.includes(current)) {
          const next = { ...settings, ai: { ...settings.ai, model: cached.models[0] } }
          saveLocalSettings(next)
          setSettings(next)
        }
      }

      try {
        const models = await refreshDiscoveredModels("ollama", baseUrl)
        if (cancelled) return
        setDiscoveredModels(models ?? [])
        if (models?.length) {
          const current = settings.ai.model.trim()
          if (!current || !models.includes(current)) {
            const next = { ...settings, ai: { ...settings.ai, model: models[0] } }
            saveLocalSettings(next)
            setSettings(next)
          }
        }
      } catch (err) {
        // In hosted production, this most commonly fails due to CORS/mixed-content when calling localhost.
        const hosted = typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1"
        const loopback = (() => {
          try {
            const u = new URL(baseUrl)
            return u.hostname === "localhost" || u.hostname === "127.0.0.1" || u.hostname === "::1"
          } catch {
            return baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1")
          }
        })()
        if (!warnedDiscovery && hosted && loopback) {
          setWarnedDiscovery(true)
          toast({
            title: "Ollama models not discovered",
            description:
              err instanceof Error
                ? err.message
                : "Browser blocked access to your local Ollama. Open Settings → Local (Ollama) for the CORS fix.",
            variant: "destructive",
          })
        }
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [settings.ai.providerId, settings.ai.baseUrl])

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

        <Select
          value={settings.ai.model}
          onValueChange={(value) => {
            const s = loadLocalSettings()
            const next = {
              ...s,
              ai: {
                ...s.ai,
                model: value,
              },
            }
            saveLocalSettings(next)
            setSettings(next)
          }}
        >
          <SelectTrigger className="w-[200px] h-9 bg-background text-foreground">
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent>
            {settings.ai.providerId === "ollama" ? (
              <>
                {discoveredModels.map((m) => (
                  <SelectItem key={`ollama-${m}`} value={m}>
                    {m}
                  </SelectItem>
                ))}
                {discoveredModels.length === 0
                  ? AI_MODELS.filter((m) => m.providerId === "ollama").map((m) => (
                      <SelectItem key={m.id} value={m.model}>
                        {m.label}
                      </SelectItem>
                    ))
                  : null}
              </>
            ) : (
              <>
                {AI_MODELS.filter((m) => m.providerId === "openai_compatible").map((m) => (
                  <SelectItem key={m.id} value={m.model}>
                    {m.label}
                  </SelectItem>
                ))}
              </>
            )}
          </SelectContent>
        </Select>
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
