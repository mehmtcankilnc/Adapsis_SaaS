'use client'
import * as React from 'react'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

const DialogContext = React.createContext<{open: boolean, setOpen: (v: boolean) => void}>({open: false, setOpen: () => {}})

export function Dialog({ children, open: controlledOpen, onOpenChange }: { children: React.ReactNode, open?: boolean, onOpenChange?: (open: boolean) => void }) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)
  const open = controlledOpen !== undefined ? controlledOpen : uncontrolledOpen
  const setOpen = onOpenChange || setUncontrolledOpen
  return <DialogContext.Provider value={{ open, setOpen }}>{children}</DialogContext.Provider>
}

export function DialogTrigger({ children, asChild }: { children: React.ReactNode, asChild?: boolean }) {
  const { setOpen } = React.useContext(DialogContext)
  if (asChild && React.isValidElement(children)) {
    const childElement = children as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>;
    return React.cloneElement(childElement, {
      onClick: (e: React.MouseEvent) => {
        setOpen(true)
        if (childElement.props.onClick) childElement.props.onClick(e)
      }
    })
  }
  return <div onClick={() => setOpen(true)} className="inline-block cursor-pointer">{children}</div>
}

export function DialogContent({ children, className }: { children: React.ReactNode, className?: string }) {
  const { open, setOpen } = React.useContext(DialogContext)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setOpen(false)} />
      <div className={cn("relative z-50 w-full sm:max-w-[425px] max-h-[85vh] flex flex-col items-stretch text-left bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200", className)}>
        {/* Close button — sticky, always visible */}
        <button onClick={() => setOpen(false)} className="absolute top-4 right-4 z-10 text-slate-400 hover:text-slate-600 transition-colors bg-white/80 backdrop-blur-sm hover:bg-slate-100 rounded-full p-1 border border-slate-200/50">
          <X className="h-4 w-4" />
        </button>
        {children}
      </div>
    </div>
  )
}

export function DialogHeader({ children, className }: { children: React.ReactNode, className?: string }) {
  return <div className={cn("px-5 pt-5 pb-4 border-b border-slate-100 bg-slate-50/50 shrink-0", className)}>{children}</div>
}

export function DialogTitle({ children, className }: { children: React.ReactNode, className?: string }) {
  return <h2 className={cn("text-base font-semibold text-slate-900 pr-8", className)}>{children}</h2>
}

export function DialogDescription({ children, className }: { children: React.ReactNode, className?: string }) {
  return <p className={cn("text-sm text-slate-500 mt-1 pr-6 leading-relaxed break-words whitespace-normal", className)}>{children}</p>
}

export function DialogFooter({ children, className }: { children: React.ReactNode, className?: string }) {
  return <div className={cn("px-5 py-3.5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2 shrink-0", className)}>{children}</div>
}
