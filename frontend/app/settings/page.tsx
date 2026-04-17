"use client"

import { useState } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { useStore, type ServiceConfig, type MCPServer } from "@/lib/store"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Key, Brain, Eye, EyeOff, Trash2, Check,
  Mic, Sparkles, Plus, ExternalLink, RefreshCw, X
} from "@/lib/icons"
import { cn } from "@/lib/utils"

const voiceProviders = [
  { id: "openai", name: "OpenAI", models: ["whisper-1"] },
  { id: "groq", name: "Groq", models: ["whisper-large-v3", "distil-whisper-large-v3-en"] },
  { id: "google", name: "Google", models: ["gemini-1.5-flash"] },
  { id: "mcp", name: "Custom MCP", models: ["dynamic"] },
]

const composerProviders = [
  { id: "openai", name: "OpenAI", models: ["gpt-4o", "gpt-4o-mini"] },
  { id: "anthropic", name: "Anthropic", models: ["claude-3-5-sonnet-latest", "claude-3-opus-latest"] },
  { id: "google", name: "Google", models: ["gemini-1.5-pro", "gemini-1.5-flash"] },
  { id: "mcp", name: "Custom MCP", models: ["dynamic"] },
]

export default function SettingsPage() {
  const {
    theme, setTheme, settings, updateSettings, updateVoiceConfig,
    updateComposerConfig, addMCPServer, removeMCPServer,
    connectToMCPServer, disconnectFromMCPServer
  } = useStore()

  const [newServer, setNewServer] = useState({ name: "", url: "" })
  const [showVoiceKey, setShowVoiceKey] = useState(false)
  const [showComposerKey, setShowComposerKey] = useState(false)
  const [voiceSaved, setVoiceSaved] = useState(false)
  const [composerSaved, setComposerSaved] = useState(false)

  const handleAddServer = () => {
    if (!newServer.name || !newServer.url) return
    addMCPServer({ id: Date.now().toString(), name: newServer.name, url: newServer.url })
    setNewServer({ name: "", url: "" })
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground transition-colors duration-300">
      <Sidebar />

      <main className="flex-1 lg:ml-0 overflow-y-auto">
        <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="mb-8 pt-12 lg:pt-0">
            <h1 className="text-3xl font-bold tracking-tight">System Configuration</h1>
          </div>

          <Tabs defaultValue="api-provider" className="space-y-8">
            <TabsList className="inline-flex h-11 items-center justify-center rounded-xl bg-muted p-1 text-muted-foreground w-full max-w-lg">
              <TabsTrigger value="api-provider" className="rounded-lg flex-1 py-2">Providers</TabsTrigger>
              <TabsTrigger value="mcp" className="rounded-lg flex-1 py-2">
                <span className="flex items-center gap-2">
                  MCP Hub
                  {settings.mcpServers.length > 0 && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                      {settings.mcpServers.length}
                    </span>
                  )}
                </span>
              </TabsTrigger>
            </TabsList>


            {/* Providers Tab */}
            <TabsContent value="api-provider" className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">

              {/* Voice Processing */}
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
                          const p = voiceProviders.find(v => v.id === value)
                          updateVoiceConfig({ provider: value, model: p?.models[0] || "" })
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

                    {settings.voiceProvider.provider === "mcp" ? (
                      <div className="space-y-2 text-foreground">
                        <Label className="text-xs font-bold uppercase text-muted-foreground">Select MCP Server</Label>
                        <Select
                          value={settings.voiceProvider.mcpUrl}
                          onValueChange={(value) => updateVoiceConfig({ mcpUrl: value })}
                        >
                          <SelectTrigger className="h-12 rounded-xl bg-muted/50 border-none">
                            <SelectValue placeholder="Choose a server..." />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {settings.mcpServers.map((s) => (
                              <SelectItem key={s.id} value={s.url}>{s.name}</SelectItem>
                            ))}
                            {settings.mcpServers.length === 0 && (
                              <SelectItem value="none" disabled>No MCP servers found</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
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
                            {voiceProviders.find(v => v.id === settings.voiceProvider.provider)?.models.map((m) => (
                              <SelectItem key={m} value={m}>{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {settings.voiceProvider.provider !== "mcp" && (
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
                  )}
                </CardContent>
              </Card>

              {/* Task Composer */}
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
                          const p = composerProviders.find(v => v.id === value)
                          updateComposerConfig({ provider: value, model: p?.models[0] || "" })
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

                    {settings.taskComposer.provider === "mcp" ? (
                      <div className="space-y-2">
                        <Label className="text-xs font-bold uppercase text-muted-foreground">Select MCP Server</Label>
                        <Select
                          value={settings.taskComposer.mcpUrl}
                          onValueChange={(value) => updateComposerConfig({ mcpUrl: value })}
                        >
                          <SelectTrigger className="h-12 rounded-xl bg-muted/50 border-none">
                            <SelectValue placeholder="Choose a server..." />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {settings.mcpServers.map((s) => (
                              <SelectItem key={s.id} value={s.url}>{s.name}</SelectItem>
                            ))}
                            {settings.mcpServers.length === 0 && (
                              <SelectItem value="none" disabled>No MCP servers found</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
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
                            {composerProviders.find(v => v.id === settings.taskComposer.provider)?.models.map((m) => (
                              <SelectItem key={m} value={m}>{m}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {settings.taskComposer.provider !== "mcp" && (
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
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* MCP Hub Tab */}
            <TabsContent value="mcp" className="space-y-6 animate-in zoom-in-95 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader>
                    <CardTitle className="text-lg">Add MCP Remote Server</CardTitle>
                    <CardDescription>Connect to an external Model Context Protocol server via SSE or WebSocket.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Server Name</Label>
                      <Input
                        placeholder="e.g. Local Llama Bridge"
                        value={newServer.name}
                        onChange={(e) => setNewServer(prev => ({ ...prev, name: e.target.value }))}
                        className="rounded-xl border-primary/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Endpoint URL (SSE)</Label>
                      <Input
                        placeholder="https://... or http://localhost:..."
                        value={newServer.url}
                        onChange={(e) => setNewServer(prev => ({ ...prev, url: e.target.value }))}
                        className="rounded-xl border-primary/20"
                      />
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button onClick={handleAddServer} className="w-full rounded-xl gap-2 font-semibold">
                      <Plus className="w-4 h-4" /> Register Server
                    </Button>
                  </CardFooter>
                </Card>

                <div className="space-y-6 overflow-y-visible">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground px-2">Active Connections</h3>
                  <div className="space-y-3">
                    {settings.mcpServers.map((server) => (
                      <Card key={server.id} className="border-border/50 bg-card/30 backdrop-blur-sm group">
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-2 h-2 rounded-full transition-all duration-300",
                              server.status === "connected" ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" :
                                server.status === "connecting" ? "bg-yellow-500 animate-pulse" :
                                  "bg-muted-foreground/30"
                            )} />
                            <div>
                              <p className="font-semibold text-sm">{server.name}</p>
                              <p className="text-[10px] text-muted-foreground font-mono">{server.url}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                if (server.status === "connected") {
                                  disconnectFromMCPServer(server.id)
                                } else {
                                  connectToMCPServer(server.id, server.url)
                                }
                              }}
                            >
                              <RefreshCw className={cn("w-3.5 h-3.5", server.status === "connecting" && "animate-spin")} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeMCPServer(server.id)}
                              className="h-8 w-8 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    {settings.mcpServers.length === 0 && (
                      <div className="text-center py-12 border-2 border-dashed border-border rounded-2xl">
                        <p className="text-sm text-muted-foreground">No MCP servers registered yet.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  )
}
