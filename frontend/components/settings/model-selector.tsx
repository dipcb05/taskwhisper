"use client"

import { useState, useEffect } from "react"
import { Zap } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { useLocalStore } from "@/lib/local-store"
import { useToast } from "@/hooks/use-toast"

const PROVIDERS = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "gemini", label: "Google Gemini" },
]

export function ModelSelector() {
  const { modelSettings, setModelSettings, apiKeys } = useLocalStore()
  const [availableModels, setAvailableModels] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  // Fetch models when provider changes
  useEffect(() => {
    if (!modelSettings.provider) return

    const fetchModels = async () => {
      setIsLoading(true)
      try {
        const response = await fetch("/api/models", {
          headers: {
            "x-provider": modelSettings.provider || "openai",
            "x-api-key": (apiKeys as any)[modelSettings.provider || "openai"] || "",
          },
        })

        if (response.ok) {
          const data = await response.json()
          setAvailableModels(data.models)
        }
      } catch (error) {
        console.error("[v0] Failed to fetch models:", error)
        toast({ title: "Error", description: "Failed to load models", variant: "destructive" })
      } finally {
        setIsLoading(false)
      }
    }

    fetchModels()
  }, [modelSettings.provider, apiKeys, toast])

  const handleProviderChange = (provider: string) => {
    const hasKey = !!(apiKeys as any)[provider]
    if (!hasKey) {
      toast({
        title: "API Key Required",
        description: "Please add an API key for this provider first",
        variant: "destructive",
      })
      return
    }
    setModelSettings({ provider })
  }

  const handleModelChange = (model: string) => {
    setModelSettings({ model })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Model Settings
        </CardTitle>
        <CardDescription>Choose your LLM provider and model for task extraction</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>AI Provider</Label>
          <Select value={modelSettings.provider || "openai"} onValueChange={handleProviderChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROVIDERS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Model</Label>
          <Select value={modelSettings.model || ""} onValueChange={handleModelChange} disabled={isLoading}>
            <SelectTrigger>
              <SelectValue placeholder={isLoading ? "Loading models..." : "Select a model"} />
            </SelectTrigger>
            <SelectContent>
              {availableModels.map((model) => (
                <SelectItem key={model} value={model}>
                  {model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
}
