"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"
import { ResultDisplay } from "@/components/voice/result-display"
import { useBackendRecordings } from "@/hooks/use-backend-recordings"
import { useStore } from "@/lib/store"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search, Plus, Clock, Check, AlertCircle, ChevronRight, ListTodo } from "@/lib/icons"
import { cn } from "@/lib/utils"

export default function HistoryPage() {
  const searchParams = useSearchParams()
  const selectedFromQuery = searchParams.get("note")
  const { voiceNotes, updateVoiceNote } = useStore()
  const { jobs, loading, error, reload } = useBackendRecordings()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(selectedFromQuery)

  useEffect(() => {
    if (selectedFromQuery) {
      setSelectedNoteId(selectedFromQuery)
    } else if (!selectedNoteId && voiceNotes.length > 0) {
      setSelectedNoteId(voiceNotes[0].id)
    }
  }, [selectedFromQuery, selectedNoteId, voiceNotes])

  const filteredNotes = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase()
    if (!normalized) {
      return voiceNotes
    }

    return voiceNotes.filter((note) =>
      [note.title, note.rawTranscription, note.cleanedText]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalized)),
    )
  }, [searchQuery, voiceNotes])

  const selectedNote = filteredNotes.find((note) => note.id === selectedNoteId) ?? voiceNotes.find((note) => note.id === selectedNoteId) ?? null
  const totalTasks = voiceNotes.reduce((acc, note) => acc + note.tasks.length, 0)
  const completedTasks = voiceNotes.reduce((acc, note) => acc + note.tasks.filter((task) => task.completed).length, 0)
  const failedJobs = jobs.filter((job) => job.status === "FAILED").length
  const processingJobs = jobs.filter((job) => job.status === "PROCESSING" || job.status === "PENDING").length

  const handleTaskToggle = (taskId: string, completed: boolean) => {
    if (!selectedNote) {
      return
    }
    updateVoiceNote(selectedNote.id, {
      tasks: selectedNote.tasks.map((task) => (task.id === taskId ? { ...task, completed } : task)),
    })
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="flex-1 lg:ml-0">
        <div className="mx-auto max-w-7xl p-4 lg:p-8">
          <div className="mb-8 flex flex-col gap-4 pt-12 lg:pt-0 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">History</h1>
              <p className="mt-2 text-muted-foreground">Browse every processed recording, inspect task output, and monitor pipeline health.</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="gap-2" onClick={() => void reload()}>
                <Clock className="w-4 h-4" />
                Refresh
              </Button>
              <Link href="/voice">
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  New Recording
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card className="border-border/60 bg-card/70">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-400">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-3xl font-semibold text-foreground">{voiceNotes.length}</p>
                  <p className="text-sm text-muted-foreground">Stored recordings</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/60 bg-card/70">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-400">
                  <ListTodo className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-3xl font-semibold text-foreground">{totalTasks}</p>
                  <p className="text-sm text-muted-foreground">Total tasks</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/60 bg-card/70">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-3xl font-semibold text-foreground">{completedTasks}</p>
                  <p className="text-sm text-muted-foreground">Completed tasks</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/60 bg-card/70">
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-400">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-3xl font-semibold text-foreground">{failedJobs}</p>
                  <p className="text-sm text-muted-foreground">Failed jobs</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
            <Card className="border-border/60 bg-card/70">
              <CardHeader className="space-y-4">
                <div>
                  <CardTitle className="text-xl">All recordings</CardTitle>
                  <CardDescription>{processingJobs > 0 ? `${processingJobs} jobs still processing.` : "Search and inspect every completed note."}</CardDescription>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Search title or transcript..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <div className="rounded-2xl border border-dashed border-border/70 px-4 py-10 text-center text-sm text-muted-foreground">
                    Loading recording history...
                  </div>
                ) : error ? (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-10 text-center text-sm text-red-400">
                    {error}
                  </div>
                ) : filteredNotes.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/70 px-4 py-10 text-center text-sm text-muted-foreground">
                    No matching recordings found.
                  </div>
                ) : (
                  <div className="max-h-[920px] space-y-3 overflow-y-auto pr-1">
                    {filteredNotes.map((note) => (
                      <button
                        key={note.id}
                        onClick={() => setSelectedNoteId(note.id)}
                        className={cn(
                          "w-full rounded-2xl border px-4 py-4 text-left transition-colors",
                          selectedNoteId === note.id
                            ? "border-cyan-500/40 bg-cyan-500/5"
                            : "border-border/60 bg-background/40 hover:bg-muted/40",
                        )}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">{note.title}</p>
                            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{note.cleanedText || note.rawTranscription}</p>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <Badge variant="outline">{note.tasks.length} tasks</Badge>
                              {note.duration > 0 && <Badge variant="outline">{note.duration}s</Badge>}
                              <span className="text-xs text-muted-foreground">{note.createdAt.toLocaleString()}</span>
                            </div>
                          </div>
                          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="border-border/60 bg-card/70">
                <CardHeader>
                  <CardTitle className="text-xl">History analytics</CardTitle>
                  <CardDescription>Signals across your stored recordings and backend job execution.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Task completion</p>
                    <p className="mt-2 text-3xl font-semibold text-foreground">
                      {totalTasks === 0 ? "0%" : `${Math.round((completedTasks / totalTasks) * 100)}%`}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Completed jobs</p>
                    <p className="mt-2 text-3xl font-semibold text-foreground">{jobs.filter((job) => job.status === "COMPLETED").length}</p>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Jobs in queue</p>
                    <p className="mt-2 text-3xl font-semibold text-foreground">{processingJobs}</p>
                  </div>
                </CardContent>
              </Card>

              {selectedNote ? (
                <ResultDisplay note={selectedNote} onTaskToggle={handleTaskToggle} />
              ) : (
                <Card className="border-border/60 bg-card/70">
                  <CardContent className="flex min-h-[420px] items-center justify-center">
                    <div className="text-center">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                        <ListTodo className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground">Select a recording to inspect transcript, audio, and extracted tasks.</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
