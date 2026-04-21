
export interface VoiceNote {
  id: string
  user_id: string
  created_at: string
  title: string
  duration_seconds: number
  blob_url: string
  stt_engine: string
  language: string
  transcription_raw: string
  transcription_clean: string
  metadata: Record<string, unknown>
  sync_state: "local" | "syncing" | "synced" | "error"
}

export interface Task {
  id: string
  user_id: string
  voice_note_id: string
  created_at: string
  content: string
  status: "open" | "completed" | "archived"
  due_at: string | null
  priority: number
  metadata: Record<string, unknown>
  sync_state: "local" | "syncing" | "synced" | "error"
}

export interface User {
  id: string
  email: string
  avatar_url: string | null
  created_at: string
}
