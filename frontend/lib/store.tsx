"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"

export interface Task {
  id: string
  text: string
  completed: boolean
  priority: "high" | "medium" | "low"
  dueDate?: string
  syncState?: "local" | "syncing" | "synced" | "error"
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
  syncState?: "local" | "syncing" | "synced" | "error"
}

export interface ServiceConfig {
  provider: string
  model: string
  apiKey: string
}

interface Settings {
  theme: "dark" | "light"
  voiceProvider: ServiceConfig
  taskComposer: ServiceConfig
}

const SUPPORTED_VOICE_PROVIDERS = new Set(["openai", "groq", "google"])
const SUPPORTED_COMPOSER_PROVIDERS = new Set(["openai", "anthropic", "google", "groq", "xai"])

interface StoreContextType {
  theme: "dark" | "light"
  setTheme: (theme: "dark" | "light") => void

  settings: Settings
  updateSettings: (updates: Partial<Settings>) => void
  updateVoiceConfig: (updates: Partial<ServiceConfig>) => void
  updateComposerConfig: (updates: Partial<ServiceConfig>) => void

  voiceNotes: VoiceNote[]
  setVoiceNotes: (notes: VoiceNote[]) => void
  addVoiceNote: (note: VoiceNote) => void
  updateVoiceNote: (id: string, updates: Partial<VoiceNote>) => void

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
}

function sanitizeTask(raw: unknown): Task {
  const parsed = raw && typeof raw === "object" ? (raw as Partial<Task>) : {}
  const priority = parsed.priority === "high" || parsed.priority === "medium" || parsed.priority === "low"
    ? parsed.priority
    : "medium"

  return {
    id: typeof parsed.id === "string" ? parsed.id : crypto.randomUUID(),
    text: typeof parsed.text === "string" ? parsed.text : "Untitled task",
    completed: Boolean(parsed.completed),
    priority,
    dueDate: typeof parsed.dueDate === "string" ? parsed.dueDate : undefined,
    syncState:
      parsed.syncState === "local" || parsed.syncState === "syncing" || parsed.syncState === "synced" || parsed.syncState === "error"
        ? parsed.syncState
        : "local",
  }
}

function sanitizeVoiceNotes(raw: unknown): VoiceNote[] {
  if (!Array.isArray(raw)) {
    return []
  }

  return raw
    .map((item) => {
      const parsed = item && typeof item === "object" ? (item as Partial<VoiceNote>) : {}
      const createdAt = parsed.createdAt ? new Date(parsed.createdAt) : new Date()
      if (Number.isNaN(createdAt.getTime())) {
        return null
      }

      return {
        id: typeof parsed.id === "string" ? parsed.id : crypto.randomUUID(),
        title: typeof parsed.title === "string" ? parsed.title : "Untitled recording",
        createdAt,
        duration: typeof parsed.duration === "number" ? parsed.duration : 0,
        audioUrl: typeof parsed.audioUrl === "string" ? parsed.audioUrl : undefined,
        rawTranscription: typeof parsed.rawTranscription === "string" ? parsed.rawTranscription : "",
        cleanedText: typeof parsed.cleanedText === "string" ? parsed.cleanedText : "",
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks.map(sanitizeTask) : [],
        status: parsed.status === "processing" || parsed.status === "error" ? parsed.status : "complete",
        syncState:
          parsed.syncState === "local" || parsed.syncState === "syncing" || parsed.syncState === "synced" || parsed.syncState === "error"
            ? parsed.syncState
            : "local",
      }
    })
    .filter((note): note is VoiceNote => Boolean(note))
}

function sanitizeSettings(raw: unknown): Settings {
  const parsed = (raw && typeof raw === "object") ? (raw as Partial<Settings>) : {}
  const voiceProvider = parsed.voiceProvider ?? defaultSettings.voiceProvider
  const taskComposer = parsed.taskComposer ?? defaultSettings.taskComposer

  return {
    theme: parsed.theme === "light" ? "light" : defaultSettings.theme,
    voiceProvider: {
      ...defaultSettings.voiceProvider,
      ...voiceProvider,
      provider: SUPPORTED_VOICE_PROVIDERS.has(voiceProvider.provider ?? "")
        ? voiceProvider.provider!
        : defaultSettings.voiceProvider.provider,
    },
    taskComposer: {
      ...defaultSettings.taskComposer,
      ...taskComposer,
      provider: SUPPORTED_COMPOSER_PROVIDERS.has(taskComposer.provider ?? "")
        ? taskComposer.provider!
        : defaultSettings.taskComposer.provider,
    },
  }
}

const StoreContext = createContext<StoreContextType | null>(null)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStep, setProcessingStep] = useState<string | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem("taskwhisper-settings")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setSettings(sanitizeSettings(parsed))
      } catch (e) {
        console.error("Failed to parse settings", e)
      }
    }
  }, [])

  useEffect(() => {
    const savedNotes = localStorage.getItem("taskwhisper-voice-notes")
    if (savedNotes) {
      try {
        const parsed = JSON.parse(savedNotes)
        setVoiceNotes(sanitizeVoiceNotes(parsed))
      } catch (e) {
        console.error("Failed to parse voice notes", e)
      }
    }
  }, [])

  useEffect(() => {
    if (settings.theme === "dark") {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [settings.theme])

  useEffect(() => {
    localStorage.setItem("taskwhisper-voice-notes", JSON.stringify(voiceNotes))
  }, [voiceNotes])

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
