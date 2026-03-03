'use client'

import { Badge } from '@/components/ui/badge'

type CandidateStatus = 'PENDING' | 'SCHEDULED' | 'CALLED' | 'QUALIFIED' | 'DISQUALIFIED' | 'NO_ANSWER'
type CallStatus = 'INITIATED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'NO_ANSWER'

const candidateStatusConfig: Record<
  CandidateStatus,
  { label: string; variant: 'gray' | 'info' | 'purple' | 'success' | 'destructive' | 'warning' }
> = {
  PENDING: { label: 'Pending', variant: 'gray' },
  SCHEDULED: { label: 'Scheduled', variant: 'info' },
  CALLED: { label: 'Called', variant: 'purple' },
  QUALIFIED: { label: 'Qualified', variant: 'success' },
  DISQUALIFIED: { label: 'Disqualified', variant: 'destructive' },
  NO_ANSWER: { label: 'No Answer', variant: 'warning' },
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
