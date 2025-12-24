"use client"

import { useRef, useState } from "react"
import { NavRail } from "@/components/chat/nav-rail"
import { ChatSidebar } from "@/components/chat/chat-sidebar"
import { ChatTopbar } from "@/components/chat/chat-topbar"
import { ChatMessages } from "@/components/chat/chat-messages"
import { ChatComposer } from "@/components/chat/chat-composer"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"
import type { ImperativePanelHandle } from "react-resizable-panels"

interface ChatInterfaceProps {
  layoutMode?: "classic" | "command-center"
}

export function ChatInterface({ layoutMode = "classic" }: ChatInterfaceProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [selectedChatId, setSelectedChatId] = useState("chat-1")
  const sidebarPanelRef = useRef<ImperativePanelHandle>(null)

  const handleNewChat = () => {
    console.log("[v0] Creating new chat")
    // In a real app, this would create a new chat and navigate to it
    const newChatId = `chat-new-${Date.now()}`
    setSelectedChatId(newChatId)
  }

  const handleToggleSidebar = () => {
    const nextOpen = !sidebarOpen
    setSidebarOpen(nextOpen)
    if (nextOpen) sidebarPanelRef.current?.expand()
    else sidebarPanelRef.current?.collapse()
  }

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
            selectedChatId={selectedChatId}
            onSelectChat={setSelectedChatId}
            onNewChat={handleNewChat}
            compact={layoutMode === "command-center"}
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Main */}
        <ResizablePanel defaultSize={76} minSize={40} className="min-w-0">
          <div className="flex h-full flex-1 flex-col min-w-0">
            <ChatTopbar onToggleSidebar={handleToggleSidebar} onNewChat={handleNewChat} />

            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto">
                <ChatMessages chatId={selectedChatId} />
              </div>
              <ChatComposer />
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
