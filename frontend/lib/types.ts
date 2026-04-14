export type ViewMode = "ai-lab" | "dashboard" | "mobile"

export type ProcessingStep = "uploading" | "analyzing" | "transcribing" | "cleaning" | "extracting" | "complete"

export type SyncState = "local" | "syncing" | "synced" | "error"

export interface Task {
  id: string
  text: string
  completed: boolean
  priority?: "high" | "medium" | "low"
  dueDate?: string
  syncState?: SyncState
}

export interface Transcription {
  id: string
  title: string
  createdAt: Date
  duration: number
  audioUrl?: string
  rawTranscription: string
  cleanedText: string
  tasks: Task[]
  status: "processing" | "complete" | "error"
  syncState?: SyncState
  blobUrl?: string
}

export interface ProcessingState {
  currentStep: ProcessingStep | null
  completedSteps: ProcessingStep[]
  progress: number
  error?: string
}
