'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { ArrowLeft, Pencil, Check, X, Phone, Mail, Briefcase, Clock, Loader2 } from 'lucide-react'
import { DashboardLayout } from '@/app/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CandidateStatusBadge, CallStatusBadge } from '@/components/shared/StatusBadge'
import { CallButton } from '@/components/calls/CallButton'
import { TechStackTags } from '@/components/calls/TechStackTags'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { candidatesApi } from '@/lib/api-client'
import { toast } from '@/hooks/use-toast'

interface Candidate {
  id: string
  name: string
  phone: string
  email?: string
  currentRole?: string
  yearsOfExperience?: number
  status: string
  timezone?: string
  latestCall?: {
    id: string
    summary?: string | null
    techStack?: string[]
  } | null
}

interface CandidateCall {
  id: string
  status: string
  durationSeconds?: number
  createdAt: string
  agentName?: string
}

interface PageProps {
  params: { id: string }
}

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

export default function CandidateProfilePage({ params }: PageProps) {
  const { id } = params
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    email: '',
    currentRole: '',
    yearsOfExperience: '',
  })

  const { data: candidate, isLoading } = useQuery<Candidate>({
    queryKey: ['candidate', id],
    queryFn: () => candidatesApi.get(id),
  })

  const { data: calls } = useQuery<CandidateCall[]>({
    queryKey: ['candidate-calls', id],
    queryFn: () => candidatesApi.getCalls(id),
    enabled: !!candidate,
  })

  const updateMutation = useMutation({
    mutationFn: () =>
      candidatesApi.update(id, {
        ...editForm,
        yearsOfExperience: editForm.yearsOfExperience
          ? Number(editForm.yearsOfExperience)
          : undefined,
      }),
    onSuccess: () => {
      toast({ title: 'Candidate updated', description: 'Profile saved successfully.' })
      queryClient.invalidateQueries({ queryKey: ['candidate', id] })
      queryClient.invalidateQueries({ queryKey: ['candidates'] })
      setEditing(false)
    },
    onError: (err: Error) => {
      toast({ title: 'Update failed', description: err.message, variant: 'destructive' })
    },
  })

  const startEditing = () => {
    if (!candidate) return
    setEditForm({
      name: candidate.name ?? '',
      phone: candidate.phone ?? '',
      email: candidate.email ?? '',
      currentRole: candidate.currentRole ?? '',
      yearsOfExperience: String(candidate.yearsOfExperience ?? ''),
    })
    setEditing(true)
  }

  if (isLoading) return <DashboardLayout><LoadingSpinner /></DashboardLayout>
  if (!candidate)
    return (
      <DashboardLayout>
        <div className="py-20 text-center text-gray-500">Candidate not found.</div>
      </DashboardLayout>
    )

  const latestCall = candidate.latestCall

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Link href="/candidates">
              <Button variant="ghost" size="sm" className="gap-1.5">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{candidate.name}</h1>
                <CandidateStatusBadge status={candidate.status} />
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                {candidate.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" />
                    {candidate.email}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" />
                  {candidate.phone}
                </span>
                {candidate.currentRole && (
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-3.5 w-3.5" />
                    {candidate.currentRole}
                  </span>
                )}
                {candidate.yearsOfExperience != null && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {candidate.yearsOfExperience} yrs exp
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {!editing && (
              <Button variant="outline" size="sm" onClick={startEditing} className="gap-1.5">
                <Pencil className="h-4 w-4" />
                Edit
              </Button>
            )}
            <CallButton
              candidateId={candidate.id}
              candidateName={candidate.name}
              candidatePhone={candidate.phone}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['candidate', id] })
                queryClient.invalidateQueries({ queryKey: ['candidate-calls', id] })
              }}
            />
          </div>
        </div>

        {/* Edit Form */}
        {editing && (
          <Card>
            <CardHeader>
              <CardTitle>Edit Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={editForm.phone}
                    onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    value={editForm.email}
                    onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Current Role</Label>
                  <Input
                    value={editForm.currentRole}
                    onChange={(e) => setEditForm((p) => ({ ...p, currentRole: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Years of Experience</Label>
                  <Input
                    type="number"
                    value={editForm.yearsOfExperience}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, yearsOfExperience: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditing(false)}>
                  <X className="mr-1.5 h-4 w-4" />
                  Cancel
                </Button>
                <Button
                  onClick={() => updateMutation.mutate()}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="mr-1.5 h-4 w-4" />
                  )}
                  Save
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Latest Call Insights */}
          <div className="space-y-6 lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Latest Call Insights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {latestCall ? (
                  <>
                    {latestCall.techStack && latestCall.techStack.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-700">Tech Stack</p>
                        <TechStackTags techStack={latestCall.techStack} />
                      </div>
                    )}
                    {latestCall.summary && (
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-gray-700">Summary</p>
                        <p className="text-sm text-gray-600">{latestCall.summary}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="py-4 text-center text-sm text-gray-400">
                    No call insights yet. Start a call to see results.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Call History */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Call History</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {!calls || calls.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-400">
                    No calls yet for this candidate.
                  </p>
                ) : (
                  <div className="divide-y">
                    {calls.map((call, index) => (
                      <Link
                        key={call.id}
                        href={`/calls/${call.id}`}
                        className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
                            {calls.length - index}
                          </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <CallStatusBadge status={call.status} />
                            {call.agentName && (
                              <span className="text-xs text-gray-400">via {call.agentName}</span>
                              )}
                            </div>
                            <p className="mt-0.5 text-xs text-gray-500">
                              {formatDate(call.createdAt)} &bull; {formatDuration(call.durationSeconds)}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
