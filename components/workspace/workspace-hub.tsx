"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Brain, BookOpen, Lightbulb, Wrench, Plus, Search, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { ThemeToggle } from "@/components/theme-toggle"

const workspaceSections = [
  // Static navigation cards; counts are placeholders until backend wiring lands.
  {
    id: "models",
    title: "Models",
    description: "Manage AI models and configurations",
    icon: Brain,
    count: 12,
    href: "/workspace/models",
    color: "text-blue-500",
  },
  {
    id: "knowledge",
    title: "Knowledge",
    description: "Document collections and vector databases",
    icon: BookOpen,
    count: 8,
    href: "/workspace/knowledge",
    color: "text-purple-500",
  },
  {
    id: "prompts",
    title: "Prompts",
    description: "Reusable prompt templates and snippets",
    icon: Lightbulb,
    count: 24,
    href: "/workspace/prompts",
    color: "text-yellow-500",
  },
  {
    id: "tools",
    title: "Tools",
    description: "Custom functions and integrations",
    icon: Wrench,
    count: 6,
    href: "/workspace/tools",
    color: "text-green-500",
  },
]

export function WorkspaceHub() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/chat">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-semibold">Workspace</h1>
                <p className="text-sm text-muted-foreground">Manage your AI resources and configurations</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search workspace..." className="pl-9 w-[300px] bg-background" />
              </div>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 container mx-auto px-6 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {workspaceSections.map((section) => (
            <Card
              key={section.id}
              className="group cursor-pointer border-border hover:border-primary transition-all hover:shadow-lg hover:shadow-primary/10"
              asChild
            >
              <Link href={section.href}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-lg bg-muted ${section.color}`}>
                      <section.icon className="h-6 w-6" />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.preventDefault()
                        console.log("Create new", section.id)
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardTitle className="mt-4">{section.title}</CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{section.count} items</span>
                    <span className="text-primary group-hover:translate-x-0.5 transition-transform">→</span>
                  </div>
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>

        {/* Recent Activity */}
        <div className="mt-12">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                {[
                  { action: "Updated model", name: "GPT-4 Turbo", time: "2 hours ago" },
                  { action: "Created prompt", name: "Code Review Template", time: "5 hours ago" },
                  { action: "Added knowledge", name: "Technical Documentation", time: "1 day ago" },
                ].map((activity, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium">{activity.action}</p>
                      <p className="text-sm text-muted-foreground">{activity.name}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{activity.time}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
