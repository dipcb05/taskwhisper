import { type NextRequest, NextResponse } from "next/server"
import type { VoiceNote, Task } from "@/lib/db-types"

// Mock implementation - in production, connect to real Supabase
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { note, tasks } = body as { note: VoiceNote; tasks: Task[] }

    if (!note || !tasks) {
      return NextResponse.json({ error: "Missing note or tasks" }, { status: 400 })
    }

    // Mock sync simulation
    console.log("[v0] Syncing note:", {
      noteId: note.id,
      taskCount: tasks.length,
      syncState: "synced",
    })

    // Simulate successful sync
    const syncedNote = { ...note, sync_state: "synced" as const }
    const syncedTasks = tasks.map((t) => ({ ...t, sync_state: "synced" as const }))

    return NextResponse.json({
      note: syncedNote,
      tasks: syncedTasks,
      syncedAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[v0] Sync error:", error)
    return NextResponse.json({ error: "Sync failed" }, { status: 500 })
  }
}
