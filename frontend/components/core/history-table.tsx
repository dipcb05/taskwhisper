"use client"

import { useState, useMemo } from "react"
import { Search, Calendar, Clock, ChevronRight, ListTodo } from "@/lib/icons"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Transcription } from "@/lib/types"

interface HistoryTableProps {
  transcriptions: Transcription[]
  onSelect: (t: Transcription) => void
  selected?: Transcription | null
  variant?: "default" | "compact"
  className?: string
}

export function HistoryTable({
  transcriptions,
  onSelect,
  selected,
  variant = "default",
  className,
}: HistoryTableProps) {
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState<"all" | "complete" | "processing">("all")

  const filteredTranscriptions = useMemo(() => {
    return transcriptions.filter((t) => {
      const matchesSearch =
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.rawTranscription.toLowerCase().includes(search.toLowerCase())
      const matchesFilter = filter === "all" || t.status === filter
      return matchesSearch && matchesFilter
    })
  }, [transcriptions, search, filter])

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const formatDate = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return "Today"
    if (days === 1) return "Yesterday"
    if (days < 7) return `${days} days ago`
    return date.toLocaleDateString()
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search transcriptions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filter} onValueChange={(v: "all" | "complete" | "processing") => setFilter(v)}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="complete">Complete</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {filteredTranscriptions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ListTodo className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No transcriptions found</p>
          </div>
        ) : (
          filteredTranscriptions.map((t) => (
            <button
              key={t.id}
              onClick={() => onSelect(t)}
              className={cn(
                "w-full text-left p-4 rounded-lg border transition-all",
                "hover:bg-muted/50 hover:border-primary/30",
                selected?.id === t.id && "bg-primary/5 border-primary/50",
                "group",
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium truncate">{t.title}</h3>
                    <Badge variant={t.status === "complete" ? "secondary" : "outline"} className="text-xs">
                      {t.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-1">{t.cleanedText}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(t.createdAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDuration(t.duration)}
                    </span>
                    <span className="flex items-center gap-1">
                      <ListTodo className="w-3 h-3" />
                      {t.tasks.length} tasks
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
