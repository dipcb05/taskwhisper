"use client"

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react"
import Script from "next/script"

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: string | HTMLElement,
        options: {
          sitekey: string
          theme?: "light" | "dark" | "auto"
          callback?: (token: string) => void
          "expired-callback"?: () => void
          "error-callback"?: () => void
        },
      ) => string
      reset: (widgetId?: string) => void
      remove: (widgetId?: string) => void
    }
  }
}

export interface TurnstileWidgetHandle {
  reset: () => void
}

interface TurnstileWidgetProps {
  onTokenChange: (token: string | null) => void
}

const SITE_KEY = process.env.NEXT_PUBLIC_CF_SITE_KEY

export const TurnstileWidget = forwardRef<TurnstileWidgetHandle, TurnstileWidgetProps>(function TurnstileWidget(
  { onTokenChange },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const widgetIdRef = useRef<string | null>(null)
  const [scriptLoaded, setScriptLoaded] = useState(false)
  const [theme, setTheme] = useState<"light" | "dark">("light")

  useImperativeHandle(ref, () => ({
    reset() {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.reset(widgetIdRef.current)
      }
      onTokenChange(null)
    },
  }))

  useEffect(() => {
    const updateTheme = () => {
      setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light")
    }

    updateTheme()

    const observer = new MutationObserver(updateTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!SITE_KEY || !scriptLoaded || !containerRef.current || !window.turnstile) {
      return
    }

    if (widgetIdRef.current) {
      window.turnstile.remove(widgetIdRef.current)
      widgetIdRef.current = null
      onTokenChange(null)
    }

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: SITE_KEY,
      theme,
      callback: (token) => onTokenChange(token),
      "expired-callback": () => onTokenChange(null),
      "error-callback": () => onTokenChange(null),
    })

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
  }, [onTokenChange, scriptLoaded, theme])

  if (!SITE_KEY) {
    return <p className="text-sm text-destructive">Turnstile site key is not configured.</p>
  }

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
      />
      <div className="flex justify-center">
        <div ref={containerRef} />
      </div>
    </>
  )
})
