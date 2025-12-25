"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { ArrowLeft, ExternalLink, Globe, Laptop, Server } from "lucide-react"
import Link from "next/link"
import { loadLocalSettings, saveLocalSettings } from "@/lib/settings/local"
import type { LocalSettings } from "@/lib/settings/types"
import { toast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AI_MODELS, AI_PROVIDERS } from "@/lib/ai/catalog"
import { getCachedModels, refreshDiscoveredModels } from "@/lib/ai/discovery"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/theme-toggle"

export function AdminLayout() {
  const [settings, setSettings] = useState<LocalSettings>(() => loadLocalSettings())
  const [discoveredModels, setDiscoveredModels] = useState<string[]>([])
  const [modelsMeta, setModelsMeta] = useState<{ fetchedAt: number; count: number } | null>(null)
  const [refreshingModels, setRefreshingModels] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; detail: string } | null>(null)

  useEffect(() => {
    setSettings(loadLocalSettings())
  }, [])

  useEffect(() => {
    if (settings.ai.providerId !== "ollama") {
      setDiscoveredModels([])
      setModelsMeta(null)
      return
    }
    const baseUrl = settings.ai.baseUrl.trim()
    const cached = baseUrl ? getCachedModels("ollama", baseUrl) : null
    setDiscoveredModels(cached?.models ?? [])
    setModelsMeta(cached ? { fetchedAt: cached.fetchedAt, count: cached.models.length } : null)
    setTestResult(null)
  }, [settings.ai.providerId, settings.ai.connectionMode, settings.ai.proxyBaseUrl, settings.ai.baseUrl])

  const provider = AI_PROVIDERS[settings.ai.providerId]
  const isLocal = settings.ai.providerId === "ollama"
  const isProxy = settings.ai.connectionMode === "proxy"
  const endpoint = (isProxy ? settings.ai.proxyBaseUrl : settings.ai.baseUrl).trim()
  const appOrigin = typeof window !== "undefined" ? window.location.origin : ""
  const gitlabPagesOrigin = "https://edgenchat-d831b2.gitlab.io"
  const isHosted = typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1"
  const isLoopbackBaseUrl = (() => {
    const baseUrl = settings.ai.baseUrl.trim()
    if (!baseUrl) return false
    try {
      const u = new URL(baseUrl)
      return u.hostname === "localhost" || u.hostname === "127.0.0.1" || u.hostname === "::1"
    } catch {
      return baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1")
    }
  })()
  const missing: string[] = []
  if (isProxy && !settings.ai.proxyBaseUrl.trim()) missing.push("Proxy Base URL")
  if (!isProxy && !settings.ai.baseUrl.trim()) missing.push("Base URL")
  if (provider.requiresApiKey && !settings.ai.apiKey) missing.push("API Key")
  if (!settings.ai.model.trim()) missing.push("Model")
  const isConfigured = missing.length === 0

  const choice = settings.ai.providerId === "ollama" ? "local" : "proxy"

  const formatTime = (ts: number) => new Date(ts).toLocaleString()

  // When switching into Local (Ollama), refresh models once automatically.
  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!isLocal) return
      const baseUrl = settings.ai.baseUrl.trim()
      if (!baseUrl) return
      try {
        const models = await refreshDiscoveredModels("ollama", baseUrl)
        if (cancelled) return
        setDiscoveredModels(models ?? [])
        setModelsMeta(models ? { fetchedAt: Date.now(), count: models.length } : null)
        // If the current model isn't actually installed, auto-select a sensible default.
        if (models?.length) {
          setSettings((prev) => {
            if (prev.ai.providerId !== "ollama") return prev
            const current = prev.ai.model.trim()
            if (current && models.includes(current)) return prev
            return { ...prev, ai: { ...prev.ai, model: models[0] } }
          })
        }
      } catch {
        // ignore; user can hit refresh after fixing URL/CORS
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [isLocal, settings.ai.baseUrl])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" asChild>
                <Link href="/chat">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div>
                <h1 className="text-2xl font-semibold">Settings</h1>
                <p className="text-sm text-muted-foreground">Local configuration for AI and interface</p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="space-y-6">
          <SettingsSection title="AI" description="Pick provider + model first, then fill only what’s required (saved locally in this browser)">
            <div className="space-y-4">
              <div
                className={cn(
                  "rounded-md border p-3 max-w-xl",
                  isConfigured ? "border-green-500/30 bg-green-500/5" : "border-border bg-muted/30",
                )}
              >
                <p className="text-sm font-medium mb-1">Status</p>
                {isConfigured ? (
                  <p className="text-sm text-muted-foreground">
                    Ready: <span className="font-medium text-foreground">{provider.name}</span> via{" "}
                    <span className="font-medium text-foreground">{choice}</span> using{" "}
                    <code className="text-foreground">{settings.ai.model}</code>.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Missing: <span className="font-medium text-foreground">{missing.join(", ")}</span>
                  </p>
                )}
              </div>

              <div className="rounded-md border border-border bg-muted/30 p-3 max-w-xl">
                <p className="text-sm font-medium mb-1">Important</p>
                <p className="text-sm text-muted-foreground">
                  This app is <strong>fully static</strong>. For that reason, we only support:
                </p>
                <ul className="text-sm text-muted-foreground list-disc pl-5 mt-2 space-y-1">
                  <li>
                    <strong>Proxy</strong>: recommended for most cloud providers (solves browser CORS issues).
                  </li>
                  <li>
                    <strong>Local</strong>: run models locally (Ollama).
                  </li>
                </ul>
              </div>

              <div className="grid gap-3 max-w-xl sm:grid-cols-2">
                <button
                  type="button"
                  className={cn(
                    "text-left rounded-lg border bg-card p-4 hover:bg-muted/40 transition-colors",
                    settings.ai.providerId === "openai_compatible" ? "border-primary ring-1 ring-primary/30" : "border-border",
                  )}
                  onClick={() => {
                    const next = ((): LocalSettings => {
                      const prev = loadLocalSettings()
                      return {
                        ...prev,
                        ai: {
                          ...prev.ai,
                          providerId: "openai_compatible",
                          connectionMode: "proxy",
                          model: "gpt-4.1-mini",
                        },
                      }
                    })()
                    saveLocalSettings(next)
                    setSettings(next)
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Server className="h-5 w-5 text-muted-foreground" />
                      <p className="font-medium">Proxy (recommended)</p>
                    </div>
                    <Globe className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Use an OpenAI-compatible proxy. Works best for static apps and supports many providers behind one endpoint.
                  </p>
                </button>

                <button
                  type="button"
                  className={cn(
                    "text-left rounded-lg border bg-card p-4 hover:bg-muted/40 transition-colors",
                    settings.ai.providerId === "ollama" ? "border-primary ring-1 ring-primary/30" : "border-border",
                  )}
                  onClick={() => {
                    const provider = AI_PROVIDERS.ollama
                    const next = ((): LocalSettings => {
                      const prev = loadLocalSettings()
                      const baseUrl = (prev.ai.baseUrl || provider.defaultBaseUrl || prev.ai.baseUrl || "").trim()
                      const cached = baseUrl ? getCachedModels("ollama", baseUrl) : null
                      return {
                        ...prev,
                        ai: {
                          ...prev.ai,
                          providerId: "ollama",
                          connectionMode: "direct",
                          baseUrl: baseUrl || provider.defaultBaseUrl || prev.ai.baseUrl,
                          // Prefer a real installed model if we have cached discovery; otherwise use a safe fallback.
                          model: cached?.models?.[0] ?? "llama3.1:8b",
                        },
                      }
                    })()
                    saveLocalSettings(next)
                    setSettings(next)
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Laptop className="h-5 w-5 text-muted-foreground" />
                      <p className="font-medium">Local (Ollama)</p>
                    </div>
                    <ExternalLink className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Run models on your machine. No API key required. Best for privacy and offline use.
                  </p>
                </button>
              </div>

              {settings.ai.providerId === "openai_compatible" && (
                <div className="rounded-md border border-border bg-muted/30 p-3 max-w-xl">
                  <p className="text-xs font-medium mb-2">Proxy options (click to learn more)</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <a
                      className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 hover:bg-muted/40 transition-colors"
                      href="https://www.litellm.ai/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <span className="text-sm font-medium">LiteLLM Proxy</span>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </a>
                    <a
                      className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 hover:bg-muted/40 transition-colors"
                      href="https://www.helicone.ai/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <span className="text-sm font-medium">Helicone</span>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </a>
                    <a
                      className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 hover:bg-muted/40 transition-colors"
                      href="https://openrouter.ai/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <span className="text-sm font-medium">OpenRouter</span>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </a>
                    <a
                      className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 hover:bg-muted/40 transition-colors"
                      href="https://developers.cloudflare.com/ai-gateway/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      <span className="text-sm font-medium">Cloudflare AI Gateway</span>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </a>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    We assume an OpenAI-compatible API for chat and models: <code>/v1/chat/completions</code> and{" "}
                    <code>/v1/models</code>.
                  </p>
                </div>
              )}

              {settings.ai.providerId === "ollama" && (
                <div className="rounded-md border border-border bg-muted/30 p-3 max-w-xl">
                  <p className="text-xs font-medium mb-1">Ollama</p>
                  <p className="text-xs text-muted-foreground">
                    Install and run Ollama locally, then point the Base URL below to your instance.
                  </p>
                  <a
                    className="mt-2 inline-flex items-center gap-2 text-sm text-primary underline-offset-4 hover:underline"
                    href="https://ollama.com/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    ollama.com <ExternalLink className="h-4 w-4" />
                  </a>

                  {isHosted && isLoopbackBaseUrl ? (
                    <div className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
                      <p className="text-xs font-medium mb-1">Using Local from GitLab Pages (or any hosted site)</p>
                      <p className="text-xs text-muted-foreground">
                        Your browser at <code>{appOrigin || "(hosted origin)"}</code> is calling your own machine at{" "}
                        <code>{settings.ai.baseUrl.trim()}</code>. Ollama must allow CORS for this origin, otherwise you’ll
                        see a CORS/403 error.
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        For this project, your GitLab Pages origin is: <code>{gitlabPagesOrigin}</code>
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Quick fix: run a tiny local reverse proxy that <strong>removes</strong> the <code>Origin</code>{" "}
                        header and <strong>adds</strong> CORS headers, then set Base URL to <code>http://localhost:11435</code>.
                      </p>
                      <pre className="mt-2 overflow-x-auto rounded bg-background/60 p-2 text-[11px] leading-relaxed">
                        <code>{`# Caddyfile (run: caddy run --config Caddyfile)
:11435 {
  header Access-Control-Allow-Origin "${gitlabPagesOrigin}"
  header Access-Control-Allow-Methods "GET, POST, OPTIONS"
  header Access-Control-Allow-Headers "*"
  reverse_proxy localhost:11434 {
    header_up -Origin
  }
}`}</code>
                      </pre>
                      <pre className="mt-2 overflow-x-auto rounded bg-background/60 p-2 text-[11px] leading-relaxed">
                        <code>{`# Alternative (Linux systemd) – enable CORS directly in Ollama:
sudo mkdir -p /etc/systemd/system/ollama.service.d
sudo tee /etc/systemd/system/ollama.service.d/override.conf >/dev/null <<'EOF'
[Service]
Environment="OLLAMA_ORIGINS=${gitlabPagesOrigin}"
EOF
sudo systemctl daemon-reload
sudo systemctl restart ollama`}</code>
                      </pre>
                    </div>
                  ) : null}
                </div>
              )}

              <div className="grid gap-2 max-w-xl">
                <Label htmlFor="ai-model">Model</Label>
                <Select
                  value={settings.ai.model}
                  onValueChange={(value) => {
                    const model = value
                    if (!model) return
                    setSettings((prev) => ({
                      ...prev,
                      ai: {
                        ...prev.ai,
                        model,
                      },
                    }))
                  }}
                >
                  <SelectTrigger id="ai-model" className="bg-background">
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLocal ? (
                      <>
                        {discoveredModels.map((m) => (
                          <SelectItem key={`ollama-${m}`} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                        {discoveredModels.length === 0
                          ? AI_MODELS.filter((m) => m.providerId === "ollama").map((m) => (
                              <SelectItem key={m.id} value={m.model}>
                                {m.label}
                              </SelectItem>
                            ))
                          : null}
                      </>
                    ) : (
                      <>
                        {AI_MODELS.filter((m) => m.providerId === "openai_compatible").map((m) => (
                          <SelectItem key={m.id} value={m.model}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
                {isLocal && modelsMeta ? (
                  <p className="text-xs text-muted-foreground">
                    Discovered models: <span className="text-foreground">{modelsMeta.count}</span> (last refreshed{" "}
                    <span className="text-foreground">{formatTime(modelsMeta.fetchedAt)}</span>)
                  </p>
                ) : null}
              </div>

              {settings.ai.connectionMode === "proxy" && (
                <div className="grid gap-2">
                  <Label htmlFor="proxy-base-url">Proxy Base URL</Label>
                  <Input
                    id="proxy-base-url"
                    placeholder="https://my-proxy.example.com"
                    value={settings.ai.proxyBaseUrl}
                    onChange={(e) =>
                      setSettings((prev) => ({ ...prev, ai: { ...prev.ai, proxyBaseUrl: e.target.value } }))
                    }
                    className={cn("max-w-xl", !settings.ai.proxyBaseUrl.trim() && "border-destructive")}
                  />
                  <p className="text-xs text-muted-foreground max-w-xl">
                    Must be OpenAI-compatible and allow browser CORS. Example endpoints used by this app:
                    <code> /v1/chat/completions</code>, <code> /v1/images/generations</code>.
                  </p>
                  <div className="rounded-md border border-border bg-muted/30 p-3 max-w-xl">
                    <p className="text-xs font-medium mb-1">Proxy recommendations</p>
                    <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
                      <li>LiteLLM Proxy (OpenAI-compatible routing across many providers)</li>
                      <li>Self-hosted reverse proxy that adds CORS headers and forwards to your provider</li>
                      <li>For local models: run your model server behind a CORS-enabled proxy (or enable CORS on the server)</li>
                    </ul>
                  </div>
                </div>
              )}

              {settings.ai.connectionMode === "direct" && (
                <div className="grid gap-2">
                  <Label htmlFor="base-url">Base URL</Label>
                  <Input
                    id="base-url"
                    placeholder={AI_PROVIDERS[settings.ai.providerId].defaultBaseUrl || "https://api.example.com"}
                    value={settings.ai.baseUrl}
                    onChange={(e) => setSettings((prev) => ({ ...prev, ai: { ...prev.ai, baseUrl: e.target.value } }))}
                    className={cn("max-w-xl", !settings.ai.baseUrl.trim() && "border-destructive")}
                  />
                  <p className="text-xs text-muted-foreground max-w-xl">
                    This must be a CORS-enabled OpenAI-compatible endpoint if you want to call it directly from the browser.
                  </p>
                </div>
              )}

              {AI_PROVIDERS[settings.ai.providerId].requiresApiKey && (
                <div className="grid gap-2">
                  <Label htmlFor="api-key">API Key</Label>
                  <Input
                    id="api-key"
                    type="password"
                    placeholder="sk-..."
                    value={settings.ai.apiKey}
                    onChange={(e) => setSettings((prev) => ({ ...prev, ai: { ...prev.ai, apiKey: e.target.value } }))}
                    className={cn("max-w-xl", !settings.ai.apiKey && "border-destructive")}
                  />
                  <p className="text-xs text-muted-foreground max-w-xl">
                    Stored in <code>localStorage</code> on this device only.
                  </p>
                </div>
              )}

              <div className="grid gap-2">
                <Label>Selected model identifier</Label>
                <Input value={settings.ai.model} readOnly className="max-w-xl" />
              </div>

              {isLocal && AI_PROVIDERS[settings.ai.providerId].supportsModelDiscovery && (
                <div className="flex items-center gap-2 max-w-xl">
                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        const baseUrl = settings.ai.baseUrl.trim()
                        setRefreshingModels(true)
                        const models = await refreshDiscoveredModels("ollama", baseUrl)
                        setDiscoveredModels(models ?? [])
                        setModelsMeta(models ? { fetchedAt: Date.now(), count: models.length } : null)
                        toast({ title: "Models refreshed", description: `Found ${models?.length ?? 0} models.` })
                      } catch (err) {
                        toast({
                          title: "Refresh failed",
                          description: err instanceof Error ? err.message : "Could not refresh models.",
                          variant: "destructive",
                        })
                      } finally {
                        setRefreshingModels(false)
                      }
                    }}
                    disabled={!settings.ai.baseUrl.trim()}
                  >
                    {refreshingModels ? (
                      <>
                        <Spinner className="mr-2" /> Refreshing
                      </>
                    ) : (
                      "Refresh models"
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        const baseUrl = settings.ai.baseUrl.trim()
                        if (!baseUrl) return
                        setTesting(true)
                        const started = performance.now()
                        await refreshDiscoveredModels("ollama", baseUrl)
                        const ms = Math.round(performance.now() - started)
                        setTestResult({ ok: true, detail: `OK (${ms}ms)` })
                      } catch (err) {
                        setTestResult({
                          ok: false,
                          detail: err instanceof Error ? err.message : "Test failed",
                        })
                      } finally {
                        setTesting(false)
                      }
                    }}
                    disabled={!settings.ai.baseUrl.trim() || refreshingModels}
                  >
                    {testing ? (
                      <>
                        <Spinner className="mr-2" /> Testing
                      </>
                    ) : (
                      "Test connection"
                    )}
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Uses <code>/api/tags</code> (Ollama) on the Base URL.
                  </span>
                </div>
              )}

              {testResult ? (
                <div
                  className={cn(
                    "rounded-md border p-3 max-w-xl text-sm",
                    testResult.ok ? "border-green-500/30 bg-green-500/5" : "border-destructive/30 bg-destructive/5",
                  )}
                >
                  <p className="font-medium">Connection test</p>
                  <p className="text-muted-foreground">{testResult.detail}</p>
                </div>
              ) : null}
            </div>
          </SettingsSection>

          <SettingsSection title="Voice" description="Speech features (client-side)">
            <div className="space-y-4">
              <div className="flex items-center justify-between max-w-xl">
                <div className="space-y-0.5">
                  <Label>Auto-speak assistant replies</Label>
                  <p className="text-sm text-muted-foreground">If enabled, new assistant messages will be spoken aloud.</p>
                </div>
                <Switch
                  checked={settings.voice.autoSpeak}
                  onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, voice: { autoSpeak: checked } }))}
                />
              </div>
            </div>
          </SettingsSection>

          <div className="flex justify-end gap-2 pt-6 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setSettings(loadLocalSettings())
              }}
            >
              Reset
            </Button>
            <Button
              onClick={() => {
                try {
                  saveLocalSettings(settings)
                  toast({ title: "Saved", description: "Settings saved locally." })
                } catch (err) {
                  toast({
                    title: "Save failed",
                    description: err instanceof Error ? err.message : "Could not save settings.",
                    variant: "destructive",
                  })
                }
              }}
            >
              Save Changes
            </Button>
          </div>
        </div>
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
