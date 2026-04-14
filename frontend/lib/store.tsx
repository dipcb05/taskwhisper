"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"

export interface Task {
  id: string
  text: string
  completed: boolean
  priority: "high" | "medium" | "low"
  dueDate?: string
}

export interface VoiceNote {
  id: string
  title: string
  createdAt: Date
  duration: number
  audioUrl?: string
  rawTranscription: string
  cleanedText: string
  tasks: Task[]
  status: "processing" | "complete" | "error"
}

export interface ServiceConfig {
  provider: string
  model: string
  apiKey: string
  isMCP?: boolean
  mcpUrl?: string
}

export interface MCPServer {
  id: string
  name: string
  url: string
  status: "connected" | "disconnected" | "connecting"
}

interface Settings {
  theme: "dark" | "light"
  voiceProvider: ServiceConfig
  taskComposer: ServiceConfig
  mcpServers: MCPServer[]
}

interface StoreContextType {
  // Theme
  theme: "dark" | "light"
  setTheme: (theme: "dark" | "light") => void

  // Settings
  settings: Settings
  updateSettings: (updates: Partial<Settings>) => void
  updateVoiceConfig: (updates: Partial<ServiceConfig>) => void
  updateComposerConfig: (updates: Partial<ServiceConfig>) => void
  
  // MCP Management
  addMCPServer: (server: Omit<MCPServer, "status">) => void
  removeMCPServer: (id: string) => void
  updateMCPServerStatus: (id: string, status: MCPServer["status"]) => void
  connectToMCPServer: (id: string, url: string) => Promise<void>
  disconnectFromMCPServer: (id: string) => Promise<void>

  // Voice Notes
  voiceNotes: VoiceNote[]
  setVoiceNotes: (notes: VoiceNote[]) => void
  addVoiceNote: (note: VoiceNote) => void
  updateVoiceNote: (id: string, updates: Partial<VoiceNote>) => void

  // Processing state
  isProcessing: boolean
  setIsProcessing: (v: boolean) => void
  processingStep: string | null
  setProcessingStep: (step: string | null) => void
}

const defaultSettings: Settings = {
  theme: "dark",
  voiceProvider: {
    provider: "openai",
    model: "whisper-1",
    apiKey: "",
  },
  taskComposer: {
    provider: "openai",
    model: "gpt-4o-mini",
    apiKey: "",
  },
  mcpServers: [],
}

const StoreContext = createContext<StoreContextType | null>(null)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStep, setProcessingStep] = useState<string | null>(null)

  // Load settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("taskwhisper-settings")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setSettings((prev) => ({ ...prev, ...parsed }))
      } catch (e) {
        console.error("Failed to parse settings", e)
      }
    }
  }, [])

  // Apply theme to document
  useEffect(() => {
    if (settings.theme === "dark") {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [settings.theme])

  const updateSettings = useCallback((updates: Partial<Settings>) => {
    setSettings((prev) => {
      const newSettings = { ...prev, ...updates }
      localStorage.setItem("taskwhisper-settings", JSON.stringify(newSettings))
      return newSettings
    })
  }, [])

  const updateVoiceConfig = useCallback((updates: Partial<ServiceConfig>) => {
    setSettings((prev) => {
      const newSettings = {
        ...prev,
        voiceProvider: { ...prev.voiceProvider, ...updates },
      }
      localStorage.setItem("taskwhisper-settings", JSON.stringify(newSettings))
      return newSettings
    })
  }, [])

  const updateComposerConfig = useCallback((updates: Partial<ServiceConfig>) => {
    setSettings((prev) => {
      const newSettings = {
        ...prev,
        taskComposer: { ...prev.taskComposer, ...updates },
      }
      localStorage.setItem("taskwhisper-settings", JSON.stringify(newSettings))
      return newSettings
    })
  }, [])

  const addMCPServer = useCallback((server: Omit<MCPServer, "status">) => {
    updateSettings({
      mcpServers: [...settings.mcpServers, { ...server, status: "disconnected" }]
    })
  }, [settings.mcpServers, updateSettings])

  const removeMCPServer = useCallback((id: string) => {
    updateSettings({
      mcpServers: settings.mcpServers.filter(s => s.id !== id)
    })
  }, [settings.mcpServers, updateSettings])

  const updateMCPServerStatus = useCallback((id: string, status: MCPServer["status"]) => {
    setSettings((prev) => {
      const newSettings = {
        ...prev,
        mcpServers: prev.mcpServers.map(s => s.id === id ? { ...s, status } : s)
      }
      return newSettings
    })
  }, [])

  const connectToMCPServer = useCallback(async (id: string, url: string) => {
    updateMCPServerStatus(id, "connecting")
    try {
      const { mcpManager } = await import("./mcp")
      await mcpManager.connect(id, url)
      updateMCPServerStatus(id, "connected")
    } catch (e) {
      updateMCPServerStatus(id, "disconnected")
      console.error("MCP Connection failed", e)
    }
  }, [updateMCPServerStatus])

  const disconnectFromMCPServer = useCallback(async (id: string) => {
    const { mcpManager } = await import("./mcp")
    await mcpManager.disconnect(id)
    updateMCPServerStatus(id, "disconnected")
  }, [updateMCPServerStatus])

  const setTheme = useCallback((theme: "dark" | "light") => {
    updateSettings({ theme })
  }, [updateSettings])

  const addVoiceNote = useCallback((note: VoiceNote) => {
    setVoiceNotes((prev) => [note, ...prev])
  }, [])

  const updateVoiceNote = useCallback((id: string, updates: Partial<VoiceNote>) => {
    setVoiceNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...updates } : n)))
  }, [])

  return (
    <StoreContext.Provider
      value={{
        theme: settings.theme,
        setTheme,
        settings,
        updateSettings,
        updateVoiceConfig,
        updateComposerConfig,
        addMCPServer,
        removeMCPServer,
        updateMCPServerStatus,
        connectToMCPServer,
        disconnectFromMCPServer,
        voiceNotes,
        setVoiceNotes,
        addVoiceNote,
        updateVoiceNote,
        isProcessing,
        setIsProcessing,
        processingStep,
        setProcessingStep,
      }}
    >
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const context = useContext(StoreContext)
  if (!context) {
    throw new Error("useStore must be used within StoreProvider")
  }
  return context
}
