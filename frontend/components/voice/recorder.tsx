"use client"

import type React from "react"

import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { WaveformVisualizer } from "./waveform-visualizer"
import { Mic, Square, Upload } from "@/lib/icons"
import { cn } from "@/lib/utils"

interface RecorderProps {
  onRecordingComplete: (blob: Blob, duration: number, transcript: string) => void
  onFileUpload: (file: File) => void
  language?: string
  className?: string
}

type SpeechRecognitionEvent = {
  resultIndex: number
  results: Array<{ isFinal: boolean; 0: { transcript: string } }>
}

type SpeechRecognitionErrorEvent = {
  error: string
  message?: string
}

type SpeechRecognitionInstance = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

export function Recorder({ onRecordingComplete, onFileUpload, language, className }: RecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const finalizeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const recordingTimeRef = useRef(0)
  const isRecordingRef = useRef(false)
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const transcriptRef = useRef("")
  const interimTranscriptRef = useRef("")
  const stopRequestedRef = useRef(false)
  const recognitionEndedRef = useRef(true)
  const recognitionStartedRef = useRef(false)
  const audioBlobRef = useRef<Blob | null>(null)

  useEffect(() => {
    return () => {
      isRecordingRef.current = false
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      if (finalizeTimeoutRef.current) {
        clearTimeout(finalizeTimeoutRef.current)
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop()
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  const finalizeRecording = useCallback(() => {
    if (!stopRequestedRef.current || !audioBlobRef.current || !recognitionEndedRef.current) {
      return
    }

    const transcript = [transcriptRef.current, interimTranscriptRef.current].filter(Boolean).join(" ").trim()
    const blob = audioBlobRef.current
    audioBlobRef.current = null
    stopRequestedRef.current = false
    recognitionStartedRef.current = false
    recognitionEndedRef.current = true

    if (finalizeTimeoutRef.current) {
      clearTimeout(finalizeTimeoutRef.current)
      finalizeTimeoutRef.current = null
    }

    onRecordingComplete(blob, recordingTimeRef.current, transcript)
  }, [onRecordingComplete])

  const startSpeechRecognition = useCallback(() => {
    if (typeof window === "undefined") {
      recognitionStartedRef.current = false
      recognitionEndedRef.current = true
      return false
    }
    const windowWithSpeech = window as unknown as {
      SpeechRecognition?: new () => SpeechRecognitionInstance
      webkitSpeechRecognition?: new () => SpeechRecognitionInstance
    }
    const SpeechRecognitionConstructor =
      windowWithSpeech.SpeechRecognition || windowWithSpeech.webkitSpeechRecognition

    if (!SpeechRecognitionConstructor) {
      recognitionStartedRef.current = false
      recognitionEndedRef.current = true
      return false
    }

    const recognition = new SpeechRecognitionConstructor()
    recognition.lang = language || navigator.language || "en-US"
    recognition.continuous = true
    recognition.interimResults = true

    recognition.onresult = (event) => {
      let finalText = ""
      let interimText = ""
      for (let i = 0; i < event.results.length; i += 1) {
        const result = event.results[i]
        const text = result?.[0]?.transcript ?? ""
        if (result?.isFinal) {
          finalText += text
        } else {
          interimText += text
        }
      }

      transcriptRef.current = finalText.trim()
      interimTranscriptRef.current = interimText.trim()
    }

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error, event.message)
    }

    recognition.onend = () => {
      if (stopRequestedRef.current || !isRecordingRef.current) {
        recognitionEndedRef.current = true
        finalizeRecording()
        return
      }
      if (isRecordingRef.current) {
        try {
          recognition.start()
        } catch {
          // Ignore restart errors; some browsers throw if called too quickly.
        }
      }
    }

    recognitionRef.current = recognition
    try {
      recognition.start()
      recognitionStartedRef.current = true
      recognitionEndedRef.current = false
      return true
    } catch (err) {
      console.error("Failed to start speech recognition:", err)
      recognitionStartedRef.current = false
      recognitionEndedRef.current = true
      return false
    }
  }, [finalizeRecording, language])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []
      transcriptRef.current = ""
      interimTranscriptRef.current = ""
      stopRequestedRef.current = false
      recognitionEndedRef.current = true
      recognitionStartedRef.current = false
      audioBlobRef.current = null
      if (finalizeTimeoutRef.current) {
        clearTimeout(finalizeTimeoutRef.current)
        finalizeTimeoutRef.current = null
      }

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.onstop = () => {
        if (!stopRequestedRef.current) {
          stopRequestedRef.current = true
        }
        audioBlobRef.current = new Blob(chunksRef.current, { type: "audio/webm" })
        stream.getTracks().forEach((track) => track.stop())
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
        finalizeRecording()
      }

      mediaRecorder.start(100)
      setIsRecording(true)
      setRecordingTime(0)
      recordingTimeRef.current = 0
      isRecordingRef.current = true
      const speechStarted = startSpeechRecognition()
      recognitionEndedRef.current = !speechStarted

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const next = prev + 1
          recordingTimeRef.current = next
          return next
        })
      }, 1000)
    } catch (err) {
      console.error("Failed to start recording:", err)
    }
  }, [finalizeRecording, startSpeechRecognition])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      isRecordingRef.current = false
      stopRequestedRef.current = true
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      if (recognitionStartedRef.current && !finalizeTimeoutRef.current) {
        finalizeTimeoutRef.current = setTimeout(() => {
          recognitionEndedRef.current = true
          finalizeRecording()
        }, 800)
      }
    }
  }, [finalizeRecording, isRecording])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onFileUpload(file)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className={cn("flex flex-col items-center gap-6", className)}>
      {/* Waveform */}
      <div className="w-full max-w-sm h-20 bg-muted/30 rounded-xl overflow-hidden flex items-center justify-center">
        <WaveformVisualizer isActive={isRecording} />
      </div>

      {/* Timer */}
      <div className="text-3xl font-mono text-foreground tabular-nums">{formatTime(recordingTime)}</div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="audio/*" className="hidden" />
        <Button
          variant="outline"
          size="lg"
          onClick={() => fileInputRef.current?.click()}
          disabled={isRecording}
          className="gap-2"
        >
          <Upload className="w-5 h-5" />
          Upload
        </Button>
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={cn(
            "w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300",
            isRecording
              ? "bg-destructive hover:bg-destructive/90 animate-pulse"
              : "bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700",
          )}
        >
          {isRecording ? <Square className="w-8 h-8 text-white" /> : <Mic className="w-10 h-10 text-white" />}
        </button>
        <div className="w-[88px]" /> {/* Spacer for centering */}
      </div>

      <p className="text-sm text-muted-foreground">
        {isRecording ? "Recording... Tap to stop" : "Tap to start recording or upload a file"}
      </p>
    </div>
  )
}
