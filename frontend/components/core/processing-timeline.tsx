"use client"

import { useEffect } from "react"
import { Check, Loader2, Circle } from "@/lib/icons"
import { cn } from "@/lib/utils"
import { useApp } from "@/lib/context"
import type { ProcessingStep } from "@/lib/types"

interface ProcessingTimelineProps {
  variant?: "default" | "neon" | "compact"
  className?: string
}

const stepLabels: Record<ProcessingStep, string> = {
  uploading: "Uploading Audio",
  analyzing: "Analyzing Content",
  transcribing: "Transcribing Speech",
  cleaning: "Cleaning Text",
  extracting: "Extracting Tasks",
  complete: "Complete",
}

const stepDescriptions: Record<ProcessingStep, string> = {
  uploading: "Securing your audio file...",
  analyzing: "AI detecting speech patterns...",
  transcribing: "Converting speech to text...",
  cleaning: "Structuring and formatting...",
  extracting: "Identifying actionable items...",
  complete: "Processing finished!",
}

export function ProcessingTimeline({ variant = "default", className }: ProcessingTimelineProps) {
  const { processingState, advanceProcessing } = useApp()
  const { currentStep, completedSteps } = processingState

  useEffect(() => {
    if (currentStep && currentStep !== "complete") {
      const timer = setTimeout(advanceProcessing, 1500)
      return () => clearTimeout(timer)
    }
  }, [currentStep, advanceProcessing])

  const steps: ProcessingStep[] = ["uploading", "analyzing", "transcribing", "cleaning", "extracting", "complete"]

  const getStepStatus = (step: ProcessingStep) => {
    if (completedSteps.includes(step) || (currentStep === "complete" && step === "complete")) return "complete"
    if (currentStep === step) return "active"
    return "pending"
  }

  if (variant === "compact") {
    return (
      <div className={cn("space-y-2", className)}>
        {steps.map((step, i) => {
          const status = getStepStatus(step)
          return (
            <div
              key={step}
              className={cn(
                "flex items-center gap-2 text-sm transition-all duration-300",
                status === "complete" && "text-accent",
                status === "active" && "text-primary",
                status === "pending" && "text-muted-foreground/50",
              )}
            >
              {status === "complete" && <Check className="w-4 h-4" />}
              {status === "active" && <Loader2 className="w-4 h-4 animate-spin" />}
              {status === "pending" && <Circle className="w-4 h-4" />}
              <span>{stepLabels[step]}</span>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {steps.map((step, i) => {
        const status = getStepStatus(step)
        const isLast = i === steps.length - 1

        return (
          <div key={step} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500",
                  variant === "neon" && [
                    status === "complete" && "bg-neon-green/20 border border-neon-green glow-green",
                    status === "active" && "bg-neon-cyan/20 border border-neon-cyan glow-cyan animate-pulse-glow",
                    status === "pending" && "bg-muted/20 border border-border/50",
                  ],
                  variant === "default" && [
                    status === "complete" && "bg-accent text-accent-foreground",
                    status === "active" && "bg-primary text-primary-foreground",
                    status === "pending" && "bg-muted text-muted-foreground",
                  ],
                )}
              >
                {status === "complete" && <Check className={cn("w-5 h-5", variant === "neon" && "text-neon-green")} />}
                {status === "active" && (
                  <Loader2 className={cn("w-5 h-5 animate-spin", variant === "neon" && "text-neon-cyan")} />
                )}
                {status === "pending" && <span className="text-sm font-mono">{i + 1}</span>}
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "w-px h-12 transition-all duration-500",
                    variant === "neon" && [
                      status === "complete" && "bg-neon-green/50",
                      status !== "complete" && "bg-border/30",
                    ],
                    variant === "default" && [
                      status === "complete" && "bg-accent",
                      status !== "complete" && "bg-border",
                    ],
                  )}
                />
              )}
            </div>
            <div className="flex-1 pb-8">
              <h4
                className={cn(
                  "font-medium transition-all duration-300",
                  variant === "neon" && [
                    status === "complete" && "text-neon-green text-glow-green",
                    status === "active" && "text-neon-cyan text-glow-cyan",
                    status === "pending" && "text-muted-foreground/50",
                  ],
                  variant === "default" && [
                    status === "complete" && "text-accent",
                    status === "active" && "text-foreground",
                    status === "pending" && "text-muted-foreground",
                  ],
                )}
              >
                {stepLabels[step]}
              </h4>
              <p
                className={cn(
                  "text-sm mt-1 transition-opacity duration-300",
                  status === "active" ? "opacity-100" : "opacity-50",
                  "text-muted-foreground",
                )}
              >
                {stepDescriptions[step]}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
