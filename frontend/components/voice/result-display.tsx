"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { Copy, Download, Check } from "@/lib/icons"
import type { VoiceNote, Task } from "@/lib/store"

interface ResultDisplayProps {
  note: VoiceNote
  onTaskToggle?: (taskId: string, completed: boolean) => void
  className?: string
}

export function ResultDisplay({ note, onTaskToggle, className }: ResultDisplayProps) {
  const [copiedTab, setCopiedTab] = useState<string | null>(null)

  const copyToClipboard = async (text: string, tab: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedTab(tab)
    setTimeout(() => setCopiedTab(null), 2000)
  }

  const downloadAsFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const getPriorityColor = (priority: Task["priority"]) => {
    switch (priority) {
      case "high":
        return "text-red-500"
      case "medium":
        return "text-yellow-500"
      case "low":
        return "text-green-500"
      default:
        return "text-muted-foreground"
    }
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{note.title}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {note.createdAt.toLocaleDateString()} • {Math.floor(note.duration / 60)}:
          {(note.duration % 60).toString().padStart(2, "0")}
        </p>
        <div className="mt-4 p-3 rounded-lg bg-muted/30 border border-border/50">
          <p className="text-sm text-foreground/80 italic">"{note.rawTranscription}"</p>
        </div>
        {note.audioUrl && (
          <div className="mt-4">
            <audio controls src={note.audioUrl} className="w-full h-10 rounded-lg outline-none" />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="tasks" className="w-full">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="cleaned">Cleaned</TabsTrigger>
            <TabsTrigger value="raw">Raw</TabsTrigger>
            <TabsTrigger value="json">JSON</TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="mt-4 space-y-2">
            {note.tasks.map((task) => (
              <div
                key={task.id}
                className={cn("flex items-start gap-3 p-3 rounded-lg bg-muted/50", task.completed && "opacity-60")}
              >
                <Checkbox
                  checked={task.completed}
                  onCheckedChange={(checked) => onTaskToggle?.(task.id, !!checked)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm", task.completed && "line-through")}>{task.text}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn("text-xs font-medium", getPriorityColor(task.priority))}>{task.priority}</span>
                    {task.dueDate && <span className="text-xs text-muted-foreground">Due: {task.dueDate}</span>}
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="cleaned" className="mt-4">
            <div className="relative">
              <div className="p-4 rounded-lg bg-muted/50 text-sm whitespace-pre-wrap">{note.cleanedText}</div>
              <div className="absolute top-2 right-2 flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => copyToClipboard(note.cleanedText, "cleaned")}
                >
                  {copiedTab === "cleaned" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="raw" className="mt-4">
            <div className="relative">
              <div className="p-4 rounded-lg bg-muted/50 text-sm whitespace-pre-wrap">{note.rawTranscription}</div>
              <div className="absolute top-2 right-2 flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => copyToClipboard(note.rawTranscription, "raw")}
                >
                  {copiedTab === "raw" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="json" className="mt-4">
            <div className="relative">
              <pre className="p-4 rounded-lg bg-muted/50 text-xs overflow-x-auto">{JSON.stringify(note, null, 2)}</pre>
              <div className="absolute top-2 right-2 flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => copyToClipboard(JSON.stringify(note, null, 2), "json")}
                >
                  {copiedTab === "json" ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() =>
                    downloadAsFile(JSON.stringify(note, null, 2), `${note.title}.json`, "application/json")
                  }
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
