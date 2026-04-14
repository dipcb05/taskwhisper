"use client"

import { useState } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { useStore } from "@/lib/store"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ResultDisplay } from "@/components/voice/result-display"
import { Search, Plus, Clock, ListTodo, ChevronRight } from "@/lib/icons"
import { cn } from "@/lib/utils"
import Link from "next/link"

export default function DashboardPage() {
  const { voiceNotes, updateVoiceNote } = useStore()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null)

  const filteredNotes = voiceNotes.filter(
    (note) =>
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.rawTranscription.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const selectedNote = voiceNotes.find((n) => n.id === selectedNoteId)

  const handleTaskToggle = (taskId: string, completed: boolean) => {
    if (!selectedNote) return
    const updatedTasks = selectedNote.tasks.map((t) => (t.id === taskId ? { ...t, completed } : t))
    updateVoiceNote(selectedNote.id, { tasks: updatedTasks })
  }

  const totalTasks = voiceNotes.reduce((acc, note) => acc + note.tasks.length, 0)
  const completedTasks = voiceNotes.reduce((acc, note) => acc + note.tasks.filter((t) => t.completed).length, 0)

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="flex-1 lg:ml-0">
        <div className="p-4 lg:p-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 pt-12 lg:pt-0">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
              <p className="text-muted-foreground">Manage your voice notes and tasks</p>
            </div>
            <Link href="/voice">
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                New Recording
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-cyan-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{voiceNotes.length}</p>
                  <p className="text-sm text-muted-foreground">Total Recordings</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <ListTodo className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{totalTasks}</p>
                  <p className="text-sm text-muted-foreground">Total Tasks</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <ListTodo className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{completedTasks}</p>
                  <p className="text-sm text-muted-foreground">Completed Tasks</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Content */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Notes List */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Recent Notes</CardTitle>
                <div className="relative mt-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search notes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
                  {filteredNotes.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">No notes found</div>
                  ) : (
                    filteredNotes.map((note) => (
                      <button
                        key={note.id}
                        onClick={() => setSelectedNoteId(note.id)}
                        className={cn(
                          "w-full p-4 text-left hover:bg-muted/50 transition-colors flex items-center gap-3",
                          selectedNoteId === note.id && "bg-muted",
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">{note.title}</p>
                          <p className="text-sm text-muted-foreground truncate">{note.cleanedText.slice(0, 60)}...</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">{note.createdAt.toLocaleDateString()}</span>
                            <span className="text-xs text-cyan-500">{note.tasks.length} tasks</span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      </button>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Detail View */}
            <div>
              {selectedNote ? (
                <ResultDisplay note={selectedNote} onTaskToggle={handleTaskToggle} />
              ) : (
                <Card className="h-full flex items-center justify-center min-h-[400px]">
                  <div className="text-center p-8">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                      <ListTodo className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">Select a note to view details</p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
