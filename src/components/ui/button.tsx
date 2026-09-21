import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-slate-900 text-slate-50 hover:bg-slate-900/90 shadow-sm": variant === 'default',
            "bg-signal-500 text-ink-950 hover:bg-signal-400 shadow-sm": variant === 'primary',
            "bg-red-600 text-white hover:bg-red-700 shadow-sm": variant === 'destructive',
            "border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900": variant === 'outline',
            "bg-slate-100 text-slate-900 hover:bg-slate-200": variant === 'secondary',
            "hover:bg-slate-100 hover:text-slate-900 text-slate-600": variant === 'ghost',
            "h-10 px-4 py-2": size === 'default',
            "h-9 rounded-md px-3 text-xs": size === 'sm',
            "h-11 rounded-md px-8": size === 'lg',
            "h-10 w-10": size === 'icon',
          },
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
