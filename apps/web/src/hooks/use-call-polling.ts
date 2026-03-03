'use client'

import { useState, useEffect, useRef } from 'react'
import { callsApi } from '@/lib/api-client'

const TERMINAL_STATUSES = ['COMPLETED', 'FAILED', 'NO_ANSWER']
const POLL_INTERVAL_MS = 5000

interface UseCallPollingResult {
  status: string
  isPolling: boolean
}

export function useCallPolling(
  callId: string,
  initialStatus: string,
  onComplete?: (status: string) => void
): UseCallPollingResult {
  const [status, setStatus] = useState(initialStatus)
  const [isPolling, setIsPolling] = useState(
    !TERMINAL_STATUSES.includes(initialStatus)
  )
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const onCompleteRef = useRef(onComplete)

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    if (TERMINAL_STATUSES.includes(status)) {
      setIsPolling(false)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    setIsPolling(true)

    const poll = async () => {
      try {
        const data = await callsApi.getStatus(callId)
        const newStatus: string = data?.status ?? status

        if (newStatus !== status) {
          setStatus(newStatus)
        }

        if (TERMINAL_STATUSES.includes(newStatus)) {
          setIsPolling(false)
          if (intervalRef.current) {
            clearInterval(intervalRef.current)
            intervalRef.current = null
          }
          onCompleteRef.current?.(newStatus)
        }
      } catch {
        // Silently ignore poll errors; keep trying
      }
    }

    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [callId, status])

  return { status, isPolling }
}
