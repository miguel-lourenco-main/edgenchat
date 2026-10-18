// Text-file attachments for the chat composer.
// The chat API here is text-only (OpenAI-compatible `content: string`), so attached
// files are read in the browser and inlined into the user message.

export const MAX_ATTACHMENT_BYTES = 200 * 1024
export const MAX_ATTACHMENTS = 5

export interface ChatAttachment {
  id: string
  name: string
  size: number
  text: string
}

export class AttachmentError extends Error {}

/** Heuristic: a NUL byte in the first 8 KB means binary (images, PDFs, archives, ...). */
function looksBinary(bytes: Uint8Array): boolean {
  const n = Math.min(bytes.length, 8192)
  for (let i = 0; i < n; i++) if (bytes[i] === 0) return true
  return false
}

export async function readAttachment(file: File): Promise<ChatAttachment> {
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new AttachmentError(`${file.name} is larger than ${Math.round(MAX_ATTACHMENT_BYTES / 1024)} KB.`)
  }
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (looksBinary(bytes)) {
    throw new AttachmentError(`${file.name} is not a text file. Only text files can be attached.`)
  }
  const text = new TextDecoder("utf-8").decode(bytes)
  return { id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`, name: file.name, size: file.size, text }
}

/** Formats the message as sent to the model and stored in history. */
export function composeMessageWithAttachments(message: string, attachments: ChatAttachment[]): string {
  if (attachments.length === 0) return message
  const blocks = attachments.map((a) => {
    // Use a fence longer than any backtick run in the file so it cannot close early.
    const longest = Math.max(2, ...Array.from(a.text.matchAll(/`+/g), (m) => m[0].length))
    const fence = "`".repeat(longest + 1)
    return `Attached file: ${a.name}\n${fence}\n${a.text.replace(/\n$/, "")}\n${fence}`
  })
  return [message, ...blocks].filter(Boolean).join("\n\n")
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  return `${(n / 1024).toFixed(n < 10 * 1024 ? 1 : 0)} KB`
}
