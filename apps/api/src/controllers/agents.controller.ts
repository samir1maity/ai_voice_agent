import { Request, Response, NextFunction } from 'express'
import { prisma } from '@ai-voice-agent/db'
import { bolnaService } from '../services/bolna.service'
import { env } from '../config/env'
import { AppError } from '../middleware/error.middleware'

const DEFAULT_VOICE_ID = 'FaqthkZu1EWxXxUFbAfb'
const DEFAULT_MODEL = 'gpt-4o-mini'
const DEFAULT_PROMPT = 'Imported from Bolna'
const DEFAULT_MAX_DURATION = 600

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function readObject(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

function mapBolnaStatus(status: unknown): 'ACTIVE' | 'SYNCING' {
  return status === 'processed' ? 'ACTIVE' : 'SYNCING'
}

function mapBolnaAgentData(agent: Record<string, unknown>, fallbackBolnaAgentId?: string) {
  const agentConfig = readObject(agent.agent_config)
  const agentPrompts = readObject(agent.agent_prompts) ?? readObject(agentConfig?.agent_prompts)
  const task1 = readObject(agentPrompts?.task_1)

  const rootTasks = Array.isArray(agent.tasks) ? agent.tasks : []
  const configTasks = Array.isArray(agentConfig?.tasks) ? agentConfig.tasks : []
  const primaryTask = readObject(rootTasks[0]) ?? readObject(configTasks[0])

  const taskConfig = readObject(primaryTask?.task_config)
  const toolsConfig = readObject(primaryTask?.tools_config)
  const llmAgent = readObject(toolsConfig?.llm_agent)
  const llmConfig = readObject(llmAgent?.llm_config)
  const synthesizer = readObject(toolsConfig?.synthesizer)
  const providerConfig = readObject(synthesizer?.provider_config)

  const toolchain = readObject(primaryTask?.toolchain)
  const pipelines = Array.isArray(toolchain?.pipelines) ? toolchain.pipelines : []
  const firstPipeline = readObject(pipelines[0])

  const rawStatus = readString(agent.agent_status)

  return {
    bolnaAgentId: readString(agent.id) || readString(agent.agent_id) || fallbackBolnaAgentId,
    name: readString(agent.agent_name) || readString(agentConfig?.agent_name),
    description: readString(agent.description) || readString(agent.agent_description),
    prompt: readString(task1?.system_prompt) || readString(taskConfig?.system_prompt),
    voice: readString(providerConfig?.voice_id),
    model: readString(llmConfig?.model) || readString(firstPipeline?.model),
    maxDuration: readNumber(taskConfig?.call_terminate),
    status: rawStatus ? mapBolnaStatus(rawStatus) : undefined,
  }
}

export const agentsController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const agents = await prisma.agent.findMany({
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { calls: true } } },
      })
      res.json({ success: true, data: agents })
    } catch (err) {
      next(err)
    }
  },

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const agent = await prisma.agent.findUnique({
        where: { id: req.params.id },
        include: { _count: { select: { calls: true } } },
      })
      if (!agent) throw new AppError(404, 'Agent not found')
      res.json({ success: true, data: agent })
    } catch (err) {
      next(err)
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, description, prompt, voice, model, maxDuration } = req.body

      const webhookUrl = `${env.WEBHOOK_BASE_URL}/api/v1/webhook/bolna`
      const bolnaPayload = bolnaService.buildAgentPayload(name, prompt, webhookUrl, voice, model)

      let bolnaAgentId: string | undefined
      let status: 'ACTIVE' | 'SYNCING' = 'SYNCING'

      try {
        const bolnaRes = await bolnaService.createAgent(bolnaPayload)
        bolnaAgentId = bolnaRes.agent_id
        status = 'ACTIVE'
      } catch (bolnaErr) {
        console.warn('[Agent Create] Bolna sync failed, saving locally only:', bolnaErr)
      }

      const agent = await prisma.agent.create({
        data: { name, description, prompt, voice, model, maxDuration, bolnaAgentId, status },
      })

      res.status(201).json({ success: true, data: agent })
    } catch (err) {
      next(err)
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const existing = await prisma.agent.findUnique({ where: { id: req.params.id } })
      if (!existing) throw new AppError(404, 'Agent not found')

      const { name, description, prompt, voice, model, maxDuration } = req.body

      if (existing.bolnaAgentId && (prompt || name)) {
        const webhookUrl = `${env.WEBHOOK_BASE_URL}/api/v1/webhook/bolna`
        const bolnaPayload = bolnaService.buildAgentPayload(
          name || existing.name,
          prompt || existing.prompt,
          webhookUrl,
          voice || existing.voice,
          model || existing.model
        )
        try {
          await bolnaService.updateAgent(existing.bolnaAgentId, bolnaPayload)
        } catch (err) {
          console.warn('[Agent Update] Bolna sync failed:', err)
        }
      }

      const agent = await prisma.agent.update({
        where: { id: req.params.id },
        data: { name, description, prompt, voice, model, maxDuration },
      })

      res.json({ success: true, data: agent })
    } catch (err) {
      next(err)
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const agent = await prisma.agent.findUnique({ where: { id: req.params.id } })
      if (!agent) throw new AppError(404, 'Agent not found')

      await prisma.agent.update({
        where: { id: req.params.id },
        data: { status: 'INACTIVE' },
      })

      res.json({ success: true, message: 'Agent deactivated' })
    } catch (err) {
      next(err)
    }
  },

  async sync(req: Request, res: Response, next: NextFunction) {
    try {
      const agent = await prisma.agent.findUnique({ where: { id: req.params.id } })
      if (!agent) throw new AppError(404, 'Agent not found')

      if (!agent.bolnaAgentId) {
        throw new AppError(400, 'Agent has no Bolna ID. Fetch from Bolna first, then sync.')
      }

      const bolnaAgentResponse = await bolnaService.getAgent(agent.bolnaAgentId)
      const rootPayload = readObject(bolnaAgentResponse)
      const sourcePayload =
        readObject(rootPayload?.data) ??
        readObject(rootPayload?.agent) ??
        rootPayload

      if (!sourcePayload) {
        throw new AppError(502, 'Invalid agent payload returned by Bolna')
      }

      const mapped = mapBolnaAgentData(sourcePayload, agent.bolnaAgentId)

      const updated = await prisma.agent.update({
        where: { id: req.params.id },
        data: {
          bolnaAgentId: mapped.bolnaAgentId || agent.bolnaAgentId,
          name: mapped.name || agent.name,
          description: mapped.description ?? agent.description,
          prompt: mapped.prompt || agent.prompt,
          voice: mapped.voice || agent.voice,
          model: mapped.model || agent.model,
          maxDuration: mapped.maxDuration ?? agent.maxDuration,
          status: mapped.status ?? agent.status,
        },
      })

      res.json({ success: true, data: updated })
    } catch (err) {
      next(err)
    }
  },

  async fetchAll(req: Request, res: Response, next: NextFunction) {
    try {
      const bolnaAgents = await bolnaService.getAllAgents()

      const ids = bolnaAgents
        .map((agent) => readString(agent.id))
        .filter((id): id is string => Boolean(id))

      if (ids.length === 0) {
        res.json({ success: true, data: { total: 0, imported: 0, skipped: 0 } })
        return
      }

      const existing = await prisma.agent.findMany({
        where: { bolnaAgentId: { in: ids } },
        select: { bolnaAgentId: true },
      })
      const existingIds = new Set(existing.map((agent) => agent.bolnaAgentId).filter(Boolean))

      const toInsert = bolnaAgents
        .map((agent) => {
          const mapped = mapBolnaAgentData(agent)
          const bolnaAgentId = mapped.bolnaAgentId
          if (!bolnaAgentId || existingIds.has(bolnaAgentId)) return null

          return {
            bolnaAgentId,
            name: mapped.name || `Imported Agent ${bolnaAgentId.slice(0, 8)}`,
            description: mapped.description || 'Imported from Bolna API',
            prompt: mapped.prompt || DEFAULT_PROMPT,
            voice: mapped.voice || DEFAULT_VOICE_ID,
            model: mapped.model || DEFAULT_MODEL,
            maxDuration: mapped.maxDuration || DEFAULT_MAX_DURATION,
            status: mapped.status || 'SYNCING',
          }
        })
        .filter((agent): agent is NonNullable<typeof agent> => agent !== null)

      if (toInsert.length > 0) {
        await prisma.agent.createMany({
          data: toInsert,
          skipDuplicates: true,
        })
      }

      res.json({
        success: true,
        data: {
          total: ids.length,
          imported: toInsert.length,
          skipped: ids.length - toInsert.length,
        },
      })
    } catch (err) {
      next(err)
    }
  },

  async getCalls(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1
      const limit = parseInt(req.query.limit as string) || 20
      const skip = (page - 1) * limit

      const [calls, total] = await Promise.all([
        prisma.call.findMany({
          where: { agentId: req.params.id },
          include: { candidate: true, analytics: true },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.call.count({ where: { agentId: req.params.id } }),
      ])

      res.json({ success: true, data: calls, total, page, limit, totalPages: Math.ceil(total / limit) })
    } catch (err) {
      next(err)
    }
  },
}
