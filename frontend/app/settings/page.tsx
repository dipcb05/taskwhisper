"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { useStore } from "@/lib/store"
import { useAuth } from "@/hooks/use-auth"
import { apiFetch } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Eye, EyeOff, Check, Mic, Sparkles, Cloud, Loader2, AlertCircle
} from "@/lib/icons"

type IntegrationField = {
  key: string
  label: string
  required: boolean
  secret: boolean
  oauth_managed: boolean
  placeholder?: string | null
  help_text?: string | null
}

type IntegrationCatalogItem = {
  provider: string
  name: string
  description: string
  oauth_supported: boolean
  oauth_label?: string | null
  fields: IntegrationField[]
}

const voiceProviders = [
  { id: "openai", name: "OpenAI" },
  { id: "groq", name: "Groq" },
  { id: "google", name: "Google" },
]

const composerProviders = [
  { id: "openai", name: "OpenAI" },
  { id: "anthropic", name: "Anthropic" },
  { id: "google", name: "Google" },
  { id: "groq", name: "Groq" },
  { id: "xai", name: "xAI" },
]

export default function SettingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const {
    settings, updateVoiceConfig, updateComposerConfig, voiceNotes, setVoiceNotes
  } = useStore()
  const { user } = useAuth()

  const [showVoiceKey, setShowVoiceKey] = useState(false)
  const [showComposerKey, setShowComposerKey] = useState(false)
  const [voiceSaved, setVoiceSaved] = useState(false)
  const [composerSaved, setComposerSaved] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [voiceModels, setVoiceModels] = useState<string[]>([])
  const [composerModels, setComposerModels] = useState<string[]>([])
  const [integrationCatalog, setIntegrationCatalog] = useState<IntegrationCatalogItem[]>([])
  const [integrationConfigs, setIntegrationConfigs] = useState<Record<string, Record<string, string>>>({})
  const [showIntegrationSecrets, setShowIntegrationSecrets] = useState<Record<string, boolean>>({})
  const [integrationSaving, setIntegrationSaving] = useState<Record<string, boolean>>({})
  const [integrationSyncing, setIntegrationSyncing] = useState<Record<string, boolean>>({})
  const [integrationConnecting, setIntegrationConnecting] = useState<Record<string, boolean>>({})
  const [integrationMessages, setIntegrationMessages] = useState<Record<string, string>>({})
  const [integrationErrors, setIntegrationErrors] = useState<Record<string, string>>({})

  const syncedCount = voiceNotes.filter((note) => note.syncState === "synced").length
  const localCount = voiceNotes.filter((note) => note.syncState !== "synced").length

  const syncNotesPayload = {
    notes: voiceNotes.map((note) => ({
      id: note.id,
      title: note.title,
      created_at: note.createdAt.toISOString(),
      duration_seconds: note.duration,
      audio_url: note.audioUrl,
      raw_transcription: note.rawTranscription,
      cleaned_text: note.cleanedText,
      status: note.status,
      sync_state: note.syncState ?? "local",
      tasks: note.tasks.map((task) => ({
        id: task.id,
        text: task.text,
        completed: task.completed,
        priority: task.priority,
        due_date: task.dueDate,
        sync_state: task.syncState ?? "local",
      })),
    })),
  }

  useEffect(() => {
    const loadModels = async (provider: string, apiKey: string, kind: "stt" | "llm", setter: (models: string[]) => void) => {
      try {
        const response = await apiFetch(`/api/providers/${provider}/models?kind=${kind}`, {
          requireAuth: true,
          headers: {
            "x-api-key": apiKey || "",
          },
        })
        if (!response.ok) {
          return
        }
        const data = await response.json()
        setter(Array.isArray(data.models) ? data.models : [])
      } catch (error) {
        console.error(`Failed to load ${kind} models for ${provider}:`, error)
      }
    }

    void loadModels(settings.voiceProvider.provider, settings.voiceProvider.apiKey, "stt", setVoiceModels)
  }, [settings.voiceProvider.apiKey, settings.voiceProvider.provider])

  useEffect(() => {
    if (!voiceModels.length) {
      return
    }
    if (!settings.voiceProvider.model || !voiceModels.includes(settings.voiceProvider.model)) {
      updateVoiceConfig({ model: voiceModels[0] })
    }
  }, [settings.voiceProvider.model, updateVoiceConfig, voiceModels])

  useEffect(() => {
    const loadModels = async () => {
      try {
        const response = await apiFetch(`/api/providers/${settings.taskComposer.provider}/models?kind=llm`, {
          requireAuth: true,
          headers: {
            "x-api-key": settings.taskComposer.apiKey || "",
          },
        })
        if (!response.ok) {
          return
        }
        const data = await response.json()
        setComposerModels(Array.isArray(data.models) ? data.models : [])
      } catch (error) {
        console.error(`Failed to load llm models for ${settings.taskComposer.provider}:`, error)
      }
    }

    void loadModels()
  }, [settings.taskComposer.apiKey, settings.taskComposer.provider])

  useEffect(() => {
    if (!composerModels.length) {
      return
    }
    if (!settings.taskComposer.model || !composerModels.includes(settings.taskComposer.model)) {
      updateComposerConfig({ model: composerModels[0] })
    }
  }, [composerModels, settings.taskComposer.model, updateComposerConfig])

  useEffect(() => {
    const oauthProvider = searchParams.get("oauth")
    const oauthStatus = searchParams.get("status")
    const oauthMessage = searchParams.get("message")
    if (!oauthProvider || !oauthStatus) {
      return
    }

    if (oauthStatus === "success") {
      setIntegrationMessages((prev) => ({ ...prev, [oauthProvider]: "Connected successfully." }))
      setIntegrationErrors((prev) => ({ ...prev, [oauthProvider]: "" }))
    } else {
      setIntegrationErrors((prev) => ({
        ...prev,
        [oauthProvider]: oauthMessage || "OAuth connection failed.",
      }))
    }

    router.replace("/settings")
  }, [router, searchParams])

  useEffect(() => {
    const loadIntegrations = async () => {
      try {
        const [catalogRes, configRes] = await Promise.all([
          apiFetch("/api/integrations/catalog", { requireAuth: true }),
          apiFetch("/api/integrations", { requireAuth: true }),
        ])
        if (catalogRes.ok) {
          const catalogData = await catalogRes.json()
          setIntegrationCatalog(Array.isArray(catalogData) ? catalogData : [])
        }
        if (configRes.ok) {
          const configData = await configRes.json()
          if (Array.isArray(configData)) {
            const nextConfigs: Record<string, Record<string, string>> = {}
            for (const item of configData) {
              if (item?.provider && item?.config && typeof item.config === "object") {
                nextConfigs[item.provider] = Object.fromEntries(
                  Object.entries(item.config).map(([key, value]) => [key, typeof value === "string" ? value : String(value ?? "")]),
                )
              }
            }
            setIntegrationConfigs(nextConfigs)
          }
        }
      } catch (error) {
        console.error("Failed to load integrations:", error)
      }
    }

    void loadIntegrations()
  }, [])

  const updateIntegrationField = (provider: string, key: string, value: string) => {
    setIntegrationConfigs((prev) => ({
      ...prev,
      [provider]: {
        ...(prev[provider] ?? {}),
        [key]: value,
      },
    }))
  }

  const saveIntegration = async (provider: string) => {
    setIntegrationSaving((prev) => ({ ...prev, [provider]: true }))
    setIntegrationErrors((prev) => ({ ...prev, [provider]: "" }))
    setIntegrationMessages((prev) => ({ ...prev, [provider]: "" }))

    try {
      const response = await apiFetch("/api/integrations", {
        method: "POST",
        requireAuth: true,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider,
          config: integrationConfigs[provider] ?? {},
        }),
      })
      if (!response.ok) {
        const errorBody = await response.json().catch(() => null)
        throw new Error(errorBody?.detail || `Failed to save integration (${response.status})`)
      }
      setIntegrationMessages((prev) => ({ ...prev, [provider]: "Saved." }))
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save integration"
      setIntegrationErrors((prev) => ({ ...prev, [provider]: message }))
    } finally {
      setIntegrationSaving((prev) => ({ ...prev, [provider]: false }))
    }
  }

  const connectIntegration = async (provider: string) => {
    setIntegrationConnecting((prev) => ({ ...prev, [provider]: true }))
    setIntegrationErrors((prev) => ({ ...prev, [provider]: "" }))
    setIntegrationMessages((prev) => ({ ...prev, [provider]: "" }))
    try {
      const response = await apiFetch(`/api/integrations/oauth/start/${provider}`, {
        method: "POST",
        requireAuth: true,
      })
      if (!response.ok) {
        const errorBody = await response.json().catch(() => null)
        throw new Error(errorBody?.detail || `Failed to start OAuth flow (${response.status})`)
      }
      const data = await response.json()
      if (!data.authorize_url) {
        throw new Error("Missing authorization URL.")
      }
      window.location.href = data.authorize_url
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to start OAuth flow"
      setIntegrationErrors((prev) => ({ ...prev, [provider]: message }))
      setIntegrationConnecting((prev) => ({ ...prev, [provider]: false }))
    }
  }

  const syncIntegration = async (provider: string) => {
    if (voiceNotes.length === 0) {
      setIntegrationErrors((prev) => ({ ...prev, [provider]: "No notes available to sync yet." }))
      setIntegrationMessages((prev) => ({ ...prev, [provider]: "" }))
      return
    }

    setIntegrationSyncing((prev) => ({ ...prev, [provider]: true }))
    setIntegrationErrors((prev) => ({ ...prev, [provider]: "" }))
    setIntegrationMessages((prev) => ({ ...prev, [provider]: "" }))
    try {
      const response = await apiFetch("/api/integrations/sync", {
        method: "POST",
        requireAuth: true,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider,
          notes: syncNotesPayload.notes,
        }),
      })
      if (!response.ok) {
        const errorBody = await response.json().catch(() => null)
        throw new Error(errorBody?.detail || `Failed to sync integration (${response.status})`)
      }
      const data = await response.json()
      const successCount = Array.isArray(data.results) ? data.results.filter((item: any) => item.success).length : 0
      const totalCount = Array.isArray(data.results) ? data.results.length : 0
      setIntegrationMessages((prev) => ({
        ...prev,
        [provider]: `Synced ${successCount}/${totalCount} items.`,
      }))
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to sync integration"
      setIntegrationErrors((prev) => ({ ...prev, [provider]: message }))
    } finally {
      setIntegrationSyncing((prev) => ({ ...prev, [provider]: false }))
    }
  }

  const handleCloudSync = async () => {
    if (!user) {
      setSyncError("Sign in first to sync your notes to TaskWhisper Cloud.")
      setSyncMessage(null)
      return
    }

    if (voiceNotes.length === 0) {
      setSyncError(null)
      setSyncMessage("No notes available to sync yet.")
      return
    }

    setIsSyncing(true)
    setSyncError(null)
    setSyncMessage(null)
    setVoiceNotes(
      voiceNotes.map((note) => ({
        ...note,
        syncState: "syncing",
        tasks: note.tasks.map((task) => ({ ...task, syncState: "syncing" })),
      })),
    )

    try {
      const response = await apiFetch("/api/cloud/sync", {
        method: "POST",
        requireAuth: true,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(syncNotesPayload),
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null)
        throw new Error(errorBody?.detail || `Sync failed with status ${response.status}`)
      }

      const result = await response.json()
      setVoiceNotes(
        voiceNotes.map((note) => ({
          ...note,
          syncState: "synced",
          tasks: note.tasks.map((task) => ({ ...task, syncState: "synced" })),
        })),
      )
      setSyncMessage(`Synced ${result.synced_notes} notes and ${result.synced_tasks} tasks to TaskWhisper Cloud.`)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown sync error"
      setVoiceNotes(
        voiceNotes.map((note) => ({
          ...note,
          syncState: "error",
          tasks: note.tasks.map((task) => ({ ...task, syncState: "error" })),
        })),
      )
      setSyncError(message)
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground transition-colors duration-300">
      <Sidebar />

      <main className="flex-1 lg:ml-0 overflow-y-auto">
        <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-8">
          <div className="mb-8 pt-12 lg:pt-0">
            <h1 className="text-3xl font-bold tracking-tight">System Configuration</h1>
          </div>

          <div className="space-y-8">
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-cyan-500" />
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mic className="w-5 h-5 text-cyan-500" />
                    Speech-to-Text Pipeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-muted-foreground">Interface</Label>
                      <Select
                        value={settings.voiceProvider.provider}
                        onValueChange={(value) => {
                          updateVoiceConfig({ provider: value, model: "" })
                        }}
                      >
                        <SelectTrigger className="h-12 rounded-xl bg-muted/50 border-none">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {voiceProviders.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-muted-foreground">Model</Label>
                      <Select
                        value={settings.voiceProvider.model}
                        onValueChange={(value) => updateVoiceConfig({ model: value })}
                      >
                        <SelectTrigger className="h-12 rounded-xl bg-muted/50 border-none">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {voiceModels.map((m) => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Secure Credentials</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          type={showVoiceKey ? "text" : "password"}
                          placeholder="sk-..."
                          value={settings.voiceProvider.apiKey}
                          onChange={(e) => updateVoiceConfig({ apiKey: e.target.value })}
                          className="h-12 rounded-xl bg-muted/50 border-none pr-12"
                        />
                        <button onClick={() => setShowVoiceKey(!showVoiceKey)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                          {showVoiceKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <Button onClick={() => setVoiceSaved(true)} className="h-12 rounded-xl px-6">
                        {voiceSaved ? <Check className="w-4 h-4" /> : "Save"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card/50 backdrop-blur-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-purple-500" />
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Sparkles className="w-5 h-5 text-purple-500" />
                    Intelligence & Reasoning
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-muted-foreground">Model Authority</Label>
                      <Select
                        value={settings.taskComposer.provider}
                        onValueChange={(value) => {
                          updateComposerConfig({ provider: value, model: "" })
                        }}
                      >
                        <SelectTrigger className="h-12 rounded-xl bg-muted/50 border-none">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {composerProviders.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase text-muted-foreground">Model</Label>
                      <Select
                        value={settings.taskComposer.model}
                        onValueChange={(value) => updateComposerConfig({ model: value })}
                      >
                        <SelectTrigger className="h-12 rounded-xl bg-muted/50 border-none">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {composerModels.map((m) => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase text-muted-foreground">Secure Credentials</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          type={showComposerKey ? "text" : "password"}
                          placeholder="Key..."
                          value={settings.taskComposer.apiKey}
                          onChange={(e) => updateComposerConfig({ apiKey: e.target.value })}
                          className="h-12 rounded-xl bg-muted/50 border-none pr-12"
                        />
                        <button onClick={() => setShowComposerKey(!showComposerKey)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                          {showComposerKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <Button onClick={() => setComposerSaved(true)} className="h-12 rounded-xl px-6">
                        {composerSaved ? <Check className="w-4 h-4" /> : "Save"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card/50 backdrop-blur-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500" />
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Cloud className="w-5 h-5 text-blue-500" />
                    TaskWhisper Cloud Sync
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="rounded-xl bg-muted/40 p-4">
                      <p className="text-xs font-bold uppercase text-muted-foreground">Signed In</p>
                      <p className="mt-2 text-sm">{user?.email || "No active session"}</p>
                    </div>
                    <div className="rounded-xl bg-muted/40 p-4">
                      <p className="text-xs font-bold uppercase text-muted-foreground">Local Notes</p>
                      <p className="mt-2 text-2xl font-semibold">{localCount}</p>
                    </div>
                    <div className="rounded-xl bg-muted/40 p-4">
                      <p className="text-xs font-bold uppercase text-muted-foreground">Cloud Synced</p>
                      <p className="mt-2 text-2xl font-semibold">{syncedCount}</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl bg-muted/40 p-4">
                    <div>
                      <p className="font-medium">Manual Sync</p>
                      <p className="text-sm text-muted-foreground">
                        Push your current recordings and extracted tasks to TaskWhisper Cloud.
                      </p>
                    </div>
                    <Button onClick={handleCloudSync} disabled={isSyncing || voiceNotes.length === 0}>
                      {isSyncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Cloud className="w-4 h-4 mr-2" />}
                      {isSyncing ? "Syncing..." : "Sync to Cloud"}
                    </Button>
                  </div>

                  {syncMessage && (
                    <div className="rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
                      {syncMessage}
                    </div>
                  )}

                  {syncError && (
                    <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-400">
                      <span className="inline-flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {syncError}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card/50 backdrop-blur-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Cloud className="w-5 h-5 text-emerald-500" />
                    Workspace Syncs
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {integrationCatalog.length === 0 ? (
                    <div className="rounded-xl bg-muted/40 p-4 text-sm text-muted-foreground">
                      No workspace integrations available.
                    </div>
                  ) : (
                    integrationCatalog.map((integration) => (
                      <div key={integration.provider} className="rounded-2xl border border-border/60 bg-muted/20 p-4 space-y-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-medium">{integration.name}</p>
                            <p className="text-sm text-muted-foreground">{integration.description}</p>
                          </div>
                          <div className="flex gap-2">
                            {integration.oauth_supported && (
                              <Button
                                variant="outline"
                                onClick={() => connectIntegration(integration.provider)}
                                disabled={integrationConnecting[integration.provider]}
                              >
                                {integrationConnecting[integration.provider] ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                                {integration.oauth_label ?? "Connect"}
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              onClick={() => saveIntegration(integration.provider)}
                              disabled={integrationSaving[integration.provider]}
                            >
                              {integrationSaving[integration.provider] ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                              Save
                            </Button>
                            <Button
                              onClick={() => syncIntegration(integration.provider)}
                              disabled={integrationSyncing[integration.provider] || voiceNotes.length === 0}
                            >
                              {integrationSyncing[integration.provider] ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                              Sync
                            </Button>
                          </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          {integration.fields.filter((field) => !field.oauth_managed).map((field) => {
                            const isSecretVisible = Boolean(showIntegrationSecrets[`${integration.provider}:${field.key}`])
                            return (
                              <div key={field.key} className="space-y-2">
                                <Label className="text-xs font-bold uppercase text-muted-foreground">{field.label}</Label>
                                <div className="relative">
                                  <Input
                                    type={field.secret && !isSecretVisible ? "password" : "text"}
                                    placeholder={field.placeholder ?? ""}
                                    value={integrationConfigs[integration.provider]?.[field.key] ?? ""}
                                    onChange={(e) => updateIntegrationField(integration.provider, field.key, e.target.value)}
                                    className={field.secret ? "pr-12" : ""}
                                  />
                                  {field.secret && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setShowIntegrationSecrets((prev) => ({
                                          ...prev,
                                          [`${integration.provider}:${field.key}`]: !prev[`${integration.provider}:${field.key}`],
                                        }))
                                      }
                                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                                    >
                                      {isSecretVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                  )}
                                </div>
                                {field.help_text && <p className="text-xs text-muted-foreground">{field.help_text}</p>}
                              </div>
                            )
                          })}
                        </div>

                        {integrationMessages[integration.provider] && (
                          <div className="rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-400">
                            {integrationMessages[integration.provider]}
                          </div>
                        )}

                        {integrationErrors[integration.provider] && (
                          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-400">
                            <span className="inline-flex items-center gap-2">
                              <AlertCircle className="w-4 h-4" />
                              {integrationErrors[integration.provider]}
                            </span>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
