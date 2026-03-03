import { Request, Response, NextFunction } from 'express'
import { prisma } from '@ai-voice-agent/db'
import { bolnaService } from '../services/bolna.service'
import { env } from '../config/env'
import { AppError } from '../middleware/error.middleware'

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

      const webhookUrl = `${env.WEBHOOK_BASE_URL}/api/v1/webhook/bolna`
      const bolnaPayload = bolnaService.buildAgentPayload(
        agent.name, agent.prompt, webhookUrl, agent.voice, agent.model
      )

      let bolnaAgentId = agent.bolnaAgentId

      if (bolnaAgentId) {
        await bolnaService.updateAgent(bolnaAgentId, bolnaPayload)
      } else {
        const res2 = await bolnaService.createAgent(bolnaPayload)
        bolnaAgentId = res2.agent_id
      }

      const updated = await prisma.agent.update({
        where: { id: req.params.id },
        data: { bolnaAgentId, status: 'ACTIVE' },
      })

      res.json({ success: true, data: updated })
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
