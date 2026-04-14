"use client"

import { useStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Moon, Sun } from "@/lib/icons"

export function ThemeToggle() {
  const { theme, setTheme } = useStore()

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="rounded-full w-9 h-9 border-border bg-background/50 backdrop-blur-sm hover:bg-accent transition-colors"
    >
      {theme === "dark" ? (
        <Sun className="h-[1.2rem] w-[1.2rem] text-yellow-500 fill-yellow-500/20" />
      ) : (
        <Moon className="h-[1.2rem] w-[1.2rem] text-blue-600 fill-blue-600/20" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
