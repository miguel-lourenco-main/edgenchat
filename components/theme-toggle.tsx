"use client"

import { useEffect, useMemo, useState } from "react"
import { useTheme } from "next-themes"
import { Moon, Sun, Laptop } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ThemeToggle({
  buttonClassName,
}: {
  buttonClassName?: string
}) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch: resolved theme is unknown until client mount.
  useEffect(() => setMounted(true), [])

  const icon = useMemo(() => {
    const t = mounted ? (resolvedTheme ?? theme) : "system"
    if (t === "light") return <Sun className="h-4 w-4" />
    if (t === "dark") return <Moon className="h-4 w-4" />
    return <Laptop className="h-4 w-4" />
  }, [mounted, resolvedTheme, theme])

  const value = theme ?? "system"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8 text-muted-foreground hover:text-foreground", buttonClassName)}
        >
          {icon}
          <span className="sr-only">Theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={value} onValueChange={(v) => setTheme(v)}>
          <DropdownMenuRadioItem value="light">
            <Sun className="h-4 w-4" />
            Light
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <Moon className="h-4 w-4" />
            Dark
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <Laptop className="h-4 w-4" />
            System
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}


