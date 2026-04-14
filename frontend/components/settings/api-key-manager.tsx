"use client"

import { useState } from "react"
import { Lock, Eye, EyeOff, Trash2, Plus } from "@/lib/icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useLocalStore } from "@/lib/local-store"
import { useToast } from "@/hooks/use-toast"

const PROVIDERS = [
  { value: "openai", label: "OpenAI", description: "GPT-4, GPT-3.5 models" },
  { value: "anthropic", label: "Anthropic", description: "Claude models" },
  { value: "gemini", label: "Google Gemini", description: "Gemini models" },
]

export function APIKeyManager() {
  const { apiKeys, setApiKeys } = useLocalStore()
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({})
  const [editingProvider, setEditingProvider] = useState<string | null>(null)
  const [newKey, setNewKey] = useState("")
  const { toast } = useToast()

  const handleSaveKey = (provider: string) => {
    if (!newKey.trim()) {
      toast({ title: "Error", description: "API key cannot be empty", variant: "destructive" })
      return
    }

    setApiKeys({ [provider]: newKey })
    setNewKey("")
    setEditingProvider(null)
    toast({ title: "Success", description: `${provider} API key saved securely to localStorage` })
  }

  const handleDeleteKey = (provider: string) => {
    setApiKeys({ [provider]: "" })
    toast({ title: "Removed", description: `${provider} API key deleted` })
  }

  const toggleVisibility = (provider: string) => {
    setVisibleKeys((prev) => ({ ...prev, [provider]: !prev[provider] }))
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Provider API Keys</CardTitle>
        <CardDescription>Store API keys locally for LLM providers. Never shared with servers.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {PROVIDERS.map((provider) => {
          const hasKey = !!(apiKeys as any)[provider.value]
          const isEditing = editingProvider === provider.value

          return (
            <div key={provider.value} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{provider.label}</p>
                  <p className="text-sm text-muted-foreground">{provider.description}</p>
                </div>
                {hasKey && !isEditing && (
                  <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded">
                    Configured
                  </span>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-3">
                  <Input
                    type="password"
                    placeholder={`Paste your ${provider.label} API key`}
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    className="font-mono text-sm"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleSaveKey(provider.value)}>
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingProvider(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  {hasKey ? (
                    <>
                      <Button size="sm" variant="outline" onClick={() => toggleVisibility(provider.value)}>
                        {visibleKeys[provider.value] ? (
                          <>
                            <EyeOff className="w-4 h-4 mr-1" /> Hide
                          </>
                        ) : (
                          <>
                            <Eye className="w-4 h-4 mr-1" /> Show
                          </>
                        )}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingProvider(provider.value)}>
                        Update
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDeleteKey(provider.value)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" onClick={() => setEditingProvider(provider.value)}>
                      <Plus className="w-4 h-4 mr-1" /> Add Key
                    </Button>
                  )}
                </div>
              )}

              {hasKey && visibleKeys[provider.value] && (
                <div className="bg-muted p-3 rounded font-mono text-xs break-all">
                  <Lock className="w-3 h-3 inline mr-1" />
                  {(apiKeys as any)[provider.value]}
                </div>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
