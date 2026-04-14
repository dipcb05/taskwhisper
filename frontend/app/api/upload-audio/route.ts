import { type NextRequest, NextResponse } from "next/server"

// Mock implementation - in production, use @vercel/blob
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Check file size (25MB limit)
    const MAX_SIZE = 25 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is 25MB, got ${(file.size / 1024 / 1024).toFixed(2)}MB` },
        { status: 413 },
      )
    }

    // Mock URL generation - in production, use Vercel Blob SDK: put()
    const mockUrl = `https://blob.vercel-storage.com/mock-${Date.now()}-${file.name}`

    // Log file info for debugging
    console.log("[v0] Audio upload:", {
      filename: file.name,
      size: file.size,
      type: file.type,
      mockUrl,
    })

    return NextResponse.json({ url: mockUrl, size: file.size })
  } catch (error) {
    console.error("[v0] Upload error:", error)
    return NextResponse.json({ error: "Upload failed" }, { status: 500 })
  }
}
