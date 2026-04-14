"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import type { Task } from "@/lib/types"

interface TaskListProps {
  tasks: Task[]
  variant?: "default" | "neon" | "compact"
  onTaskToggle?: (taskId: string, completed: boolean) => void
  className?: string
}

export function TaskList({ tasks, variant = "default", onTaskToggle, className }: TaskListProps) {
  const [localTasks, setLocalTasks] = useState(tasks)

  const handleToggle = (taskId: string) => {
    setLocalTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t)))
    const task = localTasks.find((t) => t.id === taskId)
    if (task) {
      onTaskToggle?.(taskId, !task.completed)
    }
  }

  const priorityColors = {
    high:
      variant === "neon" ? "bg-neon-pink/20 text-neon-pink border-neon-pink/50" : "bg-destructive/10 text-destructive",
    medium: variant === "neon" ? "bg-neon-cyan/20 text-neon-cyan border-neon-cyan/50" : "bg-primary/10 text-primary",
    low: variant === "neon" ? "bg-neon-green/20 text-neon-green border-neon-green/50" : "bg-accent/10 text-accent",
  }

  return (
    <div className={cn("space-y-2", className)}>
      {localTasks.map((task) => (
        <div
          key={task.id}
          className={cn(
            "flex items-start gap-3 p-3 rounded-lg border transition-all",
            variant === "neon" && ["bg-background/30 border-border/30", task.completed && "opacity-50"],
            variant !== "neon" && ["bg-card", task.completed && "opacity-60"],
          )}
        >
          <Checkbox
            id={task.id}
            checked={task.completed}
            onCheckedChange={() => handleToggle(task.id)}
            className={cn(
              "mt-0.5",
              variant === "neon" &&
                "border-neon-cyan data-[state=checked]:bg-neon-green data-[state=checked]:border-neon-green",
            )}
          />
          <div className="flex-1 min-w-0">
            <label
              htmlFor={task.id}
              className={cn("text-sm cursor-pointer", task.completed && "line-through text-muted-foreground")}
            >
              {task.text}
            </label>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              {task.priority && (
                <Badge variant="outline" className={cn("text-xs", priorityColors[task.priority])}>
                  {task.priority}
                </Badge>
              )}
              {task.dueDate && <span className="text-xs text-muted-foreground">Due: {task.dueDate}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
