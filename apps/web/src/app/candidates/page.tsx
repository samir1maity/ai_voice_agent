'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import {
  Plus,
  Upload,
  Search,
  ChevronLeft,
  ChevronRight,
  Users,
  Phone,
} from 'lucide-react'
import { DashboardLayout } from '@/app/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CandidateStatusBadge } from '@/components/shared/StatusBadge'
import { CallButton } from '@/components/calls/CallButton'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { batchApi, candidatesApi, getErrorMessage } from '@/lib/api-client'
import { toast } from '@/hooks/use-toast'

interface Candidate {
  id: string
  name: string
  phone: string
  email?: string
  currentRole?: string
  yearsOfExperience?: number
  status: string
  _count?: { calls: number }
  lastCallDate?: string | null
}

interface CandidatesResponse {
  data: Candidate[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

type ManualCandidateStatus = 'APPROVED' | 'REJECTED' | 'IN_PROCESS' | 'PENDING'

const MANUAL_STATUS_OPTIONS: Array<{ value: ManualCandidateStatus; label: string }> = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'IN_PROCESS', label: 'Still in Process' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
]

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'CALLED', label: 'Called' },
  { value: 'NO_ANSWER', label: 'No Answer' },
  { value: 'IN_PROCESS', label: 'Still in Process' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
]

function formatDate(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function CandidatesPage() {
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('ALL')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    candidateId: string
    candidateName: string
    status: ManualCandidateStatus
  } | null>(null)

  const { data, isLoading, error } = useQuery<CandidatesResponse>({
    queryKey: ['candidates', { search, status, page }],
    queryFn: () =>
      candidatesApi.list({
        search: search || undefined,
        status: status === 'ALL' ? undefined : status,
        page,
        limit: 20,
      }),
    placeholderData: (prev) => prev,
  })

  const batchMutation = useMutation({
    mutationFn: (agentId: string) =>
      batchApi.initiateCalls({
        candidateIds: Array.from(selected),
        agentId,
      }),
    onSuccess: (result) => {
      toast({
        title: 'Batch calls initiated',
        description: `${result?.initiated ?? selected.size} calls started.`,
      })
      setSelected(new Set())
      queryClient.invalidateQueries({ queryKey: ['candidates'] })
    },
    onError: (err: Error) => {
      toast({ title: 'Batch failed', description: err.message, variant: 'destructive' })
    },
  })

  const manualStatusMutation = useMutation({
    mutationFn: ({ candidateId, status }: { candidateId: string; status: ManualCandidateStatus }) =>
      candidatesApi.update(candidateId, { status }),
    onSuccess: () => {
      toast({ title: 'Status updated', description: 'Candidate status has been updated.' })
      queryClient.invalidateQueries({ queryKey: ['candidates'] })
      queryClient.invalidateQueries({ queryKey: ['candidate'] })
    },
    onError: (err: Error) => {
      toast({ title: 'Status update failed', description: err.message, variant: 'destructive' })
    },
  })

  const candidates = data?.data ?? []
  const meta = data?.meta

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === candidates.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(candidates.map((c) => c.id)))
    }
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
    setPage(1)
  }

  const handleStatusChange = (val: string) => {
    setStatus(val)
    setPage(1)
  }

  const confirmStatusChange = () => {
    if (!pendingStatusChange) return
    manualStatusMutation.mutate({
      candidateId: pendingStatusChange.candidateId,
      status: pendingStatusChange.status,
    })
    setPendingStatusChange(null)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Candidates</h1>
            <p className="text-sm text-gray-500">
              {meta ? `${meta.total} candidates` : 'Manage your candidate pipeline'}
            </p>
          </div>
          <div className="flex gap-2">
            {/* <Link href="/candidates/import">
              <Button variant="outline" className="gap-2">
                <Upload className="h-4 w-4" />
                Import CSV
              </Button>
            </Link> */}
            <Link href="/candidates/new">
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Candidate
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search by name, phone, role..."
              value={search}
              onChange={handleSearchChange}
              className="pl-9"
            />
          </div>
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
        </div>

        {/* Bulk Action Bar */}
        {selected.size > 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
            <span className="text-sm font-medium text-blue-700">
              {selected.size} selected
            </span>
            <Link href="/batch">
              <Button size="sm" className="gap-1.5">
                <Phone className="h-3.5 w-3.5" />
                Batch Call
              </Button>
            </Link>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelected(new Set())}
            >
              Clear
            </Button>
          </div>
        )}

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <LoadingSpinner />
            ) : error ? (
              <div className="p-6 text-center text-sm text-red-500">
                {getErrorMessage(error, 'Failed to load candidates. Please refresh.')}
              </div>
            ) : candidates.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No candidates found"
                description={
                  search || status !== 'ALL'
                    ? 'Try adjusting your filters.'
                    : 'Add your first candidate to get started.'
                }
                action={
                  !search && status === 'ALL' ? (
                    <Link href="/candidates/new">
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Candidate
                      </Button>
                    </Link>
                  ) : undefined
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50 text-left">
                      <th className="w-10 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.size === candidates.length && candidates.length > 0}
                          onChange={toggleAll}
                          className="rounded border-gray-300"
                        />
                      </th>
                      <th className="px-4 py-3 font-medium text-gray-500">Name</th>
                      <th className="px-4 py-3 font-medium text-gray-500">Phone</th>
                      <th className="px-4 py-3 font-medium text-gray-500">Current Role</th>
                      <th className="px-4 py-3 font-medium text-gray-500">Exp (yrs)</th>
                      <th className="px-4 py-3 font-medium text-gray-500">Status</th>
                      <th className="px-4 py-3 font-medium text-gray-500">Calls</th>
                      <th className="px-4 py-3 font-medium text-gray-500">Last Call</th>
                      <th className="px-4 py-3 font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {candidates.map((candidate) => (
                      (() => {
                        const manualStatus = MANUAL_STATUS_OPTIONS.some((s) => s.value === candidate.status)
                          ? (candidate.status as ManualCandidateStatus)
                          : undefined

                        return (
                          <tr key={candidate.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selected.has(candidate.id)}
                                onChange={() => toggleSelect(candidate.id)}
                                className="rounded border-gray-300"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <Link
                                href={`/candidates/${candidate.id}`}
                                className="font-medium text-gray-900 hover:text-blue-600"
                              >
                                {candidate.name}
                              </Link>
                            </td>
                            <td className="px-4 py-3 text-gray-600">{candidate.phone}</td>
                            <td className="px-4 py-3 text-gray-600">
                              {candidate.currentRole ?? '—'}
                            </td>
                            <td className="px-4 py-3 text-gray-600">
                              {candidate.yearsOfExperience ?? '—'}
                            </td>
                            <td className="px-4 py-3">
                              <CandidateStatusBadge status={candidate.status} />
                            </td>
                            <td className="px-4 py-3 text-gray-600">{candidate._count?.calls ?? 0}</td>
                            <td className="px-4 py-3 text-gray-500">
                              {formatDate(candidate.lastCallDate)}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Link href={`/candidates/${candidate.id}`}>
                                  <Button variant="ghost" size="sm">
                                    View
                                  </Button>
                                </Link>
                                <CallButton
                                  candidateId={candidate.id}
                                  candidateName={candidate.name}
                                  candidatePhone={candidate.phone}
                                  onSuccess={() =>
                                    queryClient.invalidateQueries({ queryKey: ['candidates'] })
                                  }
                                />
                                <Select
                                  value={manualStatus}
                                  onValueChange={(value) =>
                                    setPendingStatusChange({
                                      candidateId: candidate.id,
                                      candidateName: candidate.name,
                                      status: value as ManualCandidateStatus,
                                    })
                                  }
                                  disabled={manualStatusMutation.isPending}
                                >
                                  <SelectTrigger className="h-8 w-40">
                                    <SelectValue placeholder="Set status" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {MANUAL_STATUS_OPTIONS.map((option) => (
                                      <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </td>
                          </tr>
                        )
                      })()
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

      <Dialog open={!!pendingStatusChange} onOpenChange={(open) => !open && setPendingStatusChange(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Status Change</DialogTitle>
            <DialogDescription>
              {pendingStatusChange
                ? `Change status for ${pendingStatusChange.candidateName} to ${MANUAL_STATUS_OPTIONS.find((s) => s.value === pendingStatusChange.status)?.label}?`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p>
              If a candidate is marked <strong>Still in Process</strong>, <strong>Approved</strong>, or <strong>Rejected</strong>, automatic
              call/webhook status updates will not overwrite this status.
            </p>
            <p>Use <strong>Pending</strong> to re-enable automatic call status updates.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingStatusChange(null)}>
              Cancel
            </Button>
            <Button onClick={confirmStatusChange} disabled={manualStatusMutation.isPending}>
              {manualStatusMutation.isPending ? 'Updating...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
