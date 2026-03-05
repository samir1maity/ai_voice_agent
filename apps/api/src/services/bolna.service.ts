import axios, { AxiosInstance } from 'axios'
import { env } from '../config/env'
import { AppError } from '../middleware/error.middleware'
import type {
  BolnaAgentCreatePayload,
  BolnaAgentResponse,
  BolnaCallInitiatePayload,
  BolnaCallInitiateResponse,
} from '@ai-voice-agent/types'

class BolnaService {
  private client: AxiosInstance

  constructor(apiKey: string) {
    this.client = axios.create({
      baseURL: env.BOLNA_BASE_URL,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    })

    this.client.interceptors.response.use(
      (res) => res,
      (err) => {
        const message = err.response?.data?.message || err.message
        const status = err.response?.status || 500
        console.error(`[Bolna API Error] ${status}: ${message}`)
        throw new Error(`Bolna API error: ${message}`)
      }
    )
  }

  async createAgent(payload: BolnaAgentCreatePayload): Promise<BolnaAgentResponse> {
    const response = await this.client.post<BolnaAgentResponse>('/v2/agent', payload)
    return response.data
  }

  async getAgent(bolnaAgentId: string): Promise<Record<string, unknown>> {
    const response = await this.client.get(`/v2/agent/${bolnaAgentId}`)
    return response.data
  }

  async updateAgent(bolnaAgentId: string, payload: Partial<BolnaAgentCreatePayload>): Promise<void> {
    await this.client.put(`/v2/agent/${bolnaAgentId}`, payload)
  }

  async getAllAgents(): Promise<Record<string, unknown>[]> {
    const response = await this.client.get('/v2/agent/all')
    return response.data
  }

  async deleteAgent(bolnaAgentId: string): Promise<void> {
    await this.client.delete(`/v2/agent/${bolnaAgentId}`)
  }

  async initiateCall(payload: BolnaCallInitiatePayload): Promise<BolnaCallInitiateResponse> {
    const response = await this.client.post<BolnaCallInitiateResponse>('/call', payload)
    return response.data
  }

  async getExecutions(bolnaAgentId: string): Promise<Record<string, unknown>[]> {
    const response = await this.client.get(`/v2/executions?agent_id=${bolnaAgentId}`)
    return Array.isArray(response.data) ? response.data : response.data?.data || []
  }

  async getExecution(executionId: string): Promise<Record<string, unknown>> {
    const response = await this.client.get(`/executions/${executionId}`)
    return response.data
  }
}

export function createBolnaService(apiKey?: string) {
  const finalApiKey = apiKey || env.BOLNA_API_KEY
  if (!finalApiKey) {
    throw new AppError(400, 'No Bolna API key configured for this workspace. Add it in Agents > API Key tab.')
  }
  return new BolnaService(finalApiKey)
}

export function buildAgentPayload(
  name: string,
  prompt: string,
  webhookUrl: string,
  voice: string,
  model: string
): BolnaAgentCreatePayload {
  return {
    agent_config: {
      agent_name: name,
      agent_welcome_message: 'Hello from Bolna',
      webhook_url: webhookUrl,
      tasks: [
        {
          task_type: 'conversation',
          toolchain: {
            execution: 'parallel',
            pipelines: [
              {
                model,
                provider: 'openai',
              },
            ],
          },
          task_config: {
            agent_welcome_message: 'Hello from Bolna',
            system_prompt: prompt,
          },
        },
      ],
      agent_prompts: {
        task_1: {
          system_prompt: prompt,
        },
      },
    },
  }
}
