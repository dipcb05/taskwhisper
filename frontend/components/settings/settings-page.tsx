"use client"

import { useState } from "react"
import { Settings, Moon, Sun, Trash2 } from "@/lib/icons"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useApp } from "@/lib/context"
import { useLocalStore } from "@/lib/local-store"
import { useToast } from "@/hooks/use-toast"
import { APIKeyManager } from "./api-key-manager"
import { ModelSelector } from "./model-selector"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function SettingsPage() {
  const { isDark, toggleTheme } = useApp()
  const { userProfile, setUserProfile, autoSync, setAutoSync, clearAllData } = useLocalStore()
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const { toast } = useToast()

  const handleClearAllData = () => {
    clearAllData()
    setShowClearConfirm(false)
    toast({
      title: "Data Cleared",
      description: "All local data has been permanently deleted",
      variant: "destructive",
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-3 mb-8">
          <Settings className="w-8 h-8" />
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>

        <Tabs defaultValue="appearance" className="space-y-6">
          <TabsList>
            <TabsTrigger value="appearance">Appearance</TabsTrigger>
            <TabsTrigger value="providers">AI Providers</TabsTrigger>
            <TabsTrigger value="sync">Cloud Sync</TabsTrigger>
            <TabsTrigger value="data">Data & Privacy</TabsTrigger>
          </TabsList>

          <TabsContent value="appearance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Theme</CardTitle>
                <CardDescription>Choose your preferred appearance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Theme Mode</Label>
                  <Select
                    value={isDark ? "dark" : "light"}
                    onValueChange={(v) => isDark === (v === "dark") || toggleTheme()}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">
                        <span className="flex items-center gap-2">
                          <Sun className="w-4 h-4" /> Light
                        </span>
                      </SelectItem>
                      <SelectItem value="dark">
                        <span className="flex items-center gap-2">
                          <Moon className="w-4 h-4" /> Dark
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="providers" className="space-y-4">
            <APIKeyManager />
            <ModelSelector />
          </TabsContent>

          <TabsContent value="sync" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Cloud Sync Settings</CardTitle>
                <CardDescription>Manage automatic cloud synchronization of your notes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Automatic Sync</p>
                    <p className="text-sm text-muted-foreground">Automatically sync notes to cloud when online</p>
                  </div>
                  <Button variant={autoSync ? "default" : "outline"} onClick={() => setAutoSync(!autoSync)}>
                    {autoSync ? "Enabled" : "Disabled"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="data" className="space-y-4">
            <Card className="border-destructive/50">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>Permanently delete all your local data</CardDescription>
              </CardHeader>
              <CardContent>
                {showClearConfirm ? (
                  <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 space-y-4">
                    <p className="text-sm">
                      Are you sure? This will delete all local notes, tasks, settings, and API keys. This action cannot
                      be undone.
                    </p>
                    <div className="flex gap-2">
                      <Button variant="destructive" onClick={handleClearAllData}>
                        Yes, Delete Everything
                      </Button>
                      <Button variant="outline" onClick={() => setShowClearConfirm(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="destructive" onClick={() => setShowClearConfirm(true)}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear All Data
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
