import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDuration(seconds?: number | null): string {
  if (!seconds) return '—'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}m ${secs}s`
}

export function formatCost(cost?: number | null): string {
  if (cost === null || cost === undefined) return '—'
  return `₹${cost.toFixed(2)}`
}

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function getScoreColor(score?: number | null): string {
  if (!score) return 'text-gray-400'
  if (score >= 70) return 'text-emerald-500'
  if (score >= 50) return 'text-yellow-500'
  return 'text-red-500'
}

export function getScoreBg(score?: number | null): string {
  if (!score) return 'bg-gray-100'
  if (score >= 70) return 'bg-emerald-50 border-emerald-200'
  if (score >= 50) return 'bg-yellow-50 border-yellow-200'
  return 'bg-red-50 border-red-200'
}
