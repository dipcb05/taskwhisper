"use client"

import { cn } from "@/lib/utils"
import { Check, Loader2 } from "@/lib/icons"

const steps = [
  { id: "uploading", label: "Uploading audio" },
  { id: "transcribing", label: "Transcribing" },
  { id: "cleaning", label: "Cleaning text" },
  { id: "extracting", label: "Extracting tasks" },
]

interface ProcessingStepsProps {
  currentStep: string | null
  completedSteps: string[]
  className?: string
}

export function ProcessingSteps({ currentStep, completedSteps, className }: ProcessingStepsProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {steps.map((step) => {
        const isCompleted = completedSteps.includes(step.id)
        const isCurrent = currentStep === step.id

        return (
          <div
            key={step.id}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg transition-all duration-300",
              isCompleted && "bg-green-500/10",
              isCurrent && "bg-cyan-500/10",
              !isCompleted && !isCurrent && "opacity-50",
            )}
          >
            <div
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center",
                isCompleted && "bg-green-500 text-white",
                isCurrent && "bg-cyan-500 text-white",
                !isCompleted && !isCurrent && "bg-muted",
              )}
            >
              {isCompleted ? (
                <Check className="w-4 h-4" />
              ) : isCurrent ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-muted-foreground/50" />
              )}
            </div>
            <span
              className={cn(
                "text-sm font-medium",
                isCompleted && "text-green-500",
                isCurrent && "text-cyan-500",
                !isCompleted && !isCurrent && "text-muted-foreground",
              )}
            >
              {step.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
