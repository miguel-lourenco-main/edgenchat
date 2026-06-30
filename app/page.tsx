"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function Home() {
  const router = useRouter()

  // Root has no content; send users straight to the chat shell.
  useEffect(() => {
    router.replace("/chat")
  }, [router])

  return null
}
