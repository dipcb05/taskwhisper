"use client"

import { useEffect, useCallback } from "react"
import { Mic, Square } from "@/lib/icons"
import { cn } from "@/lib/utils"
import { useApp } from "@/lib/context"

interface RecorderButtonProps {
  size?: "sm" | "md" | "lg" | "xl"
  variant?: "default" | "neon" | "mobile"
  onRecordingComplete?: (duration: number) => void
  className?: string
}

export function RecorderButton({
  size = "md",
  variant = "default",
  onRecordingComplete,
  className,
}: RecorderButtonProps) {
  const { isRecording, setIsRecording, recordingTime, setRecordingTime } = useApp()

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(recordingTime + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isRecording, recordingTime, setRecordingTime])

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      onRecordingComplete?.(recordingTime)
      setIsRecording(false)
      setRecordingTime(0)
    } else {
      setIsRecording(true)
    }
  }, [isRecording, recordingTime, onRecordingComplete, setIsRecording, setRecordingTime])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-16 h-16",
    lg: "w-20 h-20",
    xl: "w-28 h-28",
  }

  const iconSizes = {
    sm: 20,
    md: 24,
    lg: 32,
    xl: 40,
  }

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <button
        onClick={toggleRecording}
        className={cn(
          "relative rounded-full flex items-center justify-center transition-all duration-300",
          sizeClasses[size],
          variant === "neon" && [
            "bg-background border-2 border-neon-cyan",
            isRecording && "glow-cyan animate-pulse-glow border-neon-pink",
            !isRecording && "hover:glow-cyan hover:border-neon-green",
          ],
          variant === "mobile" && [
            "bg-primary shadow-2xl",
            isRecording && "bg-destructive scale-95",
            !isRecording && "hover:scale-105 active:scale-95",
          ],
          variant === "default" && ["bg-primary hover:bg-primary/90", isRecording && "bg-destructive"],
        )}
      >
        {isRecording ? (
          <Square
            size={iconSizes[size]}
            className={cn(variant === "neon" ? "text-neon-pink" : "text-primary-foreground", "fill-current")}
          />
        ) : (
          <Mic
            size={iconSizes[size]}
            className={cn(variant === "neon" ? "text-neon-cyan" : "text-primary-foreground")}
          />
        )}

        {/* Pulse ring animation when recording */}
        {isRecording && (
          <>
            <span
              className={cn(
                "absolute inset-0 rounded-full animate-ping",
                variant === "neon" ? "bg-neon-pink/30" : "bg-destructive/30",
              )}
            />
            <span
              className={cn(
                "absolute inset-[-4px] rounded-full animate-pulse",
                variant === "neon" ? "border border-neon-pink/50" : "border border-destructive/50",
              )}
            />
          </>
        )}
      </button>

      {isRecording && (
        <div
          className={cn(
            "font-mono text-sm tabular-nums",
            variant === "neon" ? "text-neon-pink text-glow-cyan" : "text-destructive",
          )}
        >
          {formatTime(recordingTime)}
        </div>
      )}
    </div>
  )
}
