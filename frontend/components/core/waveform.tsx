"use client"

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

interface WaveformProps {
  isActive?: boolean
  className?: string
  barCount?: number
  variant?: "default" | "neon"
}

export function Waveform({ isActive = false, className, barCount = 40, variant = "default" }: WaveformProps) {
  const barsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isActive || !barsRef.current) return

    const bars = barsRef.current.children
    const intervals: NodeJS.Timeout[] = []

    Array.from(bars).forEach((bar, i) => {
      const randomize = () => {
        const height = Math.random() * 80 + 20
        ;(bar as HTMLElement).style.height = `${height}%`
      }

      intervals.push(setInterval(randomize, 100 + Math.random() * 100))
      randomize()
    })

    return () => intervals.forEach(clearInterval)
  }, [isActive])

  return (
    <div ref={barsRef} className={cn("flex items-center justify-center gap-[2px] h-16", className)}>
      {Array.from({ length: barCount }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "w-1 rounded-full transition-all duration-100",
            isActive ? "h-full" : "h-[20%]",
            variant === "neon" ? "bg-neon-cyan" : "bg-primary",
          )}
          style={{
            height: isActive ? undefined : `${20 + Math.sin(i * 0.5) * 15}%`,
            animationDelay: `${i * 50}ms`,
          }}
        />
      ))}
    </div>
  )
}
