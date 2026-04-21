"use client"

import type React from "react"
import { createContext, useContext, useState, useCallback, useEffect } from "react"
import type { VoiceNote, Task } from "./db-types"

interface LocalDataStoreType {
  userProfile: { email?: string; avatarUrl?: string; theme?: "light" | "dark" | "system" } | null
  setUserProfile: (p: any) => void

  apiKeys: { openai?: string; anthropic?: string; gemini?: string }
  setApiKeys: (keys: Partial<{ openai?: string; anthropic?: string; gemini?: string }>) => void

  modelSettings: { provider?: string; model?: string }
  setModelSettings: (settings: Partial<{ provider?: string; model?: string }>) => void

  localNotes: VoiceNote[]
  addLocalNote: (note: VoiceNote) => void
  updateLocalNote: (id: string, updates: Partial<VoiceNote>) => void
  deleteLocalNote: (id: string) => void

  localTasks: Task[]
  addLocalTask: (task: Task) => void
  updateLocalTask: (id: string, updates: Partial<Task>) => void
  deleteLocalTask: (id: string) => void

  autoSync: boolean
  setAutoSync: (v: boolean) => void

  clearAllData: () => void
}

const LocalStoreContext = createContext<LocalDataStoreType | null>(null)

const STORAGE_KEYS = {
  userProfile: "taskwhisper_user_profile",
  apiKeys: "taskwhisper_api_keys",
  modelSettings: "taskwhisper_model_settings",
  localNotes: "taskwhisper_local_notes",
  localTasks: "taskwhisper_local_tasks",
  autoSync: "taskwhisper_auto_sync",
}

export function LocalStoreProvider({ children }: { children: React.ReactNode }) {
  const [userProfile, setUserProfileState] = useState<{
    email?: string
    avatarUrl?: string
    theme?: "light" | "dark" | "system"
  } | null>(null)
  const [apiKeys, setApiKeysState] = useState<{ openai?: string; anthropic?: string; gemini?: string }>({})
  const [modelSettings, setModelSettingsState] = useState<{ provider?: string; model?: string }>({})
  const [localNotes, setLocalNotesState] = useState<VoiceNote[]>([])
  const [localTasks, setLocalTasksState] = useState<Task[]>([])
  const [autoSync, setAutoSyncState] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const profile = localStorage.getItem(STORAGE_KEYS.userProfile)
    const keys = localStorage.getItem(STORAGE_KEYS.apiKeys)
    const settings = localStorage.getItem(STORAGE_KEYS.modelSettings)
    const notes = localStorage.getItem(STORAGE_KEYS.localNotes)
    const tasks = localStorage.getItem(STORAGE_KEYS.localTasks)
    const sync = localStorage.getItem(STORAGE_KEYS.autoSync)

    if (profile) setUserProfileState(JSON.parse(profile))
    if (keys) setApiKeysState(JSON.parse(keys))
    if (settings) setModelSettingsState(JSON.parse(settings))
    if (notes) setLocalNotesState(JSON.parse(notes))
    if (tasks) setLocalTasksState(JSON.parse(tasks))
    if (sync) setAutoSyncState(JSON.parse(sync))

    setMounted(true)
  }, [])

  const setUserProfile = useCallback((p: any) => {
    setUserProfileState(p)
    localStorage.setItem(STORAGE_KEYS.userProfile, JSON.stringify(p))
  }, [])

  const setApiKeys = useCallback((keys: Partial<{ openai?: string; anthropic?: string; gemini?: string }>) => {
    setApiKeysState((prev) => {
      const updated = { ...prev, ...keys }
      localStorage.setItem(STORAGE_KEYS.apiKeys, JSON.stringify(updated))
      return updated
    })
  }, [])

  const setModelSettings = useCallback((settings: Partial<{ provider?: string; model?: string }>) => {
    setModelSettingsState((prev) => {
      const updated = { ...prev, ...settings }
      localStorage.setItem(STORAGE_KEYS.modelSettings, JSON.stringify(updated))
      return updated
    })
  }, [])

  const addLocalNote = useCallback((note: VoiceNote) => {
    setLocalNotesState((prev) => {
      const updated = [note, ...prev]
      localStorage.setItem(STORAGE_KEYS.localNotes, JSON.stringify(updated))
      return updated
    })
  }, [])

  const updateLocalNote = useCallback((id: string, updates: Partial<VoiceNote>) => {
    setLocalNotesState((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, ...updates } : n))
      localStorage.setItem(STORAGE_KEYS.localNotes, JSON.stringify(updated))
      return updated
    })
  }, [])

  const deleteLocalNote = useCallback((id: string) => {
    setLocalNotesState((prev) => {
      const updated = prev.filter((n) => n.id !== id)
      localStorage.setItem(STORAGE_KEYS.localNotes, JSON.stringify(updated))
      return updated
    })
  }, [])

  const addLocalTask = useCallback((task: Task) => {
    setLocalTasksState((prev) => {
      const updated = [task, ...prev]
      localStorage.setItem(STORAGE_KEYS.localTasks, JSON.stringify(updated))
      return updated
    })
  }, [])

  const updateLocalTask = useCallback((id: string, updates: Partial<Task>) => {
    setLocalTasksState((prev) => {
      const updated = prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
      localStorage.setItem(STORAGE_KEYS.localTasks, JSON.stringify(updated))
      return updated
    })
  }, [])

  const deleteLocalTask = useCallback((id: string) => {
    setLocalTasksState((prev) => {
      const updated = prev.filter((t) => t.id !== id)
      localStorage.setItem(STORAGE_KEYS.localTasks, JSON.stringify(updated))
      return updated
    })
  }, [])

  const clearAllData = useCallback(() => {
    Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key))
    setUserProfileState(null)
    setApiKeysState({})
    setModelSettingsState({})
    setLocalNotesState([])
    setLocalTasksState([])
    setAutoSyncState(false)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <LocalStoreContext.Provider
      value={{
        userProfile,
        setUserProfile,
        apiKeys,
        setApiKeys,
        modelSettings,
        setModelSettings,
        localNotes,
        addLocalNote,
        updateLocalNote,
        deleteLocalNote,
        localTasks,
        addLocalTask,
        updateLocalTask,
        deleteLocalTask,
        autoSync,
        setAutoSync: (v) => {
          setAutoSyncState(v)
          localStorage.setItem(STORAGE_KEYS.autoSync, JSON.stringify(v))
        },
        clearAllData,
      }}
    >
      {children}
    </LocalStoreContext.Provider>
  )
}

export function useLocalStore() {
  const context = useContext(LocalStoreContext)
  if (!context) {
    throw new Error("useLocalStore must be used within LocalStoreProvider")
  }
  return context
}
