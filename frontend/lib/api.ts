const DEFAULT_API_BASE_URL = "http://localhost:8000"

function normalizeApiBaseUrl(value: string | undefined) {
  const trimmed = value?.trim()
  if (!trimmed) {
    return DEFAULT_API_BASE_URL
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed.replace(/\/+$/, "")
  }

  return `http://${trimmed.replace(/\/+$/, "")}`
}

export function getApiBaseUrl() {
  return normalizeApiBaseUrl(process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL)
}

export function buildApiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return `${getApiBaseUrl()}${normalizedPath}`
}

type ApiFetchOptions = RequestInit & {
  requireAuth?: boolean
}

async function waitForFirebaseUser(timeoutMs = 5000) {
  const { auth } = await import("@/lib/firebase")

  await auth.authStateReady()
  if (auth.currentUser) {
    return auth.currentUser
  }

  return new Promise<typeof auth.currentUser>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      unsubscribe()
      reject(new Error("You must be logged in to process recordings."))
    }, timeoutMs)

    const unsubscribe = auth.onIdTokenChanged((user) => {
      if (!user) {
        return
      }

      window.clearTimeout(timer)
      unsubscribe()
      resolve(user)
    })
  })
}

export async function getFirebaseIdToken() {
  const currentUser = await waitForFirebaseUser()
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
