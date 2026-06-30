// Domain types for chats persisted in IndexedDB (see lib/chat/store.ts).

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

/** Portable backup format; version gates import compatibility in importFromJson. */
export interface ChatExportV1 {
  version: 1
  exportedAt: number
  chats: ChatThread[]
  messages: ChatMessage[]
}


