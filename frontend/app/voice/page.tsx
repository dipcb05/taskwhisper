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

  const cleanTranscript = (text: string) =>
    text
      .replace(/\b(um+|uh+|like|you know|i mean)\b/gi, "")
      .replace(/\s+/g, " ")
      .replace(/\s+([,.!?])/g, "$1")
      .trim()

  const processTranscript = useCallback(
    async (blob: Blob | null, fallBackTranscript: string, duration: number, audioUrl?: string) => {
      setError(null)
      setStage("processing")
      setCurrentStep("uploading")
      setCompletedSteps([])
      await delay(300)
      setCompletedSteps(["uploading"])

      setCurrentStep("transcribing")
      let transcriptText = fallBackTranscript.trim()

      if (blob && settings.voiceProvider.apiKey) {
        try {
          const formData = new FormData()
          formData.append("file", blob)
          formData.append("provider", settings.voiceProvider.provider)
          formData.append("model", settings.voiceProvider.model)
          formData.append("apiKey", settings.voiceProvider.apiKey)

          const sttRes = await fetch("/api/transcribe", { method: "POST", body: formData })
          if (sttRes.ok) {
            const sttData = await sttRes.json()
            if (sttData.text) {
              transcriptText = sttData.text.trim()
            }
          }
        } catch (err) {
          console.error("Transcription API failed, using fallback transcript.", err)
        }
      }

      const trimmed = transcriptText.trim()
      if (!trimmed) {
        setError(
          supportsSpeechRecognition
            ? "No speech detected. Try speaking a bit longer or in a quieter environment."
            : "Speech recognition is not supported in this browser. Try Chrome or Edge."
        )
        setCurrentStep(null)
        setCompletedSteps([])
        setStage("record")
        return
      }

      await delay(400)
      setCompletedSteps(["uploading", "transcribing"])

      setCurrentStep("cleaning")
      const cleanedText = cleanTranscript(trimmed)
      await delay(200)
      setCompletedSteps(["uploading", "transcribing", "cleaning"])

      setCurrentStep("extracting")
      let tasks = []
      try {
        const response = await fetch("/api/extract-tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: cleanedText,
            provider: settings.taskComposer.provider,
            model: settings.taskComposer.model,
            apiKey: settings.taskComposer.apiKey,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to extract tasks")
        }

        const data = await response.json()
        tasks = data.tasks
      } catch (err: any) {
        console.error("AI Extraction failed:", err)
        setError("AI Extraction failed: " + err.message + ". Please verify your API key in Settings.")
        setCurrentStep(null)
        setCompletedSteps([])
        setStage("record")
        return
      }
      
      await delay(200)
      setCompletedSteps(["uploading", "transcribing", "cleaning", "extracting"])
      setCurrentStep(null)

      const newNote: VoiceNote = {
        id: Date.now().toString(),
        title: `Recording ${new Date().toLocaleTimeString()}`,
        createdAt: new Date(),
        duration,
        audioUrl,
        rawTranscription: trimmed,
        cleanedText,
        tasks,
        status: "complete",
      }

      setResult(newNote)
      addVoiceNote(newNote)
      setStage("result")
    },
    [addVoiceNote, supportsSpeechRecognition, settings.taskComposer, settings.voiceProvider],
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
