export type ChatRole = "user" | "assistant"

/** A conversation thread stored locally in IndexedDB. */
export interface ChatThread {
  id: string
  title: string
  createdAt: number
  updatedAt: number
}

/** A single turn within a chat thread. */
export interface ChatMessage {
  id: string
  chatId: string
  role: ChatRole
  content: string
  createdAt: number
}

/** Portable backup format for import/export from the topbar menu. */
export interface ChatExportV1 {
  version: 1
  exportedAt: number
  chats: ChatThread[]
  messages: ChatMessage[]
}


