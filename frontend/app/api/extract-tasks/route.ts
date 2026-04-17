import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { text, provider, model, apiKey } = body

    if (!text || !provider || !apiKey) {
      return NextResponse.json(
        { error: "Missing required fields or API key not configured. Please check your settings." },
        { status: 400 }
      )
    }

    const systemPrompt = `You are an AI task extraction assistant. Extract all actionable tasks from the following transcript.
The transcript may be in any language, including English or Bengali. Please identify distinct tasks and return them.
Return ONLY a valid JSON array of objects. Do not format with markdown blocks like \`\`\`json.
Each object MUST have the following exact structure:
[
  {
    "id": "generate-a-unique-id",
    "text": "The extracted task text (keep it in the original language)",
    "completed": false,
    "priority": "high", "medium", or "low",
    "dueDate": "A date string or null if not mentioned"
  }
]
`

    if (provider === "openai") {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model || "gpt-3.5-turbo",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: text },
          ],
        }),
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`)
      }

      const data = await response.json()
      const content = data.choices[0].message.content
      const tasks = JSON.parse(content)
      return NextResponse.json({ tasks })
    } 
    
    if (provider === "gemini") {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model || "gemini-1.5-pro"}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            system_instruction: {
              parts: { text: systemPrompt }
            },
            contents: [
              {
                role: "user",
                parts: [{ text }],
              },
            ],
            generationConfig: {
              responseMimeType: "application/json",
            },
          }),
        }
      )

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.statusText}`)
      }

      const data = await response.json()
      let content = data.candidates[0].content.parts[0].text
      const tasks = JSON.parse(content)
      return NextResponse.json({ tasks })
    }

    return NextResponse.json({ error: "Unsupported provider configuration" }, { status: 400 })
  } catch (error) {
    console.error("[v0] Extract Tasks API error:", error)
    return NextResponse.json(
      { error: "Failed to extract tasks using AI.", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
