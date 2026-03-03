'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { Plus, RefreshCw, Pencil, Trash2, Bot } from 'lucide-react'
import { DashboardLayout } from '@/app/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { agentsApi } from '@/lib/api-client'
import { toast } from '@/hooks/use-toast'

interface Agent {
  id: string
  name: string
  description?: string
  bolnaAgentId?: string
  model?: string
  status: string
  callsCount?: number
  createdAt: string
}

function AgentStatusBadge({ status }: { status: string }) {
  const variants: Record<string, 'success' | 'warning' | 'destructive' | 'gray'> = {
    ACTIVE: 'success',
    INACTIVE: 'gray',
    SYNCING: 'warning',
    ERROR: 'destructive',
  }
  const labels: Record<string, string> = {
    ACTIVE: 'Active',
    INACTIVE: 'Inactive',
    SYNCING: 'Syncing',
    ERROR: 'Error',
  }
  return (
    <Badge variant={variants[status] ?? 'gray'}>
      {labels[status] ?? status}
    </Badge>
  )
}

function AgentCard({ agent }: { agent: Agent }) {
  const queryClient = useQueryClient()

  const syncMutation = useMutation({
    mutationFn: () => agentsApi.sync(agent.id),
    onSuccess: () => {
      toast({ title: 'Agent synced', description: `${agent.name} synced with Bolna.` })
      queryClient.invalidateQueries({ queryKey: ['agents'] })
    },
    onError: (err: Error) => {
      toast({ title: 'Sync failed', description: err.message, variant: 'destructive' })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => agentsApi.delete(agent.id),
    onSuccess: () => {
      toast({ title: 'Agent deleted', description: `${agent.name} has been removed.` })
      queryClient.invalidateQueries({ queryKey: ['agents'] })
    },
    onError: (err: Error) => {
      toast({ title: 'Delete failed', description: err.message, variant: 'destructive' })
    },
  })

  const handleDelete = () => {
    if (!confirm(`Delete agent "${agent.name}"? This cannot be undone.`)) return
    deleteMutation.mutate()
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100">
              <Bot className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{agent.name}</h3>
              <AgentStatusBadge status={agent.status} />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 pb-4">
        {agent.description && (
          <p className="text-sm text-gray-500 line-clamp-2">{agent.description}</p>
        )}
        <div className="space-y-1 text-xs text-gray-400">
          {agent.bolnaAgentId && (
            <p>
              <span className="font-medium">Bolna ID:</span>{' '}
              {agent.bolnaAgentId.slice(0, 20)}...
            </p>
          )}
          {agent.model && (
            <p>
              <span className="font-medium">Model:</span> {agent.model}
            </p>
          )}
          <p>
            <span className="font-medium">Calls:</span> {agent.callsCount ?? 0}
          </p>
        </div>

        <div className="flex gap-2 pt-1">
          <Link href={`/agents/${agent.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full gap-1.5">
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            Sync
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function AgentsPage() {
  const { data: agents, isLoading, error } = useQuery<Agent[]>({
    queryKey: ['agents'],
    queryFn: () => agentsApi.list(),
  })

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Agents</h1>
            <p className="text-sm text-gray-500">Manage your Bolna voice AI screening agents</p>
          </div>
          <Link href="/agents/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Create Agent
            </Button>
          </Link>
        </div>

        {isLoading && <LoadingSpinner />}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            Failed to load agents. Please refresh.
          </div>
        )}

        {!isLoading && agents && agents.length === 0 && (
          <EmptyState
            icon={Bot}
            title="No agents yet"
            description="Create your first AI screening agent to start conducting automated phone interviews."
            action={
              <Link href="/agents/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Agent
                </Button>
              </Link>
            }
          />
        )}

        {agents && agents.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
