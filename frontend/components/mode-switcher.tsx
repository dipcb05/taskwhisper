"use client"

import type React from "react"

import { Monitor, Smartphone, Cpu } from "@/lib/icons"
import { cn } from "@/lib/utils"
import { useApp } from "@/lib/context"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import type { ViewMode } from "@/lib/types"

const modes: { value: ViewMode; label: string; icon: React.FC<{ className?: string }> }[] = [
  { value: "ai-lab", label: "AI Lab", icon: Cpu },
  { value: "dashboard", label: "Dashboard", icon: Monitor },
  { value: "mobile", label: "Mobile", icon: Smartphone },
]

export function ModeSwitcher() {
  const { viewMode, setViewMode, isDark } = useApp()

  return (
    <TooltipProvider>
      <div
        className={cn(
          "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
          "flex items-center gap-1 p-1.5 rounded-full",
          "bg-background/80 backdrop-blur-lg border shadow-lg",
          isDark && viewMode === "ai-lab" && "border-neon-cyan/30 glow-cyan",
        )}
      >
        {modes.map((mode) => (
          <Tooltip key={mode.value}>
            <TooltipTrigger asChild>
              <Button
                variant={viewMode === mode.value ? "default" : "ghost"}
                size="icon"
                className={cn(
                  "rounded-full transition-all",
                  viewMode === mode.value && isDark && viewMode === "ai-lab" && "bg-neon-cyan text-background",
                )}
                onClick={() => setViewMode(mode.value)}
              >
                <mode.icon className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>{mode.label}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  )
}
