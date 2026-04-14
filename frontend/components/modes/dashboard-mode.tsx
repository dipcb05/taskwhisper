"use client"

import { useState } from "react"
import { Zap, Plus, History, Settings, Key, Moon, Sun, PanelLeftClose, PanelLeft } from "@/lib/icons"
import { cn } from "@/lib/utils"
import { useApp } from "@/lib/context"
import { Button } from "@/components/ui/button"
import { HistoryTable } from "@/components/core/history-table"
import { DetailView } from "@/components/core/detail-view"
import { RecorderButton } from "@/components/core/recorder-button"
import { AudioUploader } from "@/components/core/audio-uploader"
import { ProcessingTimeline } from "@/components/core/processing-timeline"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export function DashboardMode() {
  const {
    transcriptions,
    selectedTranscription,
    setSelectedTranscription,
    isDark,
    toggleTheme,
    processingState,
    startProcessing,
    resetProcessing,
  } = useApp()

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [newTranscriptionOpen, setNewTranscriptionOpen] = useState(false)
  const [activeNav, setActiveNav] = useState<"history" | "settings" | "api">("history")

  const handleRecordingComplete = () => {
    startProcessing()
  }

  const handleUpload = () => {
    startProcessing()
  }

  const isProcessing = processingState.currentStep !== null && processingState.currentStep !== "complete"

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={cn(
          "h-screen border-r bg-sidebar flex flex-col transition-all duration-300",
          sidebarOpen ? "w-64" : "w-16",
        )}
      >
        {/* Logo */}
        <div className="p-4 border-b flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4 text-primary-foreground" />
          </div>
          {sidebarOpen && <span className="font-bold text-sidebar-foreground">TaskWhisper</span>}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          <Button
            variant="default"
            className={cn("w-full justify-start gap-3", !sidebarOpen && "justify-center px-0")}
            onClick={() => setNewTranscriptionOpen(true)}
          >
            <Plus className="w-4 h-4" />
            {sidebarOpen && <span>New Transcription</span>}
          </Button>

          <div className="py-2" />

          <Button
            variant={activeNav === "history" ? "secondary" : "ghost"}
            className={cn("w-full justify-start gap-3", !sidebarOpen && "justify-center px-0")}
            onClick={() => setActiveNav("history")}
          >
            <History className="w-4 h-4" />
            {sidebarOpen && <span>History</span>}
          </Button>

          <Button
            variant={activeNav === "settings" ? "secondary" : "ghost"}
            className={cn("w-full justify-start gap-3", !sidebarOpen && "justify-center px-0")}
            onClick={() => setActiveNav("settings")}
          >
            <Settings className="w-4 h-4" />
            {sidebarOpen && <span>Settings</span>}
          </Button>

          <Button
            variant={activeNav === "api" ? "secondary" : "ghost"}
            className={cn("w-full justify-start gap-3", !sidebarOpen && "justify-center px-0")}
            onClick={() => setActiveNav("api")}
          >
            <Key className="w-4 h-4" />
            {sidebarOpen && <span>API Keys</span>}
          </Button>
        </nav>

        {/* Footer controls */}
        <div className="p-3 border-t space-y-1">
          <Button
            variant="ghost"
            className={cn("w-full justify-start gap-3", !sidebarOpen && "justify-center px-0")}
            onClick={toggleTheme}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {sidebarOpen && <span>{isDark ? "Light Mode" : "Dark Mode"}</span>}
          </Button>

          <Button
            variant="ghost"
            className={cn("w-full justify-start gap-3", !sidebarOpen && "justify-center px-0")}
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
            {sidebarOpen && <span>Collapse</span>}
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex overflow-hidden">
        {/* List view */}
        <div
          className={cn(
            "h-screen overflow-auto border-r transition-all duration-300",
            selectedTranscription ? "w-1/2 hidden lg:block" : "flex-1",
          )}
        >
          <div className="p-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold">Transcription History</h1>
              <p className="text-muted-foreground">{transcriptions.length} recordings processed</p>
            </div>

            <HistoryTable
              transcriptions={transcriptions}
              onSelect={setSelectedTranscription}
              selected={selectedTranscription}
            />
          </div>
        </div>

        {/* Detail view */}
        {selectedTranscription && (
          <div className="flex-1 h-screen overflow-hidden bg-muted/30">
            <DetailView transcription={selectedTranscription} onBack={() => setSelectedTranscription(null)} />
          </div>
        )}
      </main>

      {/* New transcription dialog */}
      <Dialog open={newTranscriptionOpen} onOpenChange={setNewTranscriptionOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Transcription</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {!isProcessing && processingState.currentStep !== "complete" ? (
              <>
                <div className="flex justify-center">
                  <RecorderButton size="lg" onRecordingComplete={handleRecordingComplete} />
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-background px-3 text-sm text-muted-foreground">or upload a file</span>
                  </div>
                </div>

                <AudioUploader onUpload={handleUpload} />
              </>
            ) : (
              <div className="py-4">
                <ProcessingTimeline variant="default" />
                {processingState.currentStep === "complete" && (
                  <div className="mt-6 flex gap-3 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        resetProcessing()
                        setNewTranscriptionOpen(false)
                      }}
                    >
                      Close
                    </Button>
                    <Button
                      onClick={() => {
                        resetProcessing()
                        setSelectedTranscription(transcriptions[0])
                        setNewTranscriptionOpen(false)
                      }}
                    >
                      View Results
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
