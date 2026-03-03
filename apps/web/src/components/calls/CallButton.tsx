'use client'

import { useState } from 'react'
import { Phone, Loader2, User, Hash } from 'lucide-react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { agentsApi, callsApi } from '@/lib/api-client'
import { toast } from '@/hooks/use-toast'

interface CallButtonProps {
  candidateId: string
  candidateName: string
  candidatePhone: string
  onSuccess?: () => void
}

interface Agent {
  id: string
  name: string
  bolnaAgentId?: string
  status?: string
}

export function CallButton({
  candidateId,
  candidateName,
  candidatePhone,
  onSuccess,
}: CallButtonProps) {
  const [open, setOpen] = useState(false)
  const [selectedAgentId, setSelectedAgentId] = useState<string>('')

  const { data: agents, isLoading: agentsLoading } = useQuery<Agent[]>({
    queryKey: ['agents'],
    queryFn: () => agentsApi.list(),
    enabled: open,
  })

  const initiateMutation = useMutation({
    mutationFn: () =>
      callsApi.initiate({ candidateId, agentId: selectedAgentId }),
    onSuccess: () => {
      toast({
        title: 'Call initiated',
        description: `AI screening call started for ${candidateName}.`,
      })
      setOpen(false)
      setSelectedAgentId('')
      onSuccess?.()
    },
    onError: (err: Error) => {
      toast({
        title: 'Failed to initiate call',
        description: err.message,
        variant: 'destructive',
      })
    },
  })

  const handleConfirm = () => {
    if (!selectedAgentId) {
      toast({
        title: 'Select an agent',
        description: 'Please choose an AI agent to conduct the screening.',
        variant: 'destructive',
      })
      return
    }
    initiateMutation.mutate()
  }

  return (
    <>
      <Button
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-1.5"
      >
        <Phone className="h-3.5 w-3.5" />
        Call
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Initiate AI Screening Call</DialogTitle>
            <DialogDescription>
              Start an AI-powered phone screening for this candidate.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-gray-50 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-gray-400" />
                <span className="font-medium text-gray-900">{candidateName}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">{candidatePhone}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="agent-select">AI Screening Agent</Label>
              {agentsLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading agents...
                </div>
              ) : (
                <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                  <SelectTrigger id="agent-select">
                    <SelectValue placeholder="Select an agent..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(agents ?? []).map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                        {agent.status && (
                          <span className="ml-2 text-xs text-gray-400">
                            ({agent.status})
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {agents && agents.length === 0 && (
              <p className="text-sm text-amber-600">
                No agents found. Please create an agent first.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={initiateMutation.isPending}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={initiateMutation.isPending || !selectedAgentId || agentsLoading}
            >
              {initiateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Initiating...
                </>
              ) : (
                <>
                  <Phone className="mr-2 h-4 w-4" />
                  Start Call
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
