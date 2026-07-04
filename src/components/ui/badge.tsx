import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "brand"
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2",
        {
          "border-transparent bg-slate-900 text-slate-50 shadow hover:bg-slate-900/80": variant === "default",
          "border-transparent bg-slate-100 text-slate-900 hover:bg-slate-100/80": variant === "secondary",
          "border-transparent bg-red-100 text-red-900": variant === "destructive",
          "border-transparent bg-emerald-100 text-emerald-800": variant === "success",
          "border-transparent bg-amber-100 text-amber-800": variant === "warning",
          "border-transparent bg-brand-100 text-brand-800": variant === "brand",
          "text-slate-950": variant === "outline",
        },
        className
      )}
      {...props}
    />
  )
}

export { Badge }
