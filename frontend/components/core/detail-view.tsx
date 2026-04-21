"use client"

import { ArrowLeft, Play, Pause } from "@/lib/icons"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Waveform } from "./waveform"
import { ResultTabs } from "./result-tabs"
import { ExportMenu } from "./export-menu"
import type { Transcription } from "@/lib/types"

interface DetailViewProps {
  transcription: Transcription
  onBack: () => void
  variant?: "default" | "neon" | "sheet"
  className?: string
}

export function DetailView({ transcription, onBack, variant = "default", className }: DetailViewProps) {
  const [isPlaying, setIsPlaying] = useState(false)

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className={cn("flex items-center gap-3 p-4 border-b", variant === "neon" && "border-border/30")}>
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className={cn(variant === "neon" && "hover:bg-neon-cyan/20 hover:text-neon-cyan")}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className={cn("font-semibold truncate", variant === "neon" && "text-neon-cyan")}>
            {transcription.title}
          </h2>
          <p className="text-sm text-muted-foreground">
            {formatDuration(transcription.duration)} · {transcription.tasks.length} tasks extracted
          </p>
        </div>
        <ExportMenu transcription={transcription} variant={variant === "neon" ? "neon" : "default"} />
      </div>
      <div className={cn("p-4 border-b", variant === "neon" && "border-border/30 bg-background/30")}>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsPlaying(!isPlaying)}
            className={cn("shrink-0", variant === "neon" && "border-neon-cyan/50 hover:bg-neon-cyan/20")}
          >
            {isPlaying ? (
              <Pause className={cn("w-4 h-4", variant === "neon" && "text-neon-cyan")} />
            ) : (
              <Play className={cn("w-4 h-4", variant === "neon" && "text-neon-cyan")} />
            )}
          </Button>
          <div className="flex-1 h-12 overflow-hidden rounded-lg bg-muted/30">
            <Waveform isActive={isPlaying} variant={variant === "neon" ? "neon" : "default"} barCount={60} />
          </div>
          <span className={cn("text-sm font-mono tabular-nums", variant === "neon" && "text-neon-cyan")}>
            {formatDuration(transcription.duration)}
          </span>
        </div>
      </div>

  
      <div className="flex-1 overflow-auto p-4">
        <ResultTabs
          transcription={transcription}
          variant={variant === "neon" ? "neon" : variant === "sheet" ? "compact" : "default"}
        />
      </div>
    </div>
  )
}
