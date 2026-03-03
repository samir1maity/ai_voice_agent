'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import {
  ArrowLeft,
  RefreshCw,
  Printer,
  Loader2,
  Phone,
  Clock,
  DollarSign,
  Calendar,
  User,
} from 'lucide-react'
import { DashboardLayout } from '@/app/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CallStatusBadge } from '@/components/shared/StatusBadge'
import { ScreeningScore } from '@/components/calls/ScreeningScore'
import { TechStackTags } from '@/components/calls/TechStackTags'
import { TranscriptViewer } from '@/components/calls/TranscriptViewer'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { useCallPolling } from '@/hooks/use-call-polling'
import { callsApi } from '@/lib/api-client'
import { toast } from '@/hooks/use-toast'

interface CallDetail {
  id: string
  status: string
  candidateId?: string
  candidateName?: string
  candidatePhone?: string
  agentName?: string
  durationSeconds?: number
  cost?: number
  overallScore?: number | null
  technicalScore?: number | null
  experienceScore?: number | null
  communicationScore?: number | null
  isQualified?: boolean | null
  summary?: string | null
  techStack?: string[]
  transcript?: string | null
  createdAt: string
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
  return `$${cost.toFixed(4)}`
}

function MetaItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string
}) {
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
      toast({
        title: 'Call ended',
        description: `Call status: ${finalStatus}`,
      })
    }
  )

  const analyzeMutation = useMutation({
    mutationFn: () => callsApi.analyze(id),
    onSuccess: () => {
      toast({ title: 'Analysis complete', description: 'Scores have been updated.' })
      queryClient.invalidateQueries({ queryKey: ['call', id] })
    },
    onError: (err: Error) => {
      toast({ title: 'Analysis failed', description: err.message, variant: 'destructive' })
    },
  })

  const handleExport = async () => {
    try {
      await callsApi.getReport(id)
      window.print()
    } catch (err) {
      toast({ title: 'Export failed', description: 'Could not generate report.', variant: 'destructive' })
    }
  }

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
                  {call.candidateName ?? 'Unknown Candidate'}
                </h1>
                <CallStatusBadge status={displayStatus} />
                {isPolling && <PollingIndicator />}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-gray-500">
                {call.candidatePhone && (
                  <MetaItem icon={Phone} label="Phone" value={call.candidatePhone} />
                )}
                <MetaItem icon={Calendar} label="Date" value={formatDate(call.createdAt)} />
                <MetaItem icon={Clock} label="Duration" value={formatDuration(call.durationSeconds)} />
                <MetaItem icon={DollarSign} label="Cost" value={formatCost(call.cost)} />
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              className="gap-1.5"
            >
              <Printer className="h-4 w-4" />
              Export Report
            </Button>
            <Button
              size="sm"
              onClick={() => analyzeMutation.mutate()}
              disabled={analyzeMutation.isPending}
              className="gap-1.5"
            >
              {analyzeMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Re-analyze
            </Button>
          </div>
        </div>

        {/* Candidate Link */}
        {call.candidateId && (
          <div className="flex items-center gap-2 rounded-lg border bg-gray-50 px-4 py-3 text-sm">
            <User className="h-4 w-4 text-gray-400" />
            <span className="text-gray-500">Candidate profile:</span>
            <Link
              href={`/candidates/${call.candidateId}`}
              className="font-medium text-blue-600 hover:underline"
            >
              {call.candidateName}
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Score Column */}
          <div className="space-y-6 lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Screening Score</CardTitle>
              </CardHeader>
              <CardContent>
                <ScreeningScore
                  overallScore={call.overallScore}
                  technicalScore={call.technicalScore}
                  experienceScore={call.experienceScore}
                  communicationScore={call.communicationScore}
                  isQualified={call.isQualified}
                />
              </CardContent>
            </Card>

            {call.techStack && call.techStack.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Detected Tech Stack</CardTitle>
                </CardHeader>
                <CardContent>
                  <TechStackTags techStack={call.techStack} />
                </CardContent>
              </Card>
            )}

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
          </div>

          {/* Transcript Column */}
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
