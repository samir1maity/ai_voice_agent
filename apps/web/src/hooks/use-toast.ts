'use client'

import { useState, useCallback } from 'react'

interface Toast {
  id: string
  title?: string
  description?: string
  variant?: 'default' | 'destructive'
}

let toastHandlers: ((toast: Toast) => void)[] = []

function addToastHandler(handler: (toast: Toast) => void) {
  toastHandlers.push(handler)
  return () => {
    toastHandlers = toastHandlers.filter((h) => h !== handler)
  }
}

export function toast(options: Omit<Toast, 'id'>) {
  const id = Math.random().toString(36).slice(2)
  const newToast = { ...options, id }
  toastHandlers.forEach((h) => h(newToast))
  return id
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  // Register handler on mount
  useState(() => {
    const remove = addToastHandler((t) => {
      setToasts((prev) => [...prev, t])
      setTimeout(() => {
        setToasts((prev) => prev.filter((p) => p.id !== t.id))
      }, 4000)
    })
    return remove
  })

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return { toasts, dismiss }
}
