"use client"

import { useEffect, useRef, useState } from "react"
import { NavRail } from "@/components/chat/nav-rail"
import { ChatSidebar } from "@/components/chat/chat-sidebar"
import { ChatTopbar } from "@/components/chat/chat-topbar"
import { ChatMessages } from "@/components/chat/chat-messages"
import { ChatComposer } from "@/components/chat/chat-composer"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import type { ImperativePanelHandle } from "react-resizable-panels"
import { createChat, deleteAllChats, deleteAllChatsExcept, deleteChat, listChats } from "@/lib/chat/store"
import { toast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { MessageSquare, Plus } from "lucide-react"

interface ChatInterfaceProps {
  layoutMode?: "classic" | "command-center"
}

export function ChatInterface({ layoutMode = "classic" }: ChatInterfaceProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [chats, setChats] = useState<Array<{ id: string }>>([])
  const sidebarPanelRef = useRef<ImperativePanelHandle>(null)

  const handleNewChat = () => {
    void (async () => {
      try {
        const chat = await createChat()
        setSelectedChatId(chat.id)
      } catch (err) {
        toast({
          title: "Storage error",
          description: err instanceof Error ? err.message : "Could not create chat.",
          variant: "destructive",
        })
      }
    })()
  }

  const handleToggleSidebar = () => {
    const nextOpen = !sidebarOpen
    setSidebarOpen(nextOpen)
    if (nextOpen) sidebarPanelRef.current?.expand()
    else sidebarPanelRef.current?.collapse()
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

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Nav Rail (only in command-center mode) */}
      {layoutMode === "command-center" && <NavRail />}

      <ResizablePanelGroup direction="horizontal" autoSaveId={`chat-layout-${layoutMode}`}>
        {/* Sidebar */}
        <ResizablePanel
          ref={sidebarPanelRef}
          defaultSize={layoutMode === "command-center" ? 22 : 24}
          minSize={16}
          maxSize={34}
          collapsible
          collapsedSize={0}
          onCollapse={() => setSidebarOpen(false)}
          onExpand={() => setSidebarOpen(true)}
          className="min-w-0"
        >
          <ChatSidebar
            open={sidebarOpen}
            onOpenChange={(open) => {
              setSidebarOpen(open)
              if (open) sidebarPanelRef.current?.expand()
              else sidebarPanelRef.current?.collapse()
            }}
            selectedChatId={selectedChatId ?? ""}
            onSelectChat={(id) => setSelectedChatId(id)}
            onNewChat={handleNewChat}
            onDeleteCurrentChat={async () => {
              try {
                const id = selectedChatId ?? ""
                if (!id) return
                const ok = window.confirm("Delete this chat? This cannot be undone.")
                if (!ok) return
                await deleteChat(id)
                setSelectedChatId(null)
                // Refresh chats list to update empty state
                const next = await listChats()
                setChats(next)
              } catch (err) {
                toast({
                  title: "Delete failed",
                  description: err instanceof Error ? err.message : "Could not delete chat.",
                  variant: "destructive",
                })
              }
            }}
            onDeleteOtherChats={async () => {
              try {
                const id = selectedChatId ?? ""
                if (!id) return
                const ok = window.confirm("Delete all other chats and keep only this one?")
                if (!ok) return
                await deleteAllChatsExcept(id)
              } catch (err) {
                toast({
                  title: "Delete failed",
                  description: err instanceof Error ? err.message : "Could not delete chats.",
                  variant: "destructive",
                })
              }
            }}
            onDeleteAllChats={async () => {
              try {
                const ok = window.confirm("Delete ALL chats? This cannot be undone.")
                if (!ok) return
                await deleteAllChats()
                setSelectedChatId(null)
                // Refresh chats list to update empty state
                const next = await listChats()
                setChats(next)
              } catch (err) {
                toast({
                  title: "Delete failed",
                  description: err instanceof Error ? err.message : "Could not delete chats.",
                  variant: "destructive",
                })
              }
            }}
            compact={layoutMode === "command-center"}
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Main */}
        <ResizablePanel defaultSize={76} minSize={40} className="min-w-0">
          <div className="flex h-full flex-1 flex-col min-w-0">
            <ChatTopbar
              onToggleSidebar={handleToggleSidebar}
              onNewChat={handleNewChat}
              chatId={selectedChatId ?? ""}
              onDeleteCurrentChat={async () => {
                try {
                  const id = selectedChatId ?? ""
                  if (!id) return
                  const ok = window.confirm("Delete this chat? This cannot be undone.")
                  if (!ok) return
                  await deleteChat(id)
                  setSelectedChatId(null)
                  // Refresh chats list to update empty state
                  const next = await listChats()
                  setChats(next)
                } catch (err) {
                  toast({
                    title: "Delete failed",
                    description: err instanceof Error ? err.message : "Could not delete chat.",
                    variant: "destructive",
                  })
                }
              }}
              onDeleteOtherChats={async () => {
                try {
                  const id = selectedChatId ?? ""
                  if (!id) return
                  const ok = window.confirm("Delete all other chats and keep only this one?")
                  if (!ok) return
                  await deleteAllChatsExcept(id)
                } catch (err) {
                  toast({
                    title: "Delete failed",
                    description: err instanceof Error ? err.message : "Could not delete chats.",
                    variant: "destructive",
                  })
                }
              }}
              onDeleteAllChats={async () => {
                try {
                  const ok = window.confirm("Delete ALL chats? This cannot be undone.")
                  if (!ok) return
                  await deleteAllChats()
                  setSelectedChatId(null)
                  // Refresh chats list to update empty state
                  const next = await listChats()
                  setChats(next)
                } catch (err) {
                  toast({
                    title: "Delete failed",
                    description: err instanceof Error ? err.message : "Could not delete chats.",
                    variant: "destructive",
                  })
                }
              }}
            />

            <div className="flex-1 flex flex-col min-h-0">
              {selectedChatId ? (
                <>
                  <div className="flex-1 min-h-0">
                    <ChatMessages chatId={selectedChatId} />
                  </div>
                  <ChatComposer chatId={selectedChatId} />
                </>
              ) : chats.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center space-y-4 max-w-md px-4">
                    <div className="flex justify-center">
                      <div className="rounded-full bg-muted p-6">
                        <MessageSquare className="h-12 w-12 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold">No chats yet</h3>
                      <p className="text-sm text-muted-foreground">Want to create a new one?</p>
                    </div>
                    <Button onClick={handleNewChat} className="gap-2">
                      <Plus className="h-4 w-4" />
                      New Chat
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
