"use client"

import { Download, Copy, FileJson, FileText, Table } from "@/lib/icons"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import type { Transcription } from "@/lib/types"

interface ExportMenuProps {
  transcription: Transcription
  variant?: "default" | "neon"
  className?: string
}

export function ExportMenu({ transcription, variant = "default", className }: ExportMenuProps) {
  const handleCopyText = () => {
    navigator.clipboard.writeText(transcription.cleanedText)
  }

  const handleCopyTasks = () => {
    const tasksText = transcription.tasks.map((t) => `- ${t.completed ? "[x]" : "[ ]"} ${t.text}`).join("\n")
    navigator.clipboard.writeText(tasksText)
  }

  const handleExportJSON = () => {
    const data = JSON.stringify(
      {
        title: transcription.title,
        transcription: transcription.rawTranscription,
        cleanedText: transcription.cleanedText,
        tasks: transcription.tasks,
      },
      null,
      2,
    )

    const blob = new Blob([data], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${transcription.title.toLowerCase().replace(/\s+/g, "-")}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportCSV = () => {
    const headers = ["Task", "Completed", "Priority", "Due Date"]
    const rows = transcription.tasks.map((t) => [t.text, t.completed ? "Yes" : "No", t.priority || "", t.dueDate || ""])

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${transcription.title.toLowerCase().replace(/\s+/g, "-")}-tasks.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant === "neon" ? "outline" : "default"}
          className={cn(
            className,
            variant === "neon" && "border-neon-cyan/50 hover:bg-neon-cyan/20 hover:text-neon-cyan",
          )}
        >
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={cn(variant === "neon" && "bg-background border-border/50")}>
        <DropdownMenuItem onClick={handleCopyText} className="gap-2">
          <Copy className="w-4 h-4" />
          Copy cleaned text
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyTasks} className="gap-2">
          <FileText className="w-4 h-4" />
          Copy tasks as markdown
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportJSON} className="gap-2">
          <FileJson className="w-4 h-4" />
          Export as JSON
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportCSV} className="gap-2">
          <Table className="w-4 h-4" />
          Export tasks as CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
