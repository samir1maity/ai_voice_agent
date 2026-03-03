'use client'

import { useToast } from '@/hooks/use-toast'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <div className="fixed bottom-0 right-0 z-50 flex flex-col gap-2 p-4 max-w-sm w-full">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'relative flex items-start gap-3 rounded-lg border p-4 shadow-lg transition-all',
            'animate-in slide-in-from-right-full',
            toast.variant === 'destructive'
              ? 'bg-destructive text-destructive-foreground border-destructive'
              : 'bg-card text-card-foreground border-border'
          )}
        >
          <div className="flex-1">
            {toast.title && <p className="text-sm font-semibold">{toast.title}</p>}
            {toast.description && <p className="text-sm opacity-90 mt-0.5">{toast.description}</p>}
          </div>
          <button
            onClick={() => dismiss(toast.id)}
            className="rounded-sm opacity-70 hover:opacity-100 transition-opacity"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
