"use client"

import type React from "react"

// Pass-through wrapper kept after auth removal so legacy route guards still compile.
export function RequireAuth({ children }: { children: React.ReactNode }) {
  // Auth removed. Keep this component as a no-op so old imports won't break
  // while we continue refactoring.
  return <>{children}</>
}


