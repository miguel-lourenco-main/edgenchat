"use client"

// Root route redirects to the primary chat experience.
import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/chat")
  }, [router])

  return null
}
