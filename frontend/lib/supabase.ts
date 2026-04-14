import { createBrowserClient } from "@supabase/ssr"

// Dummy/mock implementation - replace with real credentials
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dummy.supabase.co"
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy-key"

export const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Helper to check if real credentials are configured
export function hasRealSupabaseConfig(): boolean {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("supabase.co") ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length ||
    0 > 10
  )
}
