"use client"

import { useEffect, useRef } from "react"

interface WaveformVisualizerProps {
  isActive: boolean
  className?: string
}

export function WaveformVisualizer({ isActive, className }: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const barsRef = useRef<number[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const numBars = 40
    if (barsRef.current.length === 0) {
      barsRef.current = Array(numBars)
        .fill(0)
        .map(() => Math.random() * 0.3 + 0.1)
    }

    const draw = () => {
      const width = canvas.width
      const height = canvas.height

      ctx.clearRect(0, 0, width, height)

      const barWidth = width / numBars - 2
      const centerY = height / 2

      barsRef.current.forEach((value, i) => {
        if (isActive) {
          // Animate bars when active
          barsRef.current[i] = Math.max(0.1, Math.min(1, value + (Math.random() - 0.5) * 0.15))
        } else {
          // Decay when not active
          barsRef.current[i] = Math.max(0.1, value * 0.95)
        }

        const barHeight = barsRef.current[i] * height * 0.8
        const x = i * (barWidth + 2)

        // Create gradient
        const gradient = ctx.createLinearGradient(0, centerY - barHeight / 2, 0, centerY + barHeight / 2)
        gradient.addColorStop(0, isActive ? "rgb(6, 182, 212)" : "rgb(100, 116, 139)")
        gradient.addColorStop(0.5, isActive ? "rgb(59, 130, 246)" : "rgb(71, 85, 105)")
        gradient.addColorStop(1, isActive ? "rgb(6, 182, 212)" : "rgb(100, 116, 139)")

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.roundRect(x, centerY - barHeight / 2, barWidth, barHeight, 2)
        ctx.fill()
      })

      animationRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isActive])

  return <canvas ref={canvasRef} width={320} height={80} className={className} />
}
