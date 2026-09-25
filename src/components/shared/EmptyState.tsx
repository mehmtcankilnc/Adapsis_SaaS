import React from 'react'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon: LucideIcon
  title: React.ReactNode
  description: React.ReactNode
  action?: React.ReactNode
  className?: string
  small?: boolean
}

export function EmptyState({ icon: Icon, title, description, action, className, small = false }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center p-6 w-full h-full", className, small ? "py-10" : "py-24")}>
      <div className={cn("bg-slate-50 flex items-center justify-center rounded-full mb-4 border border-slate-100 shadow-sm", small ? "w-14 h-14" : "w-20 h-20")}>
        <Icon className={cn("text-slate-400", small ? "w-7 h-7" : "w-10 h-10")} strokeWidth={1.5} />
      </div>
      <h3 className={cn("font-semibold text-slate-900 tracking-tight", small ? "text-base mb-1" : "text-xl mb-2")}>
        {title}
      </h3>
      <p className={cn("text-slate-500 max-w-md mx-auto leading-relaxed", small ? "text-xs mb-4" : "text-sm mb-6")}>
        {description}
      </p>
      {action && (
        <div className="mt-2">
          {action}
        </div>
      )}
    </div>
  )
}
