import { Brain } from "@/lib/icons"

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/60 backdrop-blur-xl">
      <div className="relative scale-110">
        <div className="absolute -inset-8 bg-primary/10 rounded-full blur-3xl animate-pulse-glow" />
        <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-card border border-primary/20 shadow-[0_0_50px_rgba(var(--primary),0.1)] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
          
          <Brain className="w-12 h-12 text-primary animate-pulse relative z-10" />
          
          <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
             <div className="h-full w-full bg-[linear-gradient(to_bottom,transparent,var(--primary),transparent)] bg-[length:100%_15%] animate-[scan_2s_linear_infinite]" />
          </div>
        </div>
      </div>
      
      <div className="mt-12 space-y-4 text-center">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold tracking-tight text-foreground">TaskWhisper</h2>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/60 animate-pulse">
            Syncing Neural Grids
          </p>
        </div>
        <div className="h-[2px] w-48 mx-auto rounded-full bg-muted/30 overflow-hidden relative">
          <div className="absolute inset-0 bg-primary w-1/2 animate-[loading-bar_1.5s_infinite_ease-in-out]" />
        </div>
      </div>
    </div>
  )
}
