"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { apiFetch } from "@/lib/api"
import { type Task, useStore, type VoiceNote } from "@/lib/store"
import { useAuth } from "@/hooks/use-auth"

type BackendJob = {
  id: string
  status: "PENDING" | "PROCESSING" | "PARTIAL_SUCCESS" | "FAILED" | "COMPLETED"
  created_at: string
  updated_at: string
  result?: {
    audio_url?: string
    cleaned_transcript?: string
    translated_transcript?: string | null
    tasks?: unknown[]
    summary?: string | null
  } | null
  events?: Array<{
    stage?: string
    status?: string
    output?: Record<string, unknown>
    error?: Record<string, unknown>
    elapsed_ms?: number
  }>
}

function normalizeTasks(tasks: unknown): Task[] {
  if (!Array.isArray(tasks)) {
    return []
  }

  return tasks.map((task, index) => {
    const parsed = task && typeof task === "object" ? (task as Record<string, unknown>) : {}
    return {
      id: typeof parsed.id === "string" ? parsed.id : `task-${index + 1}`,
      text:
        typeof parsed.text === "string"
          ? parsed.text
          : typeof parsed.title === "string"
            ? parsed.title
            : typeof parsed.description === "string"
              ? parsed.description
              : "Untitled task",
      completed: Boolean(parsed.completed),
      priority:
        parsed.priority === "high" || parsed.priority === "medium" || parsed.priority === "low"
          ? parsed.priority
          : "medium",
      dueDate: typeof parsed.due_date === "string" ? parsed.due_date : typeof parsed.dueDate === "string" ? parsed.dueDate : undefined,
      syncState: "local",
    }
  })
}

function formatRecordingTitle(createdAt: Date) {
  return `Recording ${createdAt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
}

function getStageOutputText(job: BackendJob, stage: string) {
  const event = [...(job.events ?? [])].reverse().find((entry) => entry.stage === stage && entry.status === "completed")
  const output = event?.output
  return typeof output?.text === "string" ? output.text : null
}

function getStageDurationSeconds(job: BackendJob) {
  const cleanupEvent = [...(job.events ?? [])].find((entry) => entry.stage === "voice_cleanup" && entry.status === "completed")
  const output = cleanupEvent?.output
  const duration = output && typeof output.duration_seconds === "number" ? output.duration_seconds : null
  return duration ?? 0
}

function mapJobToVoiceNote(job: BackendJob): VoiceNote | null {
  if (job.status !== "COMPLETED" || !job.result) {
    return null
  }

  const createdAt = new Date(job.created_at)
  const rawTranscription = getStageOutputText(job, "stt") ?? job.result.cleaned_transcript ?? ""
  const cleanedText = job.result.cleaned_transcript ?? rawTranscription

  return {
    id: job.id,
    title: formatRecordingTitle(createdAt),
    createdAt,
    duration: getStageDurationSeconds(job),
    audioUrl: job.result.audio_url,
    rawTranscription,
    cleanedText,
    tasks: normalizeTasks(job.result.tasks),
    status: "complete",
    syncState: "synced",
  }
}

function mergeVoiceNotes(existing: VoiceNote[], incoming: VoiceNote[]) {
  const existingMap = new Map(existing.map((note) => [note.id, note]))
  const merged = incoming.map((note) => {
    const local = existingMap.get(note.id)
    if (!local) {
      return note
    }

    return {
      ...note,
      audioUrl: local.audioUrl?.startsWith("blob:") ? local.audioUrl : note.audioUrl ?? local.audioUrl,
      tasks: local.tasks.length ? local.tasks : note.tasks,
      syncState: local.syncState === "local" ? local.syncState : note.syncState,
    }
  })

  for (const note of existing) {
    if (!merged.some((entry) => entry.id === note.id)) {
      merged.push(note)
    }
  }

  return merged.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}

export function useBackendRecordings() {
  const { user, loading: authLoading } = useAuth()
  const { voiceNotes, setVoiceNotes } = useStore()
  const [jobs, setJobs] = useState<BackendJob[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const voiceNotesRef = useRef(voiceNotes)

  useEffect(() => {
    voiceNotesRef.current = voiceNotes
  }, [voiceNotes])

  const reload = useCallback(async () => {
    if (authLoading) {
      return
    }
    if (!user) {
      setJobs([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const response = await apiFetch("/api/jobs", { requireAuth: true })
      if (!response.ok) {
        throw new Error(`Failed to load recordings (${response.status})`)
      }

      const payload = (await response.json()) as BackendJob[]
      setJobs(payload)

      const backendNotes = payload
        .map(mapJobToVoiceNote)
        .filter((note): note is VoiceNote => Boolean(note))

      setVoiceNotes(mergeVoiceNotes(voiceNotesRef.current, backendNotes))
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load recordings"
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [authLoading, setVoiceNotes, user])

  useEffect(() => {
    void reload()
  }, [reload])

  const completedNotes = useMemo(
    () => jobs.map(mapJobToVoiceNote).filter((note): note is VoiceNote => Boolean(note)),
    [jobs],
  )

  return {
    jobs,
    completedNotes,
    loading,
    error,
    reload,
  }
}
