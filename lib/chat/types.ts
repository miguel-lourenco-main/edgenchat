export type ChatRole = "user" | "assistant"

export interface ChatThread {
  id: string
  title: string
  createdAt: number
  updatedAt: number
}

export interface ChatMessage {
  id: string
  chatId: string
  role: ChatRole
  content: string
  createdAt: number
}

export interface ChatExportV1 {
  version: 1
  exportedAt: number
  chats: ChatThread[]
  messages: ChatMessage[]
}


