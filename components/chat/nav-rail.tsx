"use client"

import { Button } from "@/components/ui/button"
import { MessageSquare, Settings, User, LayoutGrid } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import Link from "next/link"
import { usePathname } from "next/navigation"

// Icon-only vertical nav shown in command-center chat layout.
export function NavRail() {
  const pathname = usePathname()

  const navItems = [
    { icon: MessageSquare, label: "Chat", href: "/chat/command-center" },
    { icon: LayoutGrid, label: "Workspace", href: "/workspace" },
    { icon: Settings, label: "Admin", href: "/admin" },
  ]

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-full w-14 flex-col items-center border-r border-border bg-card py-4 gap-2">
        {/* Logo */}
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
          <MessageSquare className="h-5 w-5 text-primary-foreground" />
        </div>

        {/* Nav Items */}
        <div className="flex flex-1 flex-col items-center gap-1">
          {navItems.map((item) => (
            <Tooltip key={item.href}>
              <TooltipTrigger asChild>
                <Button
                  variant={pathname === item.href ? "secondary" : "ghost"}
                  size="icon"
                  className="h-10 w-10"
                  asChild
                >
                  <Link href={item.href}>
                    <item.icon className="h-5 w-5" />
                    <span className="sr-only">{item.label}</span>
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          ))}
        </div>

        {/* User */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10 mt-auto">
              <User className="h-5 w-5" />
              <span className="sr-only">User</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Profile</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}
