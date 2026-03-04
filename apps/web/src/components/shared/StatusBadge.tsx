'use client'

import { Badge } from '@/components/ui/badge'

type CandidateStatus =
  | 'PENDING'
  | 'CALLED'
  | 'NO_ANSWER'
  | 'APPROVED'
  | 'REJECTED'
  | 'IN_PROCESS'
  | 'READY_FOR_CALL'
type CallStatus = 'INITIATED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'NO_ANSWER'

const candidateStatusConfig: Record<
  CandidateStatus,
  { label: string; variant: 'gray' | 'info' | 'purple' | 'warning' | 'success' | 'destructive' }
> = {
  PENDING: { label: 'Pending', variant: 'gray' },
  CALLED: { label: 'Called', variant: 'purple' },
  NO_ANSWER: { label: 'No Answer', variant: 'warning' },
  APPROVED: { label: 'Approved', variant: 'success' },
  REJECTED: { label: 'Rejected', variant: 'destructive' },
  IN_PROCESS: { label: 'Still in Process', variant: 'info' },
  READY_FOR_CALL: { label: 'Ready for Call', variant: 'gray' },
}

const callStatusConfig: Record<
  CallStatus,
  { label: string; variant: 'info' | 'purple' | 'success' | 'destructive' | 'warning' }
> = {
  INITIATED: { label: 'Initiated', variant: 'info' },
  IN_PROGRESS: { label: 'In Progress', variant: 'purple' },
  COMPLETED: { label: 'Completed', variant: 'success' },
  FAILED: { label: 'Failed', variant: 'destructive' },
  NO_ANSWER: { label: 'No Answer', variant: 'warning' },
}

export function CandidateStatusBadge({ status }: { status: string }) {
  const config = candidateStatusConfig[status as CandidateStatus] ?? {
    label: status,
    variant: 'gray' as const,
  }
  return <Badge variant={config.variant}>{config.label}</Badge>
}

export function CallStatusBadge({ status }: { status: string }) {
  const config = callStatusConfig[status as CallStatus] ?? {
    label: status,
    variant: 'info' as const,
  }
  return <Badge variant={config.variant}>{config.label}</Badge>
}
