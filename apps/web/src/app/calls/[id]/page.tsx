'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { ArrowLeft, Phone, Clock, DollarSign, Calendar, User } from 'lucide-react'
import { DashboardLayout } from '@/app/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CallStatusBadge } from '@/components/shared/StatusBadge'
import { TranscriptViewer } from '@/components/calls/TranscriptViewer'
import { TechStackTags } from '@/components/calls/TechStackTags'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { useCallPolling } from '@/hooks/use-call-polling'
import { callsApi } from '@/lib/api-client'
import { toast } from '@/hooks/use-toast'

interface CallDetail {
  id: string
  status: string
  duration?: number
  cost?: number
  summary?: string | null
  transcript?: string | null
  createdAt: string
  candidate?: { id: string; name: string; phone: string }
  agent?: { id: string; name: string }
  analytics?: {
    detectedTechStack?: string[]
    extractedYearsExp?: number | null
    extractedCurrentRole?: string | null
  } | null
}

interface PageProps {
  params: { id: string }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatDuration(s?: number) {
  if (!s) return '—'
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

function formatCost(cost?: number) {
  if (cost == null) return '—'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cost)
}

function MetaItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="h-4 w-4 text-gray-400" />
      <span className="text-gray-500">{label}:</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  )
}

function PollingIndicator() {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-blue-600">
      <span className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
      Live updates active
    </span>
  )
}

export default function CallDetailPage({ params }: PageProps) {
  const { id } = params
  const queryClient = useQueryClient()

  const { data: call, isLoading } = useQuery<CallDetail>({
    queryKey: ['call', id],
    queryFn: () => callsApi.get(id),
  })

  const { status: liveStatus, isPolling } = useCallPolling(
    id,
    call?.status ?? 'INITIATED',
    (finalStatus) => {
      queryClient.invalidateQueries({ queryKey: ['call', id] })
      toast({ title: 'Call ended', description: `Call status: ${finalStatus}` })
    }
  )

  if (isLoading) return <DashboardLayout><LoadingSpinner /></DashboardLayout>
  if (!call)
    return (
      <DashboardLayout>
        <div className="py-20 text-center text-gray-500">Call not found.</div>
      </DashboardLayout>
    )

  const displayStatus = liveStatus || call.status

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Link href="/calls">
              <Button variant="ghost" size="sm" className="gap-1.5">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">
                  {call.candidate?.name ?? 'Unknown Candidate'}
                </h1>
                <CallStatusBadge status={displayStatus} />
                {isPolling && <PollingIndicator />}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-gray-500">
                {call.candidate?.phone && (
                  <MetaItem icon={Phone} label="Phone" value={call.candidate.phone} />
                )}
                <MetaItem icon={Calendar} label="Date" value={formatDate(call.createdAt)} />
                <MetaItem icon={Clock} label="Duration" value={formatDuration(call.duration)} />
                <MetaItem icon={DollarSign} label="Cost" value={formatCost(call.cost)} />
              </div>
            </div>
          </div>
        </div>

        {/* Candidate Link */}
        {/* {call.candidate && (
          <div className="flex items-center gap-2 rounded-lg border bg-gray-50 px-4 py-3 text-sm">
            <User className="h-4 w-4 text-gray-400" />
            <span className="text-gray-500">Candidate profile:</span>
            <Link href={`/candidates/${call.candidate.id}`} className="font-medium text-blue-600 hover:underline">
              {call.candidate.name}
            </Link>
          </div>
        )} */}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left column: summary */}
          <div className="space-y-6 lg:col-span-1">
            {call.summary && (
              <Card>
                <CardHeader>
                  <CardTitle>Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-gray-700">{call.summary}</p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Call Insights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">Tech Stack Mentioned</p>
                  <TechStackTags techStack={call.analytics?.detectedTechStack ?? []} />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-700">Extracted Years of Experience</p>
                  <p className="text-sm text-gray-700">
                    {call.analytics?.extractedYearsExp != null
                      ? `${call.analytics.extractedYearsExp} years`
                      : '—'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Transcript */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Call Transcript</CardTitle>
              </CardHeader>
              <CardContent>
                <TranscriptViewer transcript={call.transcript} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
