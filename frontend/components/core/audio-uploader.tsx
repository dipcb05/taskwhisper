"use client"

import type React from "react"

import { useCallback, useState } from "react"
import { Upload, FileAudio, X } from "@/lib/icons"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface AudioUploaderProps {
  onUpload?: (file: File) => void
  variant?: "default" | "neon"
  className?: string
}

export function AudioUploader({ onUpload, variant = "default", className }: AudioUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true)
    } else if (e.type === "dragleave") {
      setIsDragging(false)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const files = e.dataTransfer.files
      if (files?.[0]?.type.startsWith("audio/")) {
        setFile(files[0])
        onUpload?.(files[0])
      }
    },
    [onUpload],
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files?.[0]) {
        setFile(files[0])
        onUpload?.(files[0])
      }
    },
    [onUpload],
  )

  const clearFile = useCallback(() => {
    setFile(null)
  }, [])

  return (
    <div className={cn("w-full", className)}>
      {file ? (
        <div
          className={cn(
            "flex items-center gap-3 p-4 rounded-lg border",
            variant === "neon" ? "border-neon-green/50 bg-neon-green/5" : "border-border bg-muted/50",
          )}
        >
          <FileAudio className={cn("w-8 h-8", variant === "neon" ? "text-neon-green" : "text-primary")} />
          <div className="flex-1 min-w-0">
            <p className={cn("font-medium truncate", variant === "neon" && "text-neon-green")}>{file.name}</p>
            <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={clearFile}
            className={cn(variant === "neon" && "hover:bg-neon-pink/20 hover:text-neon-pink")}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <label
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={cn(
            "flex flex-col items-center justify-center p-8 rounded-lg border-2 border-dashed cursor-pointer transition-all",
            isDragging && variant === "neon" && "border-neon-cyan bg-neon-cyan/5 glow-cyan",
            isDragging && variant !== "neon" && "border-primary bg-primary/5",
            !isDragging && variant === "neon" && "border-border/50 hover:border-neon-cyan/50 hover:bg-neon-cyan/5",
            !isDragging && variant !== "neon" && "border-border hover:border-primary/50 hover:bg-muted/50",
          )}
        >
          <input type="file" accept="audio/*" onChange={handleFileSelect} className="sr-only" />
          <Upload
            className={cn(
              "w-10 h-10 mb-3",
              variant === "neon" && isDragging ? "text-neon-cyan" : "text-muted-foreground",
            )}
          />
          <p className={cn("font-medium mb-1", variant === "neon" && isDragging && "text-neon-cyan")}>
            Drop audio file here
          </p>
          <p className="text-sm text-muted-foreground">or click to browse</p>
          <p className="text-xs text-muted-foreground mt-2">MP3, WAV, M4A up to 25MB</p>
        </label>
      )}
    </div>
  )
}
