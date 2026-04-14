import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get("x-api-key")
    const provider = request.headers.get("x-provider")

    // Mock models based on configured provider
    const models: Record<string, string[]> = {
      openai: ["gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"],
      anthropic: ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"],
      gemini: ["gemini-pro", "gemini-1.5-pro"],
    }

    const availableModels = models[provider || "openai"] || models.openai

    console.log("[v0] Models requested:", { provider, count: availableModels.length })

    return NextResponse.json({ models: availableModels, provider })
  } catch (error) {
    console.error("[v0] Models error:", error)
    return NextResponse.json({ error: "Failed to fetch models" }, { status: 500 })
  }
}
