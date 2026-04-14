"use client"

import { useState, useCallback } from "react"
import { Zap, History, Plus, ChevronUp, X, Play, Pause, ChevronRight } from "@/lib/icons"
import { cn } from "@/lib/utils"
import { useApp } from "@/lib/context"
import { Button } from "@/components/ui/button"
import { RecorderButton } from "@/components/core/recorder-button"
import { ProcessingTimeline } from "@/components/core/processing-timeline"
import { TaskList } from "@/components/core/task-list"
import { ExportMenu } from "@/components/core/export-menu"
import { Waveform } from "@/components/core/waveform"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import type { Transcription } from "@/lib/types"

type SheetView = "none" | "history" | "detail" | "processing"

export function MobileMode() {
  const { transcriptions, processingState, startProcessing, resetProcessing, isRecording } = useApp()

  const [sheetView, setSheetView] = useState<SheetView>("none")
  const [selectedItem, setSelectedItem] = useState<Transcription | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const handleRecordingComplete = useCallback(() => {
    startProcessing()
    setSheetView("processing")
  }, [startProcessing])

  const handleUpload = useCallback(() => {
    startProcessing()
    setSheetView("processing")
  }, [startProcessing])

  const handleSelectItem = (item: Transcription) => {
    setSelectedItem(item)
    setSheetView("detail")
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const formatDate = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days === 0) return "Today"
    if (days === 1) return "Yesterday"
    return `${days}d ago`
  }

  const isProcessing = processingState.currentStep !== null && processingState.currentStep !== "complete"
  const isComplete = processingState.currentStep === "complete"

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold">TaskWhisper</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSheetView(sheetView === "history" ? "none" : "history")}
          >
            <History className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Main content - centered record button */}
      <main className="flex-1 flex flex-col items-center justify-center p-6">
        {/* Waveform visualization */}
        <div className="w-full max-w-xs h-20 mb-8 rounded-xl bg-muted/30 border overflow-hidden">
          <Waveform isActive={isRecording} barCount={30} />
        </div>

        {/* Large record button */}
        <RecorderButton size="xl" variant="mobile" onRecordingComplete={handleRecordingComplete} />

        {/* Upload button */}
        <Button
          variant="outline"
          className="mt-8 bg-transparent"
          onClick={() => {
            // Trigger file input
            const input = document.createElement("input")
            input.type = "file"
            input.accept = "audio/*"
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0]
              if (file) handleUpload()
            }
            input.click()
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Upload Audio
        </Button>

        {/* Quick stats */}
        <div className="flex items-center gap-6 mt-12 text-sm text-muted-foreground">
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">{transcriptions.length}</div>
            <div>Recordings</div>
          </div>
          <div className="w-px h-8 bg-border" />
          <div className="text-center">
            <div className="text-2xl font-bold text-foreground">
              {transcriptions.reduce((acc, t) => acc + t.tasks.length, 0)}
            </div>
            <div>Tasks</div>
          </div>
        </div>
      </main>

      {/* Bottom sheets */}
      {sheetView !== "none" && (
        <div
          className="fixed inset-0 z-50 bg-black/50"
          onClick={() => {
            if (!isProcessing) {
              setSheetView("none")
              setSelectedItem(null)
            }
          }}
        >
          <div
            className={cn(
              "absolute bottom-0 left-0 right-0 bg-background rounded-t-2xl animate-slide-up",
              "max-h-[85vh] flex flex-col",
            )}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet handle */}
            <div className="flex justify-center py-3">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
            </div>

            {/* History view */}
            {sheetView === "history" && (
              <div className="flex-1 overflow-auto px-4 pb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">History</h2>
                  <Button variant="ghost" size="icon" onClick={() => setSheetView("none")}>
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                <div className="space-y-2">
                  {transcriptions.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleSelectItem(t)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg border bg-card text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{t.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(t.createdAt)} · {t.tasks.length} tasks
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Detail view */}
            {sheetView === "detail" && selectedItem && (
              <div className="flex-1 overflow-auto px-4 pb-8">
                <div className="flex items-center justify-between mb-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedItem(null)
                      setSheetView("history")
                    }}
                  >
                    <ChevronUp className="w-4 h-4 mr-1 rotate-[-90deg]" />
                    Back
                  </Button>
                  <ExportMenu transcription={selectedItem} />
                </div>

                <h2 className="text-lg font-semibold mb-2">{selectedItem.title}</h2>

                {/* Audio player */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 mb-4">
                  <Button variant="outline" size="icon" onClick={() => setIsPlaying(!isPlaying)} className="shrink-0">
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                  <div className="flex-1 h-8 overflow-hidden rounded bg-muted">
                    <Waveform isActive={isPlaying} barCount={25} />
                  </div>
                  <span className="text-sm font-mono">{formatDuration(selectedItem.duration)}</span>
                </div>

                {/* Accordion content */}
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="transcription">
                    <AccordionTrigger>Raw Transcription</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm text-muted-foreground leading-relaxed">{selectedItem.rawTranscription}</p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="cleaned">
                    <AccordionTrigger>Cleaned Text</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm leading-relaxed">{selectedItem.cleanedText}</p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="tasks">
                    <AccordionTrigger>Tasks ({selectedItem.tasks.length})</AccordionTrigger>
                    <AccordionContent>
                      <TaskList tasks={selectedItem.tasks} variant="compact" />
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            )}

            {/* Processing view */}
            {sheetView === "processing" && (
              <div className="flex-1 overflow-auto px-4 pb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">Processing</h2>
                  {isComplete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        resetProcessing()
                        setSheetView("none")
                      }}
                    >
                      <X className="w-5 h-5" />
                    </Button>
                  )}
                </div>

                <ProcessingTimeline variant="compact" />

                {isComplete && (
                  <div className="mt-6 space-y-3">
                    <Button
                      className="w-full"
                      onClick={() => {
                        setSelectedItem(transcriptions[0])
                        setSheetView("detail")
                      }}
                    >
                      View Results
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full bg-transparent"
                      onClick={() => {
                        resetProcessing()
                        setSheetView("none")
                      }}
                    >
                      Done
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
