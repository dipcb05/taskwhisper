import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as Blob
    const provider = formData.get("provider") as string
    const model = formData.get("model") as string
    const apiKey = formData.get("apiKey") as string

    if (!file || !provider || !apiKey) {
      return NextResponse.json(
        { error: "Missing required fields or API key. Please check your settings." },
        { status: 400 }
      )
    }

    if (provider === "openai") {
      const openAiFormData = new FormData()
      openAiFormData.append("file", file, "audio.webm")
      openAiFormData.append("model", model || "whisper-1")

      const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
        },
        body: openAiFormData,
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error?.message || `OpenAI API error: ${response.statusText}`)
      }

      const data = await response.json()
      return NextResponse.json({ text: data.text })
    }

    return NextResponse.json({ error: "Unsupported transcription provider" }, { status: 400 })
  } catch (error) {
    console.error("[v0] Transcribe API error:", error)
    return NextResponse.json(
      { error: "Failed to transcribe audio.", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
