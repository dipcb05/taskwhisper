import { NextResponse } from "next/server"

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

export async function POST(request: Request) {
  const secret = process.env.CF_SECRET_KEY

  if (!secret) {
    return NextResponse.json({ error: "Turnstile secret key is not configured." }, { status: 500 })
  }

  let token: string | undefined
  try {
    const body = await request.json()
    token = body?.token
  } catch {
    return NextResponse.json({ error: "Invalid verification request." }, { status: 400 })
  }

  if (!token) {
    return NextResponse.json({ error: "Missing Turnstile token." }, { status: 400 })
  }

  const formData = new FormData()
  formData.append("secret", secret)
  formData.append("response", token)

  const response = await fetch(VERIFY_URL, {
    method: "POST",
    body: formData,
  })

  if (!response.ok) {
    return NextResponse.json({ error: "Turnstile verification request failed." }, { status: 502 })
  }

  const payload = await response.json()

  if (!payload.success) {
    return NextResponse.json(
      {
        error: "Turnstile verification failed.",
        codes: payload["error-codes"] ?? [],
      },
      { status: 400 },
    )
  }

  return NextResponse.json({ success: true })
}
