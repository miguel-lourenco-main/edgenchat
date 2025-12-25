"use client"

import { useState } from "react"

export function useSession() {
  // Supabase removed; keep this hook for compatibility during refactor.
  const [loading] = useState(false)
  return { session: null, user: null, loading, error: null as string | null }
}


