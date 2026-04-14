"use client"

import { Cloud, CloudOff, AlertCircle, Loader2 } from "@/lib/icons"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"

interface SyncStatusBadgeProps {
  state: "local" | "syncing" | "synced" | "error"
}

export function SyncStatusBadge({ state }: SyncStatusBadgeProps) {
  const variants = {
    local: {
      icon: <CloudOff className="w-3 h-3" />,
      label: "Local only",
      color: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400",
      tooltip: "This item exists only on this device",
    },
    syncing: {
      icon: <Loader2 className="w-3 h-3 animate-spin" />,
      label: "Syncing...",
      color: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
      tooltip: "Uploading to cloud",
    },
    synced: {
      icon: <Cloud className="w-3 h-3" />,
      label: "Synced",
      color: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
      tooltip: "Synced with cloud",
    },
    error: {
      icon: <AlertCircle className="w-3 h-3" />,
      label: "Sync failed",
      color: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
      tooltip: "Sync failed. Will retry when online.",
    },
  }

  const variant = variants[state]

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`gap-1 ${variant.color}`}>
            {variant.icon}
            {variant.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>{variant.tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
