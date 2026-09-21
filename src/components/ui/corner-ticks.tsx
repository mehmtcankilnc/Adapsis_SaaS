import { cn } from "@/lib/utils"

export function CornerTicks({ className }: { className?: string }) {
  return (
    <>
      <span className={cn("pointer-events-none absolute left-0 top-0 h-2.5 w-2.5 border-l border-t", className)} />
      <span className={cn("pointer-events-none absolute right-0 top-0 h-2.5 w-2.5 border-r border-t", className)} />
      <span className={cn("pointer-events-none absolute bottom-0 left-0 h-2.5 w-2.5 border-b border-l", className)} />
      <span className={cn("pointer-events-none absolute bottom-0 right-0 h-2.5 w-2.5 border-b border-r", className)} />
    </>
  )
}
