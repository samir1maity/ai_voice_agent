'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { ArrowLeft, Loader2, RefreshCw } from 'lucide-react'
import { DashboardLayout } from '@/app/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { CallStatusBadge } from '@/components/shared/StatusBadge'
import { agentsApi } from '@/lib/api-client'
import { toast } from '@/hooks/use-toast'

const VOICE_OPTIONS = [
  { value: 'shimmer', label: 'Shimmer (Female, Neutral)' },
  { value: 'alloy', label: 'Alloy (Neutral)' },
  { value: 'echo', label: 'Echo (Male, Calm)' },
  { value: 'fable', label: 'Fable (Male, Expressive)' },
  { value: 'onyx', label: 'Onyx (Male, Deep)' },
  { value: 'nova', label: 'Nova (Female, Warm)' },
]

const MODEL_OPTIONS = [
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Recommended)' },
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
]

interface Agent {
  id: string
  name: string
  description?: string
  prompt?: string
  voice?: string
  model?: string
  bolnaAgentId?: string
  status: string
  createdAt: string
}

interface AgentCall {
  id: string
  candidateName?: string
  status: string
  durationSeconds?: number
  createdAt: string
}

interface PageProps {
  params: { id: string }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatDuration(s?: number) {
  if (!s) return '—'
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

export default function EditAgentPage({ params }: PageProps) {
  const { id } = params
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data: agent, isLoading } = useQuery<Agent>({
    queryKey: ['agent', id],
    queryFn: () => agentsApi.get(id),
  })

  const { data: callsData } = useQuery<{ data: AgentCall[] }>({
    queryKey: ['agent-calls', id],
    queryFn: () => agentsApi.getCalls(id, { limit: 5 }),
    enabled: !!agent,
  })

  const [form, setForm] = useState({
    name: '',
    description: '',
    prompt: '',
    voice: 'shimmer',
    model: 'gpt-4o-mini',
  })

  const [initialized, setInitialized] = useState(false)

  if (agent && !initialized) {
    setForm({
      name: agent.name ?? '',
      description: agent.description ?? '',
      prompt: agent.prompt ?? '',
      voice: agent.voice ?? 'shimmer',
      model: agent.model ?? 'gpt-4o-mini',
    })
    setInitialized(true)
  }

  const updateMutation = useMutation({
    mutationFn: () => agentsApi.update(id, form),
    onSuccess: () => {
      toast({ title: 'Agent updated', description: 'Changes have been saved.' })
      queryClient.invalidateQueries({ queryKey: ['agent', id] })
      queryClient.invalidateQueries({ queryKey: ['agents'] })
    },
    onError: (err: Error) => {
      toast({ title: 'Update failed', description: err.message, variant: 'destructive' })
    },
  })

  const syncMutation = useMutation({
    mutationFn: () => agentsApi.sync(id),
    onSuccess: () => {
      toast({ title: 'Agent synced', description: 'Successfully synced with Bolna.' })
      queryClient.invalidateQueries({ queryKey: ['agent', id] })
      queryClient.invalidateQueries({ queryKey: ['agents'] })
    },
    onError: (err: Error) => {
      toast({ title: 'Sync failed', description: err.message, variant: 'destructive' })
    },
  })

  const set =
    (field: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }))
    }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate()
  }

  if (isLoading) return <DashboardLayout><LoadingSpinner /></DashboardLayout>

  return (
    <DashboardLayout>
      <div className="max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/agents">
              <Button variant="ghost" size="sm" className="gap-1.5">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit Agent</h1>
              <p className="text-sm text-gray-500">Update agent configuration</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="gap-1.5"
          >
            <RefreshCw className={`h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            Sync with Bolna
          </Button>
        </div>

        {/* Read-only info */}
        {agent && (
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Status: </span>
                  <Badge variant={agent.status === 'ACTIVE' ? 'success' : 'gray'}>
                    {agent.status}
                  </Badge>
                </div>
                {agent.bolnaAgentId && (
                  <div>
                    <span className="text-gray-500">Bolna ID: </span>
                    <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">
                      {agent.bolnaAgentId}
                    </code>
                  </div>
                )}
                <div>
                  <span className="text-gray-500">Created: </span>
                  <span className="text-gray-700">{formatDate(agent.createdAt)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Agent Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Agent Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={set('name')}
                  placeholder="e.g. Software Engineer Screener"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={form.description}
                  onChange={set('description')}
                  placeholder="Brief description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Voice</Label>
                  <Select
                    value={form.voice}
                    onValueChange={(v) => setForm((prev) => ({ ...prev, voice: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VOICE_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Model</Label>
                  <Select
                    value={form.model}
                    onValueChange={(v) => setForm((prev) => ({ ...prev, model: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MODEL_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="prompt">System Prompt</Label>
                <Textarea
                  id="prompt"
                  rows={14}
                  value={form.prompt}
                  onChange={set('prompt')}
                  className="font-mono text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Link href="/agents">
                  <Button type="button" variant="outline">Cancel</Button>
                </Link>
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>

        {/* Recent Calls */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Calls</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {!callsData?.data || callsData.data.length === 0 ? (
              <p className="py-6 text-center text-sm text-gray-400">No calls yet</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-left">
                    <th className="px-6 py-3 font-medium text-gray-500">Candidate</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Status</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Duration</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {callsData.data.slice(0, 5).map((call) => (
                    <tr
                      key={call.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => (window.location.href = `/calls/${call.id}`)}
                    >
                      <td className="px-6 py-3 font-medium text-gray-900">
                        {call.candidateName ?? '—'}
                      </td>
                      <td className="px-6 py-3">
                        <CallStatusBadge status={call.status} />
                      </td>
                      <td className="px-6 py-3 text-gray-600">
                        {formatDuration(call.durationSeconds)}
                      </td>
                      <td className="px-6 py-3 text-gray-500">
                        {formatDate(call.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
