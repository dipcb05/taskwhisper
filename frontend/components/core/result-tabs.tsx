"use client"

import { useState } from "react"
import { FileText, Sparkles, ListTodo, Code } from "@/lib/icons"
import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TaskList } from "./task-list"
import type { Transcription } from "@/lib/types"

interface ResultTabsProps {
  transcription: Transcription
  variant?: "default" | "neon" | "compact"
  className?: string
}

export function ResultTabs({ transcription, variant = "default", className }: ResultTabsProps) {
  const [activeTab, setActiveTab] = useState("transcription")

  const jsonOutput = JSON.stringify(
    {
      title: transcription.title,
      transcription: transcription.rawTranscription,
      cleanedText: transcription.cleanedText,
      tasks: transcription.tasks,
    },
    null,
    2,
  )

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className={cn("w-full", className)}>
      <TabsList
        className={cn("w-full grid grid-cols-4", variant === "neon" && "bg-background/50 border border-border/50")}
      >
        <TabsTrigger
          value="transcription"
          className={cn(
            "gap-2",
            variant === "neon" && "data-[state=active]:bg-neon-cyan/20 data-[state=active]:text-neon-cyan",
          )}
        >
          <FileText className="w-4 h-4" />
          <span className="hidden sm:inline">Transcription</span>
        </TabsTrigger>
        <TabsTrigger
          value="cleaned"
          className={cn(
            "gap-2",
            variant === "neon" && "data-[state=active]:bg-neon-green/20 data-[state=active]:text-neon-green",
          )}
        >
          <Sparkles className="w-4 h-4" />
          <span className="hidden sm:inline">Cleaned</span>
        </TabsTrigger>
        <TabsTrigger
          value="tasks"
          className={cn(
            "gap-2",
            variant === "neon" && "data-[state=active]:bg-neon-pink/20 data-[state=active]:text-neon-pink",
          )}
        >
          <ListTodo className="w-4 h-4" />
          <span className="hidden sm:inline">Tasks</span>
        </TabsTrigger>
        <TabsTrigger
          value="json"
          className={cn(
            "gap-2",
            variant === "neon" && "data-[state=active]:bg-neon-blue/20 data-[state=active]:text-neon-blue",
          )}
        >
          <Code className="w-4 h-4" />
          <span className="hidden sm:inline">JSON</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="transcription" className="mt-4">
        <div className={cn("p-4 rounded-lg border", variant === "neon" && "bg-background/30 border-neon-cyan/30")}>
          <p className="text-sm leading-relaxed">{transcription.rawTranscription}</p>
        </div>
      </TabsContent>

      <TabsContent value="cleaned" className="mt-4">
        <div className={cn("p-4 rounded-lg border", variant === "neon" && "bg-background/30 border-neon-green/30")}>
          <p className="text-sm leading-relaxed">{transcription.cleanedText}</p>
        </div>
      </TabsContent>

      <TabsContent value="tasks" className="mt-4">
        <TaskList tasks={transcription.tasks} variant={variant} />
      </TabsContent>

      <TabsContent value="json" className="mt-4">
        <div
          className={cn(
            "p-4 rounded-lg border overflow-auto max-h-64",
            variant === "neon" && "bg-background/30 border-neon-blue/30",
          )}
        >
          <pre className={cn("text-xs font-mono", variant === "neon" && "text-neon-blue")}>{jsonOutput}</pre>
        </div>
      </TabsContent>
    </Tabs>
  )
}
