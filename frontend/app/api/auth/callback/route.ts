import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code")

    if (!code) {
      return NextResponse.json({ error: "No auth code provided" }, { status: 400 })
    }

    console.log("[v0] Auth callback with code:", code.substring(0, 10))

    return NextResponse.redirect(new URL("/dashboard", request.url))
  } catch (error) {
    console.error("[v0] Auth error:", error)
    return NextResponse.json({ error: "Auth failed" }, { status: 500 })
  }
}
