import { auth } from "@/lib/firebase-admin"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const { idToken } = await request.json()

  // Set session cookie with Firebase Admin
  const expiresIn = 60 * 60 * 24 * 5 * 1000 // 5 days
  const sessionCookie = await auth.createSessionCookie(idToken, { expiresIn })

  const options = {
    name: "session",
    value: sessionCookie,
    maxAge: expiresIn,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  }

  const cookieStore = await cookies()
  cookieStore.set(options.name, options.value, options)

  return NextResponse.json({ status: "success" })
}

export async function DELETE() {
  const cookieStore = await cookies()
  cookieStore.set("session", "", { 
    maxAge: 0, 
    path: "/", 
    httpOnly: true,
    secure: process.env.NODE_ENV === "production"
  })
  return NextResponse.json({ status: "success" })
}
