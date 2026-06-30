import { ChatInterface } from "@/components/chat/chat-interface"

// Command-center layout adds NavRail for quick jumps to workspace/admin.
export default function CommandCenterPage() {
  return (
    <ChatInterface layoutMode="command-center" />
  )
}
