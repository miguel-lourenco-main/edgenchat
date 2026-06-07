// Client-side chat persistence: threads and messages live in IndexedDB with
// localStorage/event-based refresh signals for cross-tab UI sync.
import { openDb, runTx, txDelete, txGet, txGetAll, txGetAllFromIndex, txPut } from "@/lib/chat/idb"
import type { ChatExportV1, ChatMessage, ChatThread, ChatRole } from "@/lib/chat/types"

const DB_NAME = "edgen-chat"
const DB_VERSION = 1

const STORES = {
  chats: "chats",
  messages: "messages",
} as const

let dbPromise: Promise<IDBDatabase> | null = null

function now() {
  return Date.now()
}

function notifyRefresh() {
  // Cross-tab signal
  try {
    localStorage.setItem("edgen-chat:refresh", String(Date.now()))
  } catch {
    // ignore
  }
  // Same-tab signal
  try {
    window.dispatchEvent(new Event("edgen-chat:refresh"))
  } catch {
    // ignore
  }
}

function makeId(prefix: string) {
  // Good enough for local-only IDs; avoids pulling in uuid dependency.
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`
}

async function getDb() {
  if (!dbPromise) {
    dbPromise = openDb(DB_NAME, DB_VERSION, (db) => {
      if (!db.objectStoreNames.contains(STORES.chats)) {
        const chats = db.createObjectStore(STORES.chats, { keyPath: "id" })
        chats.createIndex("updatedAt", "updatedAt", { unique: false })
      }
      if (!db.objectStoreNames.contains(STORES.messages)) {
        const messages = db.createObjectStore(STORES.messages, { keyPath: "id" })
        messages.createIndex("chatId", "chatId", { unique: false })
        messages.createIndex("createdAt", "createdAt", { unique: false })
      }
    })
  }
  return await dbPromise
}

function normalizeStorageError(err: unknown): Error {
  if (err instanceof Error) {
    const name = (err as any).name as string | undefined
    if (name === "QuotaExceededError") {
      return new Error("Storage quota exceeded. Please export and delete old chats to free space.")
    }
    if (err.message.toLowerCase().includes("quota")) {
      return new Error("Storage quota exceeded. Please export and delete old chats to free space.")
    }
    return err
  }
  return new Error("Storage error")
}

export async function listChats(): Promise<ChatThread[]> {
  try {
    const db = await getDb()
    const tx = db.transaction(STORES.chats, "readonly")
    const store = tx.objectStore(STORES.chats)
    const chats = await txGetAll<ChatThread>(store)
    chats.sort((a, b) => b.updatedAt - a.updatedAt)
    return chats
  } catch (err) {
    throw normalizeStorageError(err)
  }
}

export async function getChat(chatId: string): Promise<ChatThread | undefined> {
  const db = await getDb()
  const tx = db.transaction(STORES.chats, "readonly")
  return await txGet<ChatThread>(tx.objectStore(STORES.chats), chatId)
}

// Creates a thread with a generated id and bumps updatedAt on every message write.
export async function createChat(opts?: { title?: string }): Promise<ChatThread> {
  const chat: ChatThread = {
    id: makeId("chat"),
    title: opts?.title?.trim() || "New chat",
    createdAt: now(),
    updatedAt: now(),
  }
  try {
    const db = await getDb()
    await runTx(db, STORES.chats, "readwrite", async (tx) => {
      await txPut(tx.objectStore(STORES.chats), chat)
    })
    notifyRefresh()
    return chat
  } catch (err) {
    throw normalizeStorageError(err)
  }
}

export async function renameChat(chatId: string, title: string): Promise<void> {
  const db = await getDb()
  await runTx(db, STORES.chats, "readwrite", async (tx) => {
    const store = tx.objectStore(STORES.chats)
    const existing = await txGet<ChatThread>(store, chatId)
    if (!existing) return
    await txPut(store, { ...existing, title, updatedAt: now() })
  })
  notifyRefresh()
}

export async function deleteChat(chatId: string): Promise<void> {
  try {
    const db = await getDb()
    // Cascade: remove the thread and every message indexed by chatId.
    await runTx(db, [STORES.chats, STORES.messages], "readwrite", async (tx) => {
      await txDelete(tx.objectStore(STORES.chats), chatId)
      const messagesStore = tx.objectStore(STORES.messages)
      const idx = messagesStore.index("chatId")
      const msgs = await txGetAllFromIndex<ChatMessage>(idx, chatId)
      await Promise.all(msgs.map((m) => txDelete(messagesStore, m.id)))
    })
    notifyRefresh()
  } catch (err) {
    throw normalizeStorageError(err)
  }
}

export async function deleteAllChats(): Promise<void> {
  try {
    const db = await getDb()
    await runTx(db, [STORES.chats, STORES.messages], "readwrite", async (tx) => {
      const chatsStore = tx.objectStore(STORES.chats)
      const chats = await txGetAll<ChatThread>(chatsStore)
      await Promise.all(chats.map((c) => txDelete(chatsStore, c.id)))

      const messagesStore = tx.objectStore(STORES.messages)
      const msgs = await txGetAll<ChatMessage>(messagesStore)
      await Promise.all(msgs.map((m) => txDelete(messagesStore, m.id)))
    })
    notifyRefresh()
  } catch (err) {
    throw normalizeStorageError(err)
  }
}

export async function deleteAllChatsExcept(keepChatId: string): Promise<void> {
  try {
    const db = await getDb()
    await runTx(db, [STORES.chats, STORES.messages], "readwrite", async (tx) => {
      const chatsStore = tx.objectStore(STORES.chats)
      const messagesStore = tx.objectStore(STORES.messages)
      const idx = messagesStore.index("chatId")

      const chats = await txGetAll<ChatThread>(chatsStore)
      const toDelete = chats.filter((c) => c.id !== keepChatId)

      for (const c of toDelete) {
        await txDelete(chatsStore, c.id)
        const msgs = await txGetAllFromIndex<ChatMessage>(idx, c.id)
        await Promise.all(msgs.map((m) => txDelete(messagesStore, m.id)))
      }
    })
    notifyRefresh()
  } catch (err) {
    throw normalizeStorageError(err)
  }
}

export async function clearChat(chatId: string): Promise<void> {
  try {
    const db = await getDb()
    await runTx(db, STORES.messages, "readwrite", async (tx) => {
      const store = tx.objectStore(STORES.messages)
      const idx = store.index("chatId")
      const msgs = await txGetAllFromIndex<ChatMessage>(idx, chatId)
      await Promise.all(msgs.map((m) => txDelete(store, m.id)))
    })
    notifyRefresh()
  } catch (err) {
    throw normalizeStorageError(err)
  }
}

export async function deleteMessages(chatId: string, messageIds: string[]): Promise<void> {
  if (!messageIds.length) return
  try {
    const db = await getDb()
    await runTx(db, [STORES.messages, STORES.chats], "readwrite", async (tx) => {
      const messagesStore = tx.objectStore(STORES.messages)
      for (const id of messageIds) {
        await txDelete(messagesStore, id)
      }
      const chatsStore = tx.objectStore(STORES.chats)
      const chat = await txGet<ChatThread>(chatsStore, chatId)
      if (chat) await txPut(chatsStore, { ...chat, updatedAt: now() })
    })
    notifyRefresh()
  } catch (err) {
    throw normalizeStorageError(err)
  }
}

export async function deleteMessagesByRole(chatId: string, role: ChatRole): Promise<void> {
  try {
    const msgs = await listMessages(chatId)
    const ids = msgs.filter((m) => m.role === role).map((m) => m.id)
    await deleteMessages(chatId, ids)
  } catch (err) {
    throw normalizeStorageError(err)
  }
}

export async function deleteLastNMessages(chatId: string, n: number): Promise<void> {
  try {
    const msgs = await listMessages(chatId)
    const ids = msgs.slice(Math.max(0, msgs.length - Math.max(0, n))).map((m) => m.id)
    await deleteMessages(chatId, ids)
  } catch (err) {
    throw normalizeStorageError(err)
  }
}

export async function exportChatToJson(chatId: string): Promise<ChatExportV1> {
  try {
    const db = await getDb()
    const chatsTx = db.transaction(STORES.chats, "readonly")
    const messagesTx = db.transaction(STORES.messages, "readonly")
    const chat = await txGet<ChatThread>(chatsTx.objectStore(STORES.chats), chatId)
    if (!chat) throw new Error("Chat not found")
    const msgs = await txGetAllFromIndex<ChatMessage>(messagesTx.objectStore(STORES.messages).index("chatId"), chatId)
    msgs.sort((a, b) => a.createdAt - b.createdAt)
    return { version: 1, exportedAt: now(), chats: [chat], messages: msgs }
  } catch (err) {
    throw normalizeStorageError(err)
  }
}

export async function listMessages(chatId: string): Promise<ChatMessage[]> {
  try {
    const db = await getDb()
    const tx = db.transaction(STORES.messages, "readonly")
    const store = tx.objectStore(STORES.messages)
    const idx = store.index("chatId")
    const msgs = await txGetAllFromIndex<ChatMessage>(idx, chatId)
    msgs.sort((a, b) => a.createdAt - b.createdAt)
    return msgs
  } catch (err) {
    throw normalizeStorageError(err)
  }
}

export async function addMessage(chatId: string, role: ChatRole, content: string): Promise<ChatMessage> {
  const message: ChatMessage = {
    id: makeId("msg"),
    chatId,
    role,
    content,
    createdAt: now(),
  }
  try {
    const db = await getDb()
    await runTx(db, [STORES.messages, STORES.chats], "readwrite", async (tx) => {
      await txPut(tx.objectStore(STORES.messages), message)
      const chatsStore = tx.objectStore(STORES.chats)
      const chat = await txGet<ChatThread>(chatsStore, chatId)
      if (chat) await txPut(chatsStore, { ...chat, updatedAt: now() })
    })
    notifyRefresh()
    return message
  } catch (err) {
    throw normalizeStorageError(err)
  }
}

// Incrementally patch message content (used while streaming assistant tokens).
export async function updateMessage(messageId: string, patch: Partial<Pick<ChatMessage, "content">>): Promise<void> {
  try {
    const db = await getDb()
    await runTx(db, STORES.messages, "readwrite", async (tx) => {
      const store = tx.objectStore(STORES.messages)
      const existing = await txGet<ChatMessage>(store, messageId)
      if (!existing) return
      await txPut(store, { ...existing, ...patch })
    })
    notifyRefresh()
  } catch (err) {
    throw normalizeStorageError(err)
  }
}

export async function exportToJson(): Promise<ChatExportV1> {
  const db = await getDb()
  const chatsTx = db.transaction(STORES.chats, "readonly")
  const messagesTx = db.transaction(STORES.messages, "readonly")
  const chats = await txGetAll<ChatThread>(chatsTx.objectStore(STORES.chats))
  const messages = await txGetAll<ChatMessage>(messagesTx.objectStore(STORES.messages))
  return { version: 1, exportedAt: now(), chats, messages }
}

export async function importFromJson(payload: ChatExportV1): Promise<void> {
  if (payload.version !== 1) throw new Error("Unsupported export version")
  const db = await getDb()
  // Merge by id: existing records with the same keys are overwritten.
  await runTx(db, [STORES.chats, STORES.messages], "readwrite", async (tx) => {
    const chatsStore = tx.objectStore(STORES.chats)
    const messagesStore = tx.objectStore(STORES.messages)
    for (const c of payload.chats) await txPut(chatsStore, c)
    for (const m of payload.messages) await txPut(messagesStore, m)
  })
  notifyRefresh()
}


