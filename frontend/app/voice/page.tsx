"use client"

import { useState, useCallback, useMemo } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { Recorder } from "@/components/voice/recorder"
import { ProcessingSteps } from "@/components/voice/processing-steps"
import { ResultDisplay } from "@/components/voice/result-display"
import { useStore, type VoiceNote } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Check, Mic, Sparkles } from "@/lib/icons"
import { apiFetch } from "@/lib/api"
import Link from "next/link"

type Stage = "record" | "processing" | "result"

const speechLanguages = [
  { value: "en-US", label: "English (US)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "bn-BD", label: "Bengali (Bangladesh)" },
  { value: "bn-IN", label: "Bengali (India)" },
  { value: "hi-IN", label: "Hindi (India)" },
]

export default function VoicePage() {
  const { addVoiceNote, settings } = useStore()
  const [stage, setStage] = useState<Stage>("record")
  const [currentStep, setCurrentStep] = useState<string | null>(null)
  const [completedSteps, setCompletedSteps] = useState<string[]>([])
  const [result, setResult] = useState<VoiceNote | null>(null)
  const [error, setError] = useState<string | null>(null)
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
      if (!blob) {
        setError("No audio recording found.")
        setStage("record")
        return
      }

      setError(null)
      setStage("processing")
      setCurrentStep("uploading")
      setCompletedSteps([])

      try {
        const formData = new FormData()
        formData.append("file", blob, "audio.webm")

        const options = {
          cleaning_engine: "local-ffmpeg",
          stt_engine: "openai_whisper",
          text_prompt_id: "cleanup_base",
          extraction_prompt_id: "task_extraction_notion",
          export_targets: [],
          provider_options: {
            stt: {
              provider: settings.voiceProvider.provider || "openai",
              model: settings.voiceProvider.model || "whisper-1",
              api_key: settings.voiceProvider.apiKey,
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
        setCurrentStep("transcribing")

        let job = jobData
        while (job.status === "PENDING" || job.status === "PROCESSING") {
          await delay(2000)
          const statusRes = await apiFetch(`/api/jobs/${jobId}`, { requireAuth: true })
          if (!statusRes.ok) throw new Error("Failed to poll job status")
          
          job = await statusRes.json()

          // Automatically update UI steps based on backend events
          const completedEvents = job.events
            .filter((e: any) => e.status === "completed")
            .map((e: any) => e.stage)
            
          const currentStageMapping: Record<string, string> = {
             "voice_cleanup": "cleaning",
             "stt": "transcribing",
             "text_cleaning": "cleaning",
             "task_extraction": "extracting"
          }

          const currentUIPools: string[] = ["uploading"]
          for (const ev of completedEvents) {
             const mapped = currentStageMapping[ev]
             if (mapped && !currentUIPools.includes(mapped)) currentUIPools.push(mapped)
          }

          setCompletedSteps(currentUIPools)

          const lastEvent = job.events[job.events.length - 1]
          if (lastEvent && lastEvent.status === "processing") {
             const mappedStep = currentStageMapping[lastEvent.stage]
             if (mappedStep) setCurrentStep(mappedStep)
          }
        }

        if (job.status === "FAILED") {
           throw new Error("Job processing failed on backend server.")
        }

        if (job.status === "COMPLETED" && job.result) {
          const { cleaned_transcript, tasks } = job.result
          
          const newNote: VoiceNote = {
            id: jobId,
            title: `Recording ${new Date().toLocaleTimeString()}`,
            createdAt: new Date(),
            duration,
            audioUrl,
            rawTranscription: cleaned_transcript || fallBackTranscript,
            cleanedText: cleaned_transcript,
            tasks: tasks || [],
            status: "complete",
          }

          setResult(newNote)
          addVoiceNote(newNote)
          setStage("result")
          setCurrentStep(null)
        }
      } catch (err: any) {
        console.error("Backend processing failed:", err)
        setError("Backend failed: " + err.message)
        setCurrentStep(null)
        setStage("record")
      }
    },
    [addVoiceNote, settings.taskComposer, settings.voiceProvider],
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
    setResult(null)
    setError(null)
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="flex-1 lg:ml-0">
        <div className="p-4 lg:p-8 max-w-4xl mx-auto">
          {/* Header */}
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

          {/* Content */}
          {stage === "record" && (
            <Card>
              <CardContent className="p-8">
                <div className="space-y-4">
                  {!supportsSpeechRecognition && (
                    <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-700 dark:text-yellow-400">
                      Speech recognition is not supported in this browser. Use Chrome or Edge for live transcription.
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
                <ProcessingSteps currentStep={currentStep} completedSteps={completedSteps} />
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
    </div>
  )
}
