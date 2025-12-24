"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, Users, BarChart3, SettingsIcon } from "lucide-react"
import Link from "next/link"

const sampleUsers = [
  { id: "1", name: "John Doe", email: "john@example.com", role: "admin", status: "active" },
  { id: "2", name: "Jane Smith", email: "jane@example.com", role: "user", status: "active" },
  { id: "3", name: "Bob Johnson", email: "bob@example.com", role: "user", status: "inactive" },
]

export function AdminLayout() {
  const [activeTab, setActiveTab] = useState("users")

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/chat">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-semibold">Admin Panel</h1>
              <p className="text-sm text-muted-foreground">Manage users, settings, and system configuration</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-8">
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="evaluations" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Evaluations
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2">
              <SettingsIcon className="h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          {/* Users Tab */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>User Management</CardTitle>
                    <CardDescription>Manage user accounts and permissions</CardDescription>
                  </div>
                  <Button>Add User</Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sampleUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>
                          <Badge variant={user.role === "admin" ? "default" : "secondary"}>{user.role}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.status === "active" ? "default" : "secondary"}>{user.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Evaluations Tab */}
          <TabsContent value="evaluations">
            <Card>
              <CardHeader>
                <CardTitle>Model Evaluations</CardTitle>
                <CardDescription>Track model performance and quality metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Total Evaluations</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">1,234</div>
                        <p className="text-xs text-muted-foreground">+12% from last month</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">8.7/10</div>
                        <p className="text-xs text-muted-foreground">+0.3 from last month</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">94.2%</div>
                        <p className="text-xs text-muted-foreground">+2.1% from last month</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <SettingsSection title="General" description="Basic application settings">
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="app-name">Application Name</Label>
                  <Input id="app-name" defaultValue="Open WebUI" className="max-w-md" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="admin-email">Admin Email</Label>
                  <Input id="admin-email" type="email" defaultValue="admin@example.com" className="max-w-md" />
                </div>
                <div className="flex items-center justify-between max-w-md">
                  <div className="space-y-0.5">
                    <Label>Enable Registrations</Label>
                    <p className="text-sm text-muted-foreground">Allow new users to create accounts</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </SettingsSection>

            <SettingsSection title="Connections" description="External API and service integrations">
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="openai-key">OpenAI API Key</Label>
                  <Input id="openai-key" type="password" placeholder="sk-..." className="max-w-md" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="anthropic-key">Anthropic API Key</Label>
                  <Input id="anthropic-key" type="password" placeholder="sk-ant-..." className="max-w-md" />
                </div>
              </div>
            </SettingsSection>

            <SettingsSection title="Documents" description="Document processing and storage settings">
              <div className="space-y-4">
                <div className="flex items-center justify-between max-w-md">
                  <div className="space-y-0.5">
                    <Label>Enable Document Upload</Label>
                    <p className="text-sm text-muted-foreground">Allow users to upload documents</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="max-size">Max File Size (MB)</Label>
                  <Input id="max-size" type="number" defaultValue="10" className="max-w-md" />
                </div>
              </div>
            </SettingsSection>

            <SettingsSection title="Interface" description="UI customization and display options">
              <div className="space-y-4">
                <div className="flex items-center justify-between max-w-md">
                  <div className="space-y-0.5">
                    <Label>Dark Mode</Label>
                    <p className="text-sm text-muted-foreground">Use dark color scheme</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between max-w-md">
                  <div className="space-y-0.5">
                    <Label>Show Model Icons</Label>
                    <p className="text-sm text-muted-foreground">Display provider logos in model selector</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
            </SettingsSection>

            <SettingsSection title="Images" description="Image generation and processing settings">
              <div className="space-y-4">
                <div className="flex items-center justify-between max-w-md">
                  <div className="space-y-0.5">
                    <Label>Enable Image Generation</Label>
                    <p className="text-sm text-muted-foreground">Allow AI image generation features</p>
                  </div>
                  <Switch />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="image-provider">Image Provider</Label>
                  <Input id="image-provider" defaultValue="DALL-E 3" className="max-w-md" />
                </div>
              </div>
            </SettingsSection>

            <SettingsSection title="Database" description="Database configuration and maintenance">
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="db-url">Database URL</Label>
                  <Input id="db-url" type="password" defaultValue="postgresql://..." className="max-w-md" />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline">Test Connection</Button>
                  <Button variant="outline">Backup Database</Button>
                </div>
              </div>
            </SettingsSection>

            <div className="flex justify-end gap-2 pt-6 border-t">
              <Button variant="outline">Cancel</Button>
              <Button>Save Changes</Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}
