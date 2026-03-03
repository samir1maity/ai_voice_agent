'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { PhoneCall, ChevronLeft, ChevronRight } from 'lucide-react'
import { DashboardLayout } from '@/app/dashboard-layout'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CallStatusBadge } from '@/components/shared/StatusBadge'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { Button } from '@/components/ui/button'
import { callsApi } from '@/lib/api-client'

interface Call {
  id: string
  candidateName?: string
  agentName?: string
  status: string
  durationSeconds?: number
  cost?: number
  overallScore?: number | null
  isQualified?: boolean | null
  createdAt: string
}

interface CallsResponse {
  data: Call[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'INITIATED', label: 'Initiated' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'NO_ANSWER', label: 'No Answer' },
]

const DATE_RANGE_OPTIONS = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
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

export default function CallsPage() {
  const [status, setStatus] = useState('ALL')
  const [dateRange, setDateRange] = useState('all')
  const [page, setPage] = useState(1)

  const { data, isLoading, error } = useQuery<CallsResponse>({
    queryKey: ['calls', { status, dateRange, page }],
    queryFn: () =>
      callsApi.list({
        status: status === 'ALL' ? undefined : status,
        dateRange: dateRange === 'all' ? undefined : dateRange,
        page,
        limit: 20,
      }),
    placeholderData: (prev) => prev,
  })

  const calls = data?.data ?? []
  const meta = data?.meta

  const handleStatusChange = (val: string) => {
    setStatus(val)
    setPage(1)
  }

  const handleDateChange = (val: string) => {
    setDateRange(val)
    setPage(1)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calls</h1>
          <p className="text-sm text-gray-500">
            {meta ? `${meta.total} total calls` : 'All screening calls'}
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <Select value={status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={dateRange} onValueChange={handleDateChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <LoadingSpinner />
            ) : error ? (
              <div className="p-6 text-center text-sm text-red-500">
                Failed to load calls. Please refresh.
              </div>
            ) : calls.length === 0 ? (
              <EmptyState
                icon={PhoneCall}
                title="No calls found"
                description="No calls match your current filters."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 text-left">
                      <th className="px-6 py-3 font-medium text-gray-500">Candidate</th>
                      <th className="px-6 py-3 font-medium text-gray-500">Agent</th>
                      <th className="px-6 py-3 font-medium text-gray-500">Status</th>
                      <th className="px-6 py-3 font-medium text-gray-500">Duration</th>
                      <th className="px-6 py-3 font-medium text-gray-500">Cost</th>
                      <th className="px-6 py-3 font-medium text-gray-500">Score</th>
                      <th className="px-6 py-3 font-medium text-gray-500">Qualified</th>
                      <th className="px-6 py-3 font-medium text-gray-500">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {calls.map((call) => (
                      <tr
                        key={call.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => (window.location.href = `/calls/${call.id}`)}
                      >
                        <td className="px-6 py-3 font-medium text-gray-900">
                          {call.candidateName ?? '—'}
                        </td>
                        <td className="px-6 py-3 text-gray-600">
                          {call.agentName ?? '—'}
                        </td>
                        <td className="px-6 py-3">
                          <CallStatusBadge status={call.status} />
                        </td>
                        <td className="px-6 py-3 text-gray-600">
                          {formatDuration(call.durationSeconds)}
                        </td>
                        <td className="px-6 py-3 text-gray-600">
                          {formatCost(call.cost)}
                        </td>
                        <td className="px-6 py-3">
                          {call.overallScore != null ? (
                            <span
                              className={`font-semibold ${
                                call.overallScore >= 70
                                  ? 'text-emerald-600'
                                  : call.overallScore >= 50
                                  ? 'text-yellow-600'
                                  : 'text-red-600'
                              }`}
                            >
                              {call.overallScore}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-3">
                          {call.isQualified == null ? (
                            <span className="text-gray-400">—</span>
                          ) : call.isQualified ? (
                            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                              Yes
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">
                              No
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-gray-500">
                          {formatDate(call.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Page {meta.page} of {meta.totalPages} ({meta.total} total)
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={meta.page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={meta.page >= meta.totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
