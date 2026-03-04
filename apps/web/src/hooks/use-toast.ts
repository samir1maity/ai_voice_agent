'use client'

import { useState, useCallback, useEffect } from 'react'

interface Toast {
  id: string
  title?: string
  description?: string
  variant?: 'default' | 'destructive'
}

const toastHandlers = new Set<(toast: Toast) => void>()

function addToastHandler(handler: (toast: Toast) => void) {
  toastHandlers.add(handler)
  return () => {
    toastHandlers.delete(handler)
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

  useEffect(() => {
    const removeHandler = addToastHandler((t) => {
      setToasts((prev) => [...prev, t])
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((p) => p.id !== t.id))
      }, 4000)
    })

    return () => {
      removeHandler()
    }
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return { toasts, dismiss }
}
