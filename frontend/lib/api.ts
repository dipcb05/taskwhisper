const DEFAULT_API_BASE_URL = "http://localhost:8000"

export function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE_URL
}

export function buildApiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return `${getApiBaseUrl()}${normalizedPath}`
}

type ApiFetchOptions = RequestInit & {
  requireAuth?: boolean
}

export async function getFirebaseIdToken() {
  const { auth } = await import("@/lib/firebase")
  await auth.authStateReady()

  const currentUser = auth.currentUser
  if (!currentUser) {
    throw new Error("You must be logged in to process recordings.")
  }

  return currentUser.getIdToken()
}

export async function apiFetch(path: string, options: ApiFetchOptions = {}) {
  const { requireAuth = false, headers, ...init } = options
  const requestHeaders = new Headers(headers)

  if (requireAuth) {
    const token = await getFirebaseIdToken()
    requestHeaders.set("Authorization", `Bearer ${token}`)
  }

  return fetch(buildApiUrl(path), {
    ...init,
    headers: requestHeaders,
  })
}
