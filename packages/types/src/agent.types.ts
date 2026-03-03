export type AgentStatus = 'ACTIVE' | 'INACTIVE' | 'SYNCING'

export interface Agent {
  id: string
  name: string
  description?: string | null
  bolnaAgentId?: string | null
  status: AgentStatus
  prompt: string
  voice: string
  model: string
  maxDuration: number
  createdAt: string
  updatedAt: string
  _count?: { calls: number }
}

export interface CreateAgentDto {
  name: string
  description?: string
  prompt: string
  voice?: string
  model?: string
  maxDuration?: number
}

export interface UpdateAgentDto extends Partial<CreateAgentDto> {}

// Bolna API payload shapes
export interface BolnaAgentTask {
  task_type: string
  toolchain: {
    execution: string
    pipelines: Array<{
      model: string
      provider: string
      model_config?: Record<string, unknown>
    }>
  }
  task_config: {
    agent_welcome_message?: string
    system_prompt?: string
    [key: string]: unknown
  }
}

export interface BolnaAgentCreatePayload {
  agent_config: {
    agent_name: string
    agent_welcome_message: string
    webhook_url: string
    tasks: BolnaAgentTask[]
    agent_prompts: {
      task_1: {
        system_prompt: string
      }
    }
  }
}

export interface BolnaAgentResponse {
  agent_id: string
}
