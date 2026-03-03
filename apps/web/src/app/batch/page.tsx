'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bot, Users, Rocket, CheckCircle, AlertCircle, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react'
import { DashboardLayout } from '@/app/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CandidateStatusBadge } from '@/components/shared/StatusBadge'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { agentsApi, candidatesApi, batchApi } from '@/lib/api-client'
import { toast } from '@/hooks/use-toast'

interface Agent {
  id: string
  name: string
  status: string
  description?: string
}

interface Candidate {
  id: string
  name: string
  phone: string
  currentRole?: string
  yearsOfExperience?: number
  status: string
}

interface CandidatesResponse {
  data: Candidate[]
  meta: { total: number; page: number; limit: number; totalPages: number }
}

interface BatchResult {
  initiated: number
  failed: number
  errors?: Array<{ candidateId: string; message: string }>
}

const STEPS = [
  { index: 1, label: 'Select Agent' },
  { index: 2, label: 'Select Candidates' },
  { index: 3, label: 'Review & Launch' },
]

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((step, idx) => (
        <div key={step.index} className="flex items-center">
          <div className="flex items-center gap-2">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                current > step.index
                  ? 'bg-emerald-500 text-white'
                  : current === step.index
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {current > step.index ? <CheckCircle className="h-4 w-4" /> : step.index}
            </div>
            <span
              className={`text-sm font-medium ${
                current >= step.index ? 'text-gray-900' : 'text-gray-400'
              }`}
            >
              {step.label}
            </span>
          </div>
          {idx < STEPS.length - 1 && (
            <div
              className={`mx-4 h-px w-12 transition-colors ${
                current > step.index ? 'bg-emerald-400' : 'bg-gray-200'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  )
}

export default function BatchPage() {
  const queryClient = useQueryClient()

  const [step, setStep] = useState(1)
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set())
  const [candidateSearch, setCandidateSearch] = useState('')
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null)

  const { data: agents, isLoading: agentsLoading } = useQuery<Agent[]>({
    queryKey: ['agents'],
    queryFn: () => agentsApi.list(),
    enabled: step === 1,
  })

  const { data: candidatesData, isLoading: candidatesLoading } = useQuery<CandidatesResponse>({
    queryKey: ['candidates-batch', candidateSearch],
    queryFn: () =>
      candidatesApi.list({
        search: candidateSearch || undefined,
        status: 'PENDING,NO_ANSWER', // backend splits on comma → Prisma `in` filter
        limit: 50,
      }),
    enabled: step === 2,
  })

  const batchMutation = useMutation({
    mutationFn: () =>
      batchApi.initiateCalls({
        candidateIds: Array.from(selectedCandidates),
        agentId: selectedAgent!.id,
      }),
    onSuccess: (result: BatchResult) => {
      setBatchResult(result)
      toast({
        title: 'Batch calls initiated',
        description: `${result.initiated} calls started, ${result.failed} failed.`,
        variant: result.failed > 0 ? 'destructive' : 'default',
      })
      queryClient.invalidateQueries({ queryKey: ['candidates'] })
      queryClient.invalidateQueries({ queryKey: ['calls'] })
    },
    onError: (err: Error) => {
      toast({ title: 'Batch failed', description: err.message, variant: 'destructive' })
    },
  })

  const candidates = candidatesData?.data ?? []

  const toggleCandidate = (id: string) => {
    setSelectedCandidates((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAllCandidates = () => {
    if (selectedCandidates.size === candidates.length) {
      setSelectedCandidates(new Set())
    } else {
      setSelectedCandidates(new Set(candidates.map((c) => c.id)))
    }
  }

  const canProceedStep1 = selectedAgent != null
  const canProceedStep2 = selectedCandidates.size > 0

  const handleLaunch = () => {
    if (!selectedAgent || selectedCandidates.size === 0) return
    batchMutation.mutate()
  }

  const resetWizard = () => {
    setStep(1)
    setSelectedAgent(null)
    setSelectedCandidates(new Set())
    setCandidateSearch('')
    setBatchResult(null)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Batch Calling</h1>
          <p className="text-sm text-gray-500">
            Initiate AI screening calls for multiple candidates at once
          </p>
        </div>

        {/* Step Indicator */}
        <StepIndicator current={step} />

        {/* Results State */}
        {batchResult && (
          <Card>
            <CardContent className="p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">Batch Launch Results</h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex items-center gap-3 rounded-lg bg-emerald-50 p-4">
                  <CheckCircle className="h-6 w-6 text-emerald-500" />
                  <div>
                    <p className="text-2xl font-bold text-emerald-700">{batchResult.initiated}</p>
                    <p className="text-sm text-emerald-600">Calls initiated</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-red-50 p-4">
                  <AlertCircle className="h-6 w-6 text-red-500" />
                  <div>
                    <p className="text-2xl font-bold text-red-700">{batchResult.failed}</p>
                    <p className="text-sm text-red-600">Failed</p>
                  </div>
                </div>
              </div>
              {batchResult.errors && batchResult.errors.length > 0 && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 space-y-1">
                  {batchResult.errors.map((err, i) => (
                    <p key={i} className="text-xs text-red-700">
                      Candidate {err.candidateId}: {err.message}
                    </p>
                  ))}
                </div>
              )}
              <div className="flex gap-3">
                <Button onClick={resetWizard} variant="outline">
                  Start New Batch
                </Button>
                <Button onClick={() => (window.location.href = '/calls')}>
                  View All Calls
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 1: Select Agent */}
        {!batchResult && step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Select AI Agent</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {agentsLoading ? (
                <LoadingSpinner />
              ) : !agents || agents.length === 0 ? (
                <div className="py-8 text-center">
                  <Bot className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                  <p className="text-gray-500">No agents available. Create one first.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {agents.map((agent) => (
                    <div
                      key={agent.id}
                      onClick={() => setSelectedAgent(agent)}
                      className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${
                        selectedAgent?.id === agent.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                              selectedAgent?.id === agent.id ? 'bg-blue-100' : 'bg-gray-100'
                            }`}
                          >
                            <Bot
                              className={`h-5 w-5 ${
                                selectedAgent?.id === agent.id
                                  ? 'text-blue-600'
                                  : 'text-gray-500'
                              }`}
                            />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{agent.name}</p>
                            <Badge
                              variant={agent.status === 'ACTIVE' ? 'success' : 'gray'}
                              className="mt-0.5"
                            >
                              {agent.status}
                            </Badge>
                          </div>
                        </div>
                        {selectedAgent?.id === agent.id && (
                          <CheckCircle className="h-5 w-5 text-blue-500" />
                        )}
                      </div>
                      {agent.description && (
                        <p className="mt-2 text-xs text-gray-500 line-clamp-2">
                          {agent.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button
                  onClick={() => setStep(2)}
                  disabled={!canProceedStep1}
                  className="gap-2"
                >
                  Next: Select Candidates
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Select Candidates */}
        {!batchResult && step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 2: Select Candidates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-500">
                Showing PENDING and NO_ANSWER candidates only.
              </p>

              <Input
                placeholder="Search candidates..."
                value={candidateSearch}
                onChange={(e) => setCandidateSearch(e.target.value)}
                className="max-w-sm"
              />

              {candidatesLoading ? (
                <LoadingSpinner />
              ) : candidates.length === 0 ? (
                <div className="py-8 text-center">
                  <Users className="mx-auto mb-3 h-10 w-10 text-gray-300" />
                  <p className="text-gray-500">No eligible candidates found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50 text-left">
                        <th className="w-10 px-4 py-3">
                          <input
                            type="checkbox"
                            checked={
                              selectedCandidates.size === candidates.length &&
                              candidates.length > 0
                            }
                            onChange={toggleAllCandidates}
                            className="rounded border-gray-300"
                          />
                        </th>
                        <th className="px-4 py-3 font-medium text-gray-500">Name</th>
                        <th className="px-4 py-3 font-medium text-gray-500">Phone</th>
                        <th className="px-4 py-3 font-medium text-gray-500">Current Role</th>
                        <th className="px-4 py-3 font-medium text-gray-500">Exp</th>
                        <th className="px-4 py-3 font-medium text-gray-500">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {candidates.map((candidate) => (
                        <tr
                          key={candidate.id}
                          className={`cursor-pointer hover:bg-gray-50 ${
                            selectedCandidates.has(candidate.id) ? 'bg-blue-50' : ''
                          }`}
                          onClick={() => toggleCandidate(candidate.id)}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedCandidates.has(candidate.id)}
                              onChange={() => toggleCandidate(candidate.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="rounded border-gray-300"
                            />
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {candidate.name}
                          </td>
                          <td className="px-4 py-3 text-gray-600">{candidate.phone}</td>
                          <td className="px-4 py-3 text-gray-600">
                            {candidate.currentRole ?? '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {candidate.yearsOfExperience != null
                              ? `${candidate.yearsOfExperience} yrs`
                              : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <CandidateStatusBadge status={candidate.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {selectedCandidates.size > 0 && (
                <p className="text-sm font-medium text-blue-600">
                  {selectedCandidates.size} candidate{selectedCandidates.size !== 1 ? 's' : ''} selected
                </p>
              )}

              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={!canProceedStep2}
                  className="gap-2"
                >
                  Next: Review
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Review & Launch */}
        {!batchResult && step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Step 3: Review & Launch</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">
                    Selected Agent
                  </p>
                  <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-indigo-500" />
                    <span className="font-semibold text-gray-900">{selectedAgent?.name}</span>
                    <Badge variant={selectedAgent?.status === 'ACTIVE' ? 'success' : 'gray'}>
                      {selectedAgent?.status}
                    </Badge>
                  </div>
                </div>

                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-400">
                    Candidates to Call
                  </p>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-500" />
                    <span className="text-3xl font-bold text-gray-900">
                      {selectedCandidates.size}
                    </span>
                    <span className="text-gray-500">candidates</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                <p className="font-semibold">Before you launch:</p>
                <ul className="mt-1 list-inside list-disc space-y-1 text-amber-700">
                  <li>Calls will be initiated immediately for all selected candidates.</li>
                  <li>Each candidate will receive a phone call from the AI agent.</li>
                  <li>Results will appear in the Calls section after completion.</li>
                </ul>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)} className="gap-2">
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </Button>
                <Button
                  onClick={handleLaunch}
                  disabled={batchMutation.isPending}
                  size="lg"
                  className="gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  {batchMutation.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Launching...
                    </>
                  ) : (
                    <>
                      <Rocket className="h-5 w-5" />
                      Start Batch ({selectedCandidates.size} calls)
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
