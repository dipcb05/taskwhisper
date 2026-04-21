"use client"

import { useState, useCallback, useMemo } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Recorder } from "@/components/voice/recorder"
import { ProcessingSteps } from "@/components/voice/processing-steps"
import { ResultDisplay } from "@/components/voice/result-display"
import { useStore, type VoiceNote } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Check, Mic, Sparkles } from "@/lib/icons"
import { apiFetch } from "@/lib/api"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"

type Stage = "record" | "processing" | "result"

const speechLanguages = [
  { value: "en-US", label: "English (US)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "bn-BD", label: "Bengali (Bangladesh)" },
  { value: "bn-IN", label: "Bengali (India)" },
  { value: "hi-IN", label: "Hindi (India)" },
]

function getSttEngine(provider: string) {
  switch (provider) {
    case "google":
      return "google_speech"
    case "groq":
      return "deepgram"
    case "openai":
    default:
      return "openai_whisper"
  }
}

function normalizeTasks(tasks: any[] = []) {
  return tasks.map((task: any, index: number) => ({
    id: String(task.id ?? `task-${index + 1}`),
    text: String(task.text ?? task.title ?? task.description ?? "Untitled task"),
    completed: Boolean(task.completed ?? false),
    priority:
      task.priority === "high" || task.priority === "medium" || task.priority === "low"
        ? task.priority
        : "medium",
    dueDate: task.dueDate ?? task.due_date,
    syncState: "local" as const,
  }))
}

function getJobFailureMessage(job: any) {
  const failedEvent = [...(job?.events ?? [])].reverse().find((event: any) => event?.status === "failed")
  if (!failedEvent?.error) {
    return "Job processing failed on backend server."
  }

  const stage = failedEvent.error.stage || failedEvent.stage || "pipeline"
  const message = failedEvent.error.message || "Unknown backend error."

  return `${stage}: ${message}`
}

function mapBackendStageToUiStep(stage: string | null | undefined) {
  switch (stage) {
    case "voice_cleanup":
      return "enhancing"
    case "text_cleaning":
      return "cleaning"
    case "stt":
      return "transcribing"
    case "task_extraction":
      return "extracting"
    default:
      return null
  }
}

function formatStageLabel(stage: string | null | undefined) {
  switch (stage) {
    case "voice_cleanup":
      return "audio enhancement"
    case "stt":
      return "transcription"
    case "text_cleaning":
      return "text cleaning"
    case "task_extraction":
      return "task extraction"
    default:
      return "processing"
  }
}

export default function VoicePage() {
  const { addVoiceNote, settings } = useStore()
  const { user, loading: authLoading } = useAuth()
  const [stage, setStage] = useState<Stage>("record")
  const [currentStep, setCurrentStep] = useState<string | null>(null)
  const [completedSteps, setCompletedSteps] = useState<string[]>([])
  const [failedStep, setFailedStep] = useState<string | null>(null)
  const [result, setResult] = useState<VoiceNote | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [processingError, setProcessingError] = useState<{ stage: string | null; message: string } | null>(null)
  const [speechLanguage, setSpeechLanguage] = useState(() => {
    if (typeof navigator !== "undefined" && navigator.language) {
      const match = speechLanguages.find((language) => language.value === navigator.language)
      if (match) {
        return match.value
      }
    }
    return "en-US"
  })

  const supportsSpeechRecognition = useMemo(() => {
    if (typeof window === "undefined") return false
    return "SpeechRecognition" in window || "webkitSpeechRecognition" in window
  }, [])

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  const processTranscript = useCallback(
    async (blob: Blob | null, fallBackTranscript: string, duration: number, audioUrl?: string) => {
      if (authLoading) {
        setError("Your login session is still loading. Please try again in a moment.")
        setStage("record")
        return
      }

      if (!user) {
        setError("You must be logged in to process recordings.")
        setStage("record")
        return
      }

      if (!blob) {
        setError("No audio recording found.")
        setStage("record")
        return
      }

      setError(null)
      setProcessingError(null)
      setStage("processing")
      setCurrentStep("uploading")
      setCompletedSteps([])
      setFailedStep(null)

      try {
        const formData = new FormData()
        formData.append("file", blob, "audio.webm")
        const selectedVoiceProvider = settings.voiceProvider.provider || "openai"

        const options = {
          cleaning_engine: "local-ffmpeg",
          stt_engine: getSttEngine(selectedVoiceProvider),
          text_prompt_id: "cleanup_base",
          extraction_prompt_id: "task_extraction_notion",
          export_targets: [],
          provider_options: {
            stt: {
              provider: selectedVoiceProvider,
              model: settings.voiceProvider.model || "whisper-1",
              api_key: settings.voiceProvider.apiKey,
              language: speechLanguage,
            },
            llm: {
              provider: settings.taskComposer.provider || "openai",
              model: settings.taskComposer.model || "gpt-4o",
              api_key: settings.taskComposer.apiKey,
            },
          },
        }

        formData.append("options", JSON.stringify(options))

        const res = await apiFetch("/api/jobs", {
          method: "POST",
          requireAuth: true,
          body: formData,
        })

        if (!res.ok) {
          throw new Error(`Failed to submit job to backend (${res.status})`)
        }

        const jobData = await res.json()
        const jobId = jobData.id

        setCompletedSteps(["uploading"])
        setCurrentStep("enhancing")

        let job = jobData
        while (job.status === "PENDING" || job.status === "PROCESSING") {
          await delay(2000)
          const statusRes = await apiFetch(`/api/jobs/${jobId}`, { requireAuth: true })
          if (!statusRes.ok) throw new Error("Failed to poll job status")
          
          job = await statusRes.json()

          const completedEvents = job.events
            .filter((e: any) => e.status === "completed")
            .map((e: any) => e.stage)
            
          const currentUIPools: string[] = ["uploading"]
          for (const ev of completedEvents) {
             const mapped = mapBackendStageToUiStep(ev)
             if (mapped && !currentUIPools.includes(mapped)) currentUIPools.push(mapped)
          }

          setCompletedSteps(currentUIPools)

          const lastEvent = job.events[job.events.length - 1]
          if (lastEvent && lastEvent.status === "processing") {
             const mappedStep = mapBackendStageToUiStep(lastEvent.stage)
             if (mappedStep) setCurrentStep(mappedStep)
          }
        }

        if (job.status === "FAILED") {
          const failedEvent = [...(job.events ?? [])].reverse().find((event: any) => event?.status === "failed")
          const failedStage = failedEvent?.error?.stage || failedEvent?.stage || null
          const mappedFailedStep = mapBackendStageToUiStep(failedStage)
          setCurrentStep(null)
          setFailedStep(mappedFailedStep)
          setProcessingError({
            stage: failedStage,
            message: getJobFailureMessage(job),
          })
          return
        }

        if (job.status === "COMPLETED" && job.result) {
          const { cleaned_transcript, tasks, audio_url } = job.result
          
          const newNote: VoiceNote = {
            id: jobId,
            title: `Recording ${new Date().toLocaleTimeString()}`,
            createdAt: new Date(),
            duration,
            audioUrl: audioUrl || audio_url,
            rawTranscription: cleaned_transcript || fallBackTranscript,
            cleanedText: cleaned_transcript,
            tasks: normalizeTasks(tasks || []),
            status: "complete",
            syncState: "local",
          }

          setResult(newNote)
          addVoiceNote(newNote)
          setStage("result")
          setCurrentStep(null)
        }
      } catch (err: any) {
        console.error("Backend processing failed:", err)
        setCurrentStep(null)
        setFailedStep(null)
        setProcessingError({
          stage: null,
          message: "Backend failed: " + err.message,
        })
      }
    },
    [addVoiceNote, authLoading, settings.taskComposer, settings.voiceProvider, speechLanguage, user],
  )

  const handleRecordingComplete = useCallback(
    async (blob: Blob, duration: number, transcript: string) => {
      const audioUrl = URL.createObjectURL(blob)
      await processTranscript(blob, transcript, duration, audioUrl)
    },
    [processTranscript],
  )

  const handleFileUpload = useCallback(
    async (_file: File) => {
      setError("Upload transcription is not available in the browser yet. Please record directly to transcribe.")
      setCurrentStep(null)
      setCompletedSteps([])
      setStage("record")
    },
    [],
  )

  const handleNewRecording = () => {
    setStage("record")
    setCurrentStep(null)
    setCompletedSteps([])
    setFailedStep(null)
    setResult(null)
    setError(null)
    setProcessingError(null)
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="flex-1 lg:ml-0">
        <div className="p-4 lg:p-8 max-w-4xl mx-auto">
          <div className="flex items-center gap-4 mb-8 pt-12 lg:pt-0">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {stage === "record" && "New Recording"}
                {stage === "processing" && "Processing..."}
                {stage === "result" && "Results"}
              </h1>
              <p className="text-muted-foreground">
                {stage === "record" && (
                  <span className="flex items-center gap-2">
                    <Mic className="w-3.5 h-3.5 text-cyan-500" /> {settings.voiceProvider.provider} 
                    <span className="mx-1 opacity-30">|</span> 
                    <Sparkles className="w-3.5 h-3.5 text-purple-500" /> {settings.taskComposer.provider}
                  </span>
                )}
                {stage === "processing" && "AI is analyzing your audio"}
                {stage === "result" && "Your transcription and tasks are ready"}
              </p>
            </div>
          </div>

          {stage === "record" && (
            <Card>
              <CardContent className="p-8">
                <div className="space-y-4">
                  {!supportsSpeechRecognition && (
                    <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-700 dark:text-yellow-400">
                      Speech recognition is not supported in this browser. Use Chrome or Edge for live transcription.
                    </div>
                  )}
                  {authLoading && (
                    <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-700 dark:text-blue-300">
                      Restoring your login session...
                    </div>
                  )}
                  {error && (
                    <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-400">
                      {error}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="speech-language">Speech language</Label>
                    <Select value={speechLanguage} onValueChange={setSpeechLanguage}>
                      <SelectTrigger id="speech-language">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        {speechLanguages.map((language) => (
                          <SelectItem key={language.value} value={language.value}>
                            {language.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      If words are missing, switch this to match your spoken language.
                    </p>
                  </div>
                  <Recorder
                    onRecordingComplete={handleRecordingComplete}
                    onFileUpload={handleFileUpload}
                    language={speechLanguage}
                    disabled={authLoading}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {stage === "processing" && (
            <Card>
              <CardHeader>
                <CardTitle>Processing Audio</CardTitle>
              </CardHeader>
              <CardContent>
                <ProcessingSteps currentStep={currentStep} completedSteps={completedSteps} failedStep={failedStep} />
              </CardContent>
            </Card>
          )}

          {stage === "result" && result && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-500">
                  <Check className="w-5 h-5" />
                  <span className="font-medium">Processing Complete</span>
                </div>
                <Button onClick={handleNewRecording}>New Recording</Button>
              </div>
              <ResultDisplay note={result} />
            </div>
          )}
        </div>
      </main>

      <Dialog
        open={Boolean(processingError)}
        onOpenChange={(open) => {
          if (!open) {
            handleNewRecording()
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Processing failed</DialogTitle>
            <DialogDescription>
              {processingError?.stage ? `The ${formatStageLabel(processingError.stage)} step could not be completed.` : "The recording could not be processed."}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            {processingError?.message}
          </div>
          <DialogFooter>
            <Button onClick={handleNewRecording}>Back to recording</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
