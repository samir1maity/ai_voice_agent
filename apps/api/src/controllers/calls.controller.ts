import { Request, Response, NextFunction } from 'express'
import { prisma } from '@ai-voice-agent/db'
import { bolnaService } from '../services/bolna.service'
import { screeningService } from '../services/screening.service'
import { AppError } from '../middleware/error.middleware'
import type { ScreeningReport } from '@ai-voice-agent/types'

async function runPostCallProcessing(callId: string, candidateId: string, transcript: string, summary: string | null) {
  const analysis = await screeningService.analyze(transcript, summary || '')

  await prisma.callAnalytic.upsert({
    where: { callId },
    update: {
      overallScore: analysis.overallScore,
      isQualified: analysis.isQualified,
      reason: analysis.reason,
      detectedTechStack: analysis.detectedTechStack,
      extractedYearsExp: analysis.extractedYearsExp,
      extractedCurrentRole: analysis.extractedCurrentRole,
    },
    create: {
      callId,
      candidateId,
      overallScore: analysis.overallScore,
      isQualified: analysis.isQualified,
      reason: analysis.reason,
      detectedTechStack: analysis.detectedTechStack,
      extractedYearsExp: analysis.extractedYearsExp,
      extractedCurrentRole: analysis.extractedCurrentRole,
    },
  })

  await prisma.candidate.update({
    where: { id: candidateId },
    data: {
      status: analysis.isQualified ? 'QUALIFIED' : 'DISQUALIFIED',
      latestScore: analysis.overallScore,
      latestSummary: summary || undefined,
    },
  })

  console.log(`[Calls] Scoring done for call ${callId}: score=${analysis.overallScore}, qualified=${analysis.isQualified}`)
}

export const callsController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1
      const limit = parseInt(req.query.limit as string) || 20
      const skip = (page - 1) * limit
      const { status, candidateId, agentId } = req.query

      const where: Record<string, unknown> = {}
      if (status) where.status = status
      if (candidateId) where.candidateId = candidateId
      if (agentId) where.agentId = agentId

      const [calls, total] = await Promise.all([
        prisma.call.findMany({
          where,
          include: {
            candidate: { select: { id: true, name: true, phone: true } },
            agent: { select: { id: true, name: true } },
            analytics: true,
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.call.count({ where }),
      ])

      res.json({ success: true, data: calls, total, page, limit, totalPages: Math.ceil(total / limit) })
    } catch (err) {
      next(err)
    }
  },

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const call = await prisma.call.findUnique({
        where: { id: req.params.id },
        include: {
          candidate: true,
          agent: { select: { id: true, name: true, voice: true } },
          analytics: true,
        },
      })
      if (!call) throw new AppError(404, 'Call not found')
      res.json({ success: true, data: call })
    } catch (err) {
      next(err)
    }
  },

  async initiate(req: Request, res: Response, next: NextFunction) {
    try {
      const { candidateId, agentId } = req.body

      const [candidate, agent] = await Promise.all([
        prisma.candidate.findUnique({ where: { id: candidateId } }),
        prisma.agent.findUnique({ where: { id: agentId } }),
      ])

      if (!candidate) throw new AppError(404, 'Candidate not found')
      if (!agent) throw new AppError(404, 'Agent not found')
      if (!agent.bolnaAgentId) throw new AppError(400, 'Agent is not synced with Bolna. Please sync the agent first.')

      const call = await prisma.call.create({
        data: {
          agentId,
          candidateId,
          status: 'INITIATED',
          candidatePhoneNumber: candidate.phone,
          callType: 'outbound',
          initiatedAt: new Date(),
        },
      })

      await prisma.candidate.update({
        where: { id: candidateId },
        data: { status: 'SCHEDULED' },
      })

      try {
        const bolnaRes = await bolnaService.initiateCall({
          agent_id: agent.bolnaAgentId,
          recipient_phone_number: candidate.phone,
          recipient_data: { name: candidate.name, timezone: candidate.timezone },
        })

        await prisma.call.update({
          where: { id: call.id },
          data: { bolnaExecutionId: bolnaRes.execution_id || bolnaRes.call_id, status: 'IN_PROGRESS' },
        })
      } catch (bolnaErr) {
        await prisma.call.update({ where: { id: call.id }, data: { status: 'FAILED' } })
        await prisma.candidate.update({ where: { id: candidateId }, data: { status: 'PENDING' } })
        throw bolnaErr
      }

      const updatedCall = await prisma.call.findUnique({
        where: { id: call.id },
        include: { candidate: true, agent: { select: { id: true, name: true } } },
      })

      res.status(201).json({ success: true, data: updatedCall })
    } catch (err) {
      next(err)
    }
  },

  async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const call = await prisma.call.findUnique({
        where: { id: req.params.id },
        select: { id: true, status: true, bolnaExecutionId: true, duration: true, completedAt: true },
      })
      if (!call) throw new AppError(404, 'Call not found')

      if (call.bolnaExecutionId) {
        try {
          const bolnaData = await bolnaService.getExecution(call.bolnaExecutionId)
          const bolnaStatus = (bolnaData.status as string)?.toLowerCase()

          const isCompleted = bolnaStatus === 'completed' || bolnaStatus === 'call-disconnected'
          const isFailed = bolnaStatus === 'failed' || bolnaStatus === 'call-failed' || !!(bolnaData.error_message)
          const isNoAnswer =
            bolnaStatus === 'no-answer' ||
            bolnaStatus === 'busy' ||
            bolnaStatus === 'canceled' ||
            bolnaStatus === 'balance-low'

          const mappedStatus = isCompleted
            ? 'COMPLETED'
            : isFailed
              ? 'FAILED'
              : isNoAnswer
                ? 'NO_ANSWER'
                : call.status === 'INITIATED'
                  ? 'IN_PROGRESS'
                  : call.status

          const transcript = (bolnaData.transcript as string) || undefined
          const summary = (bolnaData.summary as string) || null

          const updated = await prisma.call.update({
            where: { id: call.id },
            data: {
              status: mappedStatus,
              transcript: transcript || undefined,
              summary: summary || undefined,
              duration: (bolnaData.conversation_duration as number) || undefined,
              cost: (bolnaData.total_cost as number) || undefined,
              completedAt: isCompleted ? new Date() : undefined,
            },
            select: { id: true, status: true, bolnaExecutionId: true, duration: true, completedAt: true, candidateId: true },
          })

          if (isCompleted && transcript) {
            await runPostCallProcessing(call.id, updated.candidateId, transcript, summary)
          } else if (isFailed || isNoAnswer) {
            await prisma.candidate.update({
              where: { id: updated.candidateId },
              data: { status: 'NO_ANSWER' },
            })
          }

          return res.json({ success: true, data: updated })
        } catch {
          // ignore polling errors; return local status
        }
      }

      res.json({ success: true, data: call })
    } catch (err) {
      next(err)
    }
  },

  async getTranscript(req: Request, res: Response, next: NextFunction) {
    try {
      const call = await prisma.call.findUnique({
        where: { id: req.params.id },
        select: { transcript: true, summary: true, status: true },
      })
      if (!call) throw new AppError(404, 'Call not found')

      const turns = call.transcript ? screeningService.parseTranscript(call.transcript) : []
      res.json({ success: true, data: { turns, summary: call.summary, raw: call.transcript } })
    } catch (err) {
      next(err)
    }
  },

  async analyze(req: Request, res: Response, next: NextFunction) {
    try {
      const call = await prisma.call.findUnique({
        where: { id: req.params.id },
        include: { analytics: true },
      })
      if (!call) throw new AppError(404, 'Call not found')
      if (!call.transcript) throw new AppError(400, 'Call has no transcript to analyze')

      await runPostCallProcessing(call.id, call.candidateId, call.transcript, call.summary)

      const analytics = await prisma.callAnalytic.findUnique({ where: { callId: call.id } })
      res.json({ success: true, data: analytics })
    } catch (err) {
      next(err)
    }
  },

  async getReport(req: Request, res: Response, next: NextFunction) {
    try {
      const call = await prisma.call.findUnique({
        where: { id: req.params.id },
        include: { candidate: true, agent: true, analytics: true },
      })
      if (!call) throw new AppError(404, 'Call not found')

      const turns = call.transcript ? screeningService.parseTranscript(call.transcript) : []

      const report: ScreeningReport = {
        reportGeneratedAt: new Date().toISOString(),
        candidate: {
          name: call.candidate.name,
          email: call.candidate.email,
          phone: call.candidate.phone,
          currentRole: call.candidate.currentRole,
          yearsOfExperience: call.candidate.yearsOfExperience,
        },
        call: {
          duration: call.duration,
          cost: call.cost,
          initiatedAt: call.initiatedAt.toISOString(),
          completedAt: call.completedAt?.toISOString(),
          provider: call.provider,
        },
        screening: {
          overallScore: call.analytics?.overallScore,
          qualified: call.analytics?.isQualified,
          techStack: call.analytics?.detectedTechStack || [],
          reason: call.analytics?.reason,
        },
        transcript: turns,
        summary: call.summary,
      }

      res.json({ success: true, data: report })
    } catch (err) {
      next(err)
    }
  },
}
