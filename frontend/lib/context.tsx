"use client"

import type React from "react"
import { createContext, useContext, useState, useCallback, useEffect } from "react"
import type { ViewMode, Transcription, ProcessingState, ProcessingStep } from "./types"

interface AppContextType {
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void

  isDark: boolean
  toggleTheme: () => void

  transcriptions: Transcription[]
  selectedTranscription: Transcription | null
  setSelectedTranscription: (t: Transcription | null) => void
  addTranscription: (t: Transcription) => void
  updateTranscription: (id: string, updates: Partial<Transcription>) => void

  processingState: ProcessingState
  startProcessing: () => void
  advanceProcessing: () => void
  resetProcessing: () => void

  isRecording: boolean
  setIsRecording: (v: boolean) => void
  recordingTime: number
  setRecordingTime: (v: number) => void
}

const AppContext = createContext<AppContextType | null>(null)

const mockTranscriptions: Transcription[] = [
  {
    id: "1",
    title: "Weekly Team Standup",
    createdAt: new Date(Date.now() - 86400000),
    duration: 245,
    rawTranscription:
      "Okay so for this week we need to finish the dashboard redesign, Sarah mentioned she's blocked on the API integration, and don't forget the client presentation is on Friday at 2pm.",
    cleanedText:
      "This week's priorities include completing the dashboard redesign. Sarah reported a blocker on API integration that needs attention. The client presentation is scheduled for Friday at 2:00 PM.",
    tasks: [
      { id: "1a", text: "Complete dashboard redesign", completed: false, priority: "high" },
      { id: "1b", text: "Resolve API integration blocker for Sarah", completed: false, priority: "high" },
      {
        id: "1c",
        text: "Prepare for client presentation",
        completed: false,
        priority: "medium",
        dueDate: "Friday 2:00 PM",
      },
    ],
    status: "complete",
  },
  {
    id: "2",
    title: "Product Ideas Brainstorm",
    createdAt: new Date(Date.now() - 172800000),
    duration: 180,
    rawTranscription:
      "What if we added a dark mode toggle, users keep asking for it. Also the mobile experience needs work, maybe a bottom navigation would help. Oh and we should look into adding keyboard shortcuts.",
    cleanedText:
      "User-requested features to consider: Dark mode toggle (frequently requested), improved mobile experience with potential bottom navigation, and keyboard shortcuts for power users.",
    tasks: [
      { id: "2a", text: "Implement dark mode toggle", completed: true, priority: "medium" },
      { id: "2b", text: "Redesign mobile navigation", completed: false, priority: "medium" },
      { id: "2c", text: "Add keyboard shortcuts", completed: false, priority: "low" },
    ],
    status: "complete",
  },
  {
    id: "3",
    title: "Bug Report Notes",
    createdAt: new Date(Date.now() - 259200000),
    duration: 92,
    rawTranscription:
      "Found a bug where the export button doesn't work on Safari, need to fix that ASAP. Also the loading spinner keeps showing even after data loads sometimes.",
    cleanedText:
      "Critical bugs identified: Export functionality broken on Safari browser (high priority). Intermittent loading spinner display issue after data load completes.",
    tasks: [
      { id: "3a", text: "Fix Safari export button bug", completed: true, priority: "high" },
      { id: "3b", text: "Debug loading spinner persistence issue", completed: false, priority: "medium" },
    ],
    status: "complete",
  },
]

const processingSteps: ProcessingStep[] = [
  "uploading",
  "analyzing",
  "transcribing",
  "cleaning",
  "extracting",
  "complete",
]

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [viewMode, setViewMode] = useState<ViewMode>("dashboard")
  const [isDark, setIsDark] = useState(true)
  const [transcriptions, setTranscriptions] = useState<Transcription[]>(mockTranscriptions)
  const [selectedTranscription, setSelectedTranscription] = useState<Transcription | null>(null)
  const [processingState, setProcessingState] = useState<ProcessingState>({
    currentStep: null,
    completedSteps: [],
    progress: 0,
  })
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [isDark])

  useEffect(() => {
    if (viewMode === "ai-lab" && !isDark) {
      setIsDark(true)
    }
  }, [viewMode, isDark])

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => !prev)
  }, [])

  const addTranscription = useCallback((t: Transcription) => {
    setTranscriptions((prev) => [t, ...prev])
  }, [])

  const updateTranscription = useCallback((id: string, updates: Partial<Transcription>) => {
    setTranscriptions((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)))
  }, [])

  const startProcessing = useCallback(() => {
    setProcessingState({
      currentStep: "uploading",
      completedSteps: [],
      progress: 0,
    })
  }, [])

  const advanceProcessing = useCallback(() => {
    setProcessingState((prev) => {
      if (!prev.currentStep) return prev

      const currentIndex = processingSteps.indexOf(prev.currentStep)
      const nextIndex = currentIndex + 1

      if (nextIndex >= processingSteps.length) {
        return {
          currentStep: "complete",
          completedSteps: processingSteps,
          progress: 100,
        }
      }

      return {
        currentStep: processingSteps[nextIndex],
        completedSteps: [...prev.completedSteps, prev.currentStep],
        progress: Math.round((nextIndex / (processingSteps.length - 1)) * 100),
      }
    })
  }, [])

  const resetProcessing = useCallback(() => {
    setProcessingState({
      currentStep: null,
      completedSteps: [],
      progress: 0,
    })
  }, [])

  return (
    <AppContext.Provider
      value={{
        viewMode,
        setViewMode,
        isDark,
        toggleTheme,
        transcriptions,
        selectedTranscription,
        setSelectedTranscription,
        addTranscription,
        updateTranscription,
        processingState,
        startProcessing,
        advanceProcessing,
        resetProcessing,
        isRecording,
        setIsRecording,
        recordingTime,
        setRecordingTime,
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error("useApp must be used within AppProvider")
  }
  return context
}
