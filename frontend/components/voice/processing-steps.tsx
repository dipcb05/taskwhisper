"use client"

import { cn } from "@/lib/utils"
import { Check, Loader2 } from "@/lib/icons"

const steps = [
  { id: "uploading", label: "Uploading audio" },
  { id: "enhancing", label: "Enhancing audio" },
  { id: "transcribing", label: "Transcribing" },
  { id: "cleaning", label: "Cleaning text" },
  { id: "extracting", label: "Extracting tasks" },
]

interface ProcessingStepsProps {
  currentStep: string | null
  completedSteps: string[]
  failedStep?: string | null
  className?: string
}

export function ProcessingSteps({ currentStep, completedSteps, failedStep, className }: ProcessingStepsProps) {
  return (
    <div className={cn("space-y-3", className)}>
      {steps.map((step) => {
        const isCompleted = completedSteps.includes(step.id)
        const isCurrent = currentStep === step.id
        const isFailed = failedStep === step.id

        return (
          <div
            key={step.id}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg transition-all duration-300",
              isCompleted && "bg-green-500/10",
              isFailed && "bg-red-500/10",
              isCurrent && "bg-cyan-500/10",
              !isCompleted && !isCurrent && !isFailed && "opacity-50",
            )}
          >
            <div
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center",
                isCompleted && "bg-green-500 text-white",
                isFailed && "bg-red-500 text-white",
                isCurrent && "bg-cyan-500 text-white",
                !isCompleted && !isCurrent && "bg-muted",
              )}
            >
              {isCompleted ? (
                <Check className="w-4 h-4" />
              ) : isFailed ? (
                <span className="text-sm font-bold leading-none">!</span>
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
                isFailed && "text-red-500",
                isCurrent && "text-cyan-500",
                !isCompleted && !isCurrent && !isFailed && "text-muted-foreground",
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
