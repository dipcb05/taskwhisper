"use client"

import Link from "next/link"
import { Sidebar } from "@/components/layout/sidebar"
import { useBackendRecordings } from "@/hooks/use-backend-recordings"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, ListTodo, ChevronRight, Plus, Search, Check } from "@/lib/icons"

export default function DashboardPage() {
  const { completedNotes, jobs, loading, error } = useBackendRecordings()

  const totalTasks = completedNotes.reduce((acc, note) => acc + note.tasks.length, 0)
  const completedTasks = completedNotes.reduce((acc, note) => acc + note.tasks.filter((task) => task.completed).length, 0)
  const processingJobs = jobs.filter((job) => job.status === "PROCESSING" || job.status === "PENDING").length
  const recentNotes = completedNotes.slice(0, 5)

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="flex-1 lg:ml-0">
        <div className="mx-auto max-w-6xl p-4 lg:p-8">
          <div className="mb-8 flex flex-col gap-4 pt-12 lg:pt-0 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">Dashboard</h1>
              <p className="mt-2 text-muted-foreground">Quick insight into your latest recordings, tasks, and pipeline activity.</p>
            </div>
            <div className="flex gap-3">
              <Link href="/history">
                <Button variant="outline" className="gap-2">
                  <Search className="w-4 h-4" />
                  Open History
                </Button>
              </Link>
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
                  <p className="text-3xl font-semibold text-foreground">{completedNotes.length}</p>
                  <p className="text-sm text-muted-foreground">Recordings</p>
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
                  <p className="text-sm text-muted-foreground">Extracted tasks</p>
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
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-3xl font-semibold text-foreground">{processingJobs}</p>
                  <p className="text-sm text-muted-foreground">Active jobs</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
            <Card className="border-border/60 bg-card/70">
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-xl">Recent recordings</CardTitle>
                  <CardDescription>Latest completed notes from backend storage.</CardDescription>
                </div>
                <Link href="/history">
                  <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground">
                    View all
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="space-y-3">
                {loading ? (
                  <div className="rounded-2xl border border-dashed border-border/70 px-4 py-10 text-center text-sm text-muted-foreground">
                    Loading recordings...
                  </div>
                ) : error ? (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-10 text-center text-sm text-red-400">
                    {error}
                  </div>
                ) : recentNotes.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/70 px-4 py-10 text-center text-sm text-muted-foreground">
                    No recordings found yet.
                  </div>
                ) : (
                  recentNotes.map((note) => (
                    <Link
                      key={note.id}
                      href={`/history?note=${note.id}`}
                      className="flex items-start justify-between rounded-2xl border border-border/60 bg-background/40 px-4 py-4 transition-colors hover:bg-muted/40"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{note.title}</p>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{note.cleanedText || note.rawTranscription}</p>
                        <div className="mt-3 flex items-center gap-2">
                          <Badge variant="outline">{note.tasks.length} tasks</Badge>
                          <span className="text-xs text-muted-foreground">{note.createdAt.toLocaleDateString()}</span>
                        </div>
                      </div>
                      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/70">
              <CardHeader>
                <CardTitle className="text-xl">Snapshot</CardTitle>
                <CardDescription>Compact view of current activity before you drill into history.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Completion rate</p>
                  <p className="mt-2 text-3xl font-semibold text-foreground">
                    {totalTasks === 0 ? "0%" : `${Math.round((completedTasks / totalTasks) * 100)}%`}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Latest activity</p>
                  <p className="mt-2 text-sm text-foreground">
                    {recentNotes[0]
                      ? `${recentNotes[0].title} created on ${recentNotes[0].createdAt.toLocaleDateString()}`
                      : "No completed recordings yet."}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Need the full picture?</p>
                  <p className="mt-2 text-sm text-muted-foreground">Open History for every recording, search, and deeper analytics.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
