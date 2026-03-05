'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RefreshCw, Trash2, Bot, KeyRound, ShieldCheck, ShieldAlert } from 'lucide-react'
import { DashboardLayout } from '@/app/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { EmptyState } from '@/components/shared/EmptyState'
import { LoadingSpinner } from '@/components/shared/LoadingSpinner'
import { agentsApi, getErrorMessage } from '@/lib/api-client'
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

interface WorkspaceInfo {
  clientId: string
  hasApiKey: boolean
  maskedApiKey?: string | null
  updatedAt?: string
}

type AgentsTab = 'agents' | 'api-key'

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
          <p className="line-clamp-2 text-sm text-gray-500">{agent.description}</p>
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
          <TooltipProvider delayDuration={120}>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
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
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">
                Fetch latest agent config from Bolna and update this agent in your DB.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
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
  const [activeTab, setActiveTab] = useState<AgentsTab>('agents')
  const [apiKeyInput, setApiKeyInput] = useState('')
  const queryClient = useQueryClient()

  const { data: workspace, isLoading: workspaceLoading } = useQuery<WorkspaceInfo>({
    queryKey: ['workspace'],
    queryFn: () => agentsApi.getWorkspace(),
  })

  const { data: agents, isLoading, error } = useQuery<Agent[]>({
    queryKey: ['agents'],
    queryFn: () => agentsApi.list(),
  })

  const saveApiKeyMutation = useMutation({
    mutationFn: () => agentsApi.setWorkspaceApiKey(apiKeyInput.trim()),
    onSuccess: () => {
      toast({ title: 'API key saved', description: 'Bolna API key updated for this client.' })
      setApiKeyInput('')
      queryClient.invalidateQueries({ queryKey: ['workspace'] })
    },
    onError: (err: Error) => {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' })
    },
  })

  const removeApiKeyMutation = useMutation({
    mutationFn: () => agentsApi.deleteWorkspaceApiKey(),
    onSuccess: () => {
      toast({ title: 'API key removed', description: 'This client no longer has a Bolna key configured.' })
      queryClient.invalidateQueries({ queryKey: ['workspace'] })
    },
    onError: (err: Error) => {
      toast({ title: 'Remove failed', description: err.message, variant: 'destructive' })
    },
  })

  const fetchAllMutation = useMutation({
    mutationFn: () => agentsApi.fetchAll() as Promise<{ total: number; imported: number; skipped: number }>,
    onSuccess: (result) => {
      toast({
        title: 'Agents fetched',
        description: `Imported ${result.imported}, skipped ${result.skipped}.`,
      })
      queryClient.invalidateQueries({ queryKey: ['agents'] })
    },
    onError: (err: Error) => {
      toast({ title: 'Fetch failed', description: err.message, variant: 'destructive' })
    },
  })

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Agents</h1>
            <p className="text-sm text-gray-500">Manage your Bolna voice AI screening agents</p>
          </div>
        </div>

        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setActiveTab('agents')}
            className={`rounded-md px-4 py-2 text-sm font-medium transition ${
              activeTab === 'agents' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Agents
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('api-key')}
            className={`rounded-md px-4 py-2 text-sm font-medium transition ${
              activeTab === 'api-key' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            API Key
          </button>
        </div>

        {activeTab === 'api-key' && (
          <Card className="max-w-2xl">
            <CardHeader>
              <div className="flex items-center gap-2 text-gray-900">
                <KeyRound className="h-4 w-4" />
                <h2 className="text-base font-semibold">Bolna API Key</h2>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {workspaceLoading ? (
                <LoadingSpinner />
              ) : (
                <>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
                    <p className="font-medium text-gray-800">Current status</p>
                    <div className="mt-2 flex items-center gap-2">
                      {workspace?.hasApiKey ? (
                        <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <ShieldAlert className="h-4 w-4 text-amber-600" />
                      )}
                      <span>
                        {workspace?.hasApiKey
                          ? `Configured (${workspace.maskedApiKey})`
                          : 'No API key configured for this client'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="bolna-key" className="text-sm font-medium text-gray-800">
                      Enter Bolna API Key
                    </label>
                    <Input
                      id="bolna-key"
                      type="password"
                      placeholder="Paste your Bolna API key"
                      value={apiKeyInput}
                      onChange={(e) => setApiKeyInput(e.target.value)}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => saveApiKeyMutation.mutate()}
                      disabled={saveApiKeyMutation.isPending || apiKeyInput.trim().length === 0}
                    >
                      {saveApiKeyMutation.isPending ? 'Saving...' : 'Save API Key'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => removeApiKeyMutation.mutate()}
                      disabled={removeApiKeyMutation.isPending || !workspace?.hasApiKey}
                    >
                      {removeApiKeyMutation.isPending ? 'Removing...' : 'Remove Key'}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'agents' && (
          <>
            {!workspaceLoading && !workspace?.hasApiKey && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                Add your Bolna API key in the API Key tab to fetch and sync agents.
              </div>
            )}

            <div className="flex justify-end">
              <TooltipProvider delayDuration={120}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex">
                      <Button className="gap-2" onClick={() => fetchAllMutation.mutate()} disabled={fetchAllMutation.isPending || !workspace?.hasApiKey}>
                        <RefreshCw className={`h-4 w-4 ${fetchAllMutation.isPending ? 'animate-spin' : ''}`} />
                        Fetch All Agents
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" align="end">
                    Import agents from Bolna that are not already in your DB.
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            {isLoading && <LoadingSpinner />}

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
                {getErrorMessage(error, 'Failed to load agents. Please refresh.')}
              </div>
            )}

            {!isLoading && agents && agents.length === 0 && (
              <EmptyState
                icon={Bot}
                title="No agents yet"
                description="Fetch your agents from Bolna to start conducting automated phone interviews."
                action={
                  <Button onClick={() => fetchAllMutation.mutate()} disabled={fetchAllMutation.isPending || !workspace?.hasApiKey}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${fetchAllMutation.isPending ? 'animate-spin' : ''}`} />
                    Fetch All Agents
                  </Button>
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
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
