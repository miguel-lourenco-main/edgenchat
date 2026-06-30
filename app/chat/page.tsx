import { ChatInterface } from "@/components/chat/chat-interface"

// Classic layout: sidebar + main pane only (no left nav rail).
export default function ChatPage() {
  return (
    <ChatInterface layoutMode="classic" />
  )
}
