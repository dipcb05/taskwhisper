"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { auth } from "@/lib/firebase"
import { signOut } from "firebase/auth"
import { useStore } from "@/lib/store"
import { Mic, Home, Settings, LogOut, Menu, X, Moon, Sun, History } from "@/lib/icons"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/voice", label: "New Recording", icon: Mic },
  { href: "/history", label: "History", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const { theme, setTheme } = useStore()

  const handleLogout = async () => {
    if (isSigningOut) return
    setIsSigningOut(true)
    try {
      localStorage.removeItem("taskwhisper-settings")
      await Promise.allSettled([
        fetch("/api/auth/session", {
          method: "DELETE",
          cache: "no-store",
          credentials: "same-origin",
        }),
        signOut(auth),
      ])
      setIsOpen(false)
      router.replace("/auth/login")
      router.refresh()
      window.location.assign("/auth/login")
    } catch (error) {
      console.error("Error signing out:", error)
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-card border border-border"
      >
        <Menu className="w-5 h-5" />
      </button>
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-card border-r border-border flex flex-col transition-transform duration-300",
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                />
              </svg>
            </div>
            <span className="font-semibold text-foreground">TaskWhisper</span>
          </Link>
          <button onClick={() => setIsOpen(false)} className="lg:hidden p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || (item.href === "/dashboard" && pathname === "/dashboard")
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-3">
            <Button
              variant="outline"
              size="sm"
              className="h-11 w-full justify-between rounded-xl border-border/70 bg-background/70 px-3 text-foreground hover:bg-muted/70"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              <span className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500 dark:bg-yellow-500/10 dark:text-yellow-400">
                  {theme === "dark" ? (
                    <Sun className="w-4 h-4" />
                  ) : (
                    <Moon className="w-4 h-4 text-blue-500" />
                  )}
                </span>
                <span className="flex flex-col items-start leading-tight">
                  <span className="text-sm font-medium">{theme === "dark" ? "Light" : "Dark"}</span>
                </span>
              </span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-11 w-full justify-between rounded-xl border-destructive/20 bg-destructive/5 px-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={handleLogout}
              disabled={isSigningOut}
            >
              <span className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
                  <LogOut className="w-4 h-4" />
                </span>
                <span className="flex flex-col items-start leading-tight">
                  <span className="text-sm font-medium">{isSigningOut ? "Signing out" : "Sign out"}</span>
                </span>
              </span>
            </Button>
          </div>
        </div>
      </aside>
    </>
  )
}
