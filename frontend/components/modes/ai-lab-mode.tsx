"use client"

import { useState, useCallback } from "react"
import { Zap, Activity, Cpu, Radio } from "@/lib/icons"
import { useApp } from "@/lib/context"
import { RecorderButton } from "@/components/core/recorder-button"
import { AudioUploader } from "@/components/core/audio-uploader"
import { ProcessingTimeline } from "@/components/core/processing-timeline"
import { Waveform } from "@/components/core/waveform"
import { ResultTabs } from "@/components/core/result-tabs"
import { Button } from "@/components/ui/button"

export function AILabMode() {
  const { isRecording, processingState, startProcessing, resetProcessing, transcriptions } = useApp()
  const [showResults, setShowResults] = useState(false)

  const handleRecordingComplete = useCallback(
    (duration: number) => {
      startProcessing()
    },
    [startProcessing],
  )

  const handleUpload = useCallback(
    (file: File) => {
      startProcessing()
    },
    [startProcessing],
  )

  const isProcessing = processingState.currentStep !== null && processingState.currentStep !== "complete"
  const isComplete = processingState.currentStep === "complete"

  // Show results after processing completes
  if (isComplete && !showResults) {
    setTimeout(() => setShowResults(true), 500)
  }

  return (
    <div className="min-h-screen bg-background grid-background relative overflow-hidden">
      {/* Scanline overlay */}
      <div className="absolute inset-0 scanlines pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 border-b border-border/30 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-neon-cyan/20 border border-neon-cyan/50 flex items-center justify-center glow-cyan">
                <Zap className="w-5 h-5 text-neon-cyan" />
              </div>
              <div>
                <h1 className="font-bold text-lg text-neon-cyan text-glow-cyan">TaskWhisper</h1>
                <p className="text-xs text-muted-foreground font-mono">AI LAB MODE</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-neon-green/10 border border-neon-green/30">
                <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
                <span className="text-xs font-mono text-neon-green">SYSTEM ONLINE</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Left: Console */}
          <div className="space-y-6">
            {/* Console panel */}
            <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-border/30 flex items-center gap-2">
                <Radio className="w-4 h-4 text-neon-cyan" />
                <span className="font-mono text-sm text-neon-cyan">AUDIO INPUT CONSOLE</span>
              </div>

              <div className="p-6 space-y-6">
                {/* Waveform display */}
                <div className="h-24 rounded-lg bg-background/50 border border-border/30 overflow-hidden flex items-center justify-center">
                  <Waveform isActive={isRecording || isProcessing} variant="neon" barCount={50} />
                </div>

                {/* Record button */}
                <div className="flex justify-center">
                  <RecorderButton size="lg" variant="neon" onRecordingComplete={handleRecordingComplete} />
                </div>

                {/* Upload option */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border/30" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-card px-3 text-xs font-mono text-muted-foreground">OR UPLOAD FILE</span>
                  </div>
                </div>

                <AudioUploader variant="neon" onUpload={handleUpload} />
              </div>
            </div>

            {/* Stats panel */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Processed", value: transcriptions.length, icon: Activity },
                { label: "Tasks", value: transcriptions.reduce((acc, t) => acc + t.tasks.length, 0), icon: Cpu },
                { label: "Accuracy", value: "98.2%", icon: Zap },
              ].map((stat) => (
                <div key={stat.label} className="p-4 rounded-lg border border-border/30 bg-card/30 backdrop-blur-sm">
                  <stat.icon className="w-4 h-4 text-neon-cyan mb-2" />
                  <div className="text-2xl font-bold text-neon-cyan text-glow-cyan font-mono">{stat.value}</div>
                  <div className="text-xs text-muted-foreground font-mono uppercase">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Diagnostic panel */}
          <div className="space-y-6">
            <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden h-full">
              <div className="px-4 py-3 border-b border-border/30 flex items-center gap-2">
                <Activity className="w-4 h-4 text-neon-green" />
                <span className="font-mono text-sm text-neon-green">PROCESSING DIAGNOSTICS</span>
              </div>

              <div className="p-6">
                {!isProcessing && !isComplete && !showResults && (
                  <div className="h-full flex flex-col items-center justify-center text-center py-12">
                    <div className="w-16 h-16 rounded-full border-2 border-dashed border-border/50 flex items-center justify-center mb-4">
                      <Cpu className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                    <p className="text-muted-foreground font-mono text-sm">AWAITING INPUT...</p>
                    <p className="text-muted-foreground/50 text-xs mt-1">Record or upload audio to begin processing</p>
                  </div>
                )}

                {(isProcessing || (isComplete && !showResults)) && <ProcessingTimeline variant="neon" />}

                {showResults && transcriptions[0] && (
                  <div className="space-y-4">
                    <ResultTabs transcription={transcriptions[0]} variant="neon" />
                    <Button
                      variant="outline"
                      className="w-full border-neon-cyan/50 hover:bg-neon-cyan/20 hover:text-neon-cyan bg-transparent"
                      onClick={() => {
                        setShowResults(false)
                        resetProcessing()
                      }}
                    >
                      Process Another
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
