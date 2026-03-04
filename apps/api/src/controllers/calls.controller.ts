import { Request, Response, NextFunction } from 'express'
import { prisma } from '@ai-voice-agent/db'
import { bolnaService } from '../services/bolna.service'
import { AppError } from '../middleware/error.middleware'
import { screeningService } from '../services/screening.service'

function formatRecipientPhone(phone: string, countryCode?: string | null): string {
  const raw = (phone || '').trim()
  if (raw.startsWith('+')) {
    return `+${raw.replace(/\D/g, '')}`
  }
  if (raw.startsWith('00')) {
    return `+${raw.replace(/\D/g, '').replace(/^00/, '')}`
  }

  const phoneDigits = raw.replace(/\D/g, '')
  const codeDigits = (countryCode || '91').replace(/\D/g, '') || '91'

  if (!phoneDigits) return `+${codeDigits}`
  if (phoneDigits.startsWith(codeDigits) && phoneDigits.length > 10) return `+${phoneDigits}`
  return `+${codeDigits}${phoneDigits}`
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
      const recipientPhone = formatRecipientPhone(candidate.phone, candidate.countryCode)

      const call = await prisma.call.create({
        data: {
          agentId,
          candidateId,
          status: 'INITIATED',
          candidatePhoneNumber: recipientPhone,
          callType: 'outbound',
          initiatedAt: new Date(),
        },
      })

      await prisma.candidate.updateMany({
        where: { id: candidateId, status: { notIn: ['APPROVED', 'REJECTED', 'IN_PROCESS'] } },
        data: { status: 'PENDING' },
      })

      try {
        const bolnaRes = await bolnaService.initiateCall({
          agent_id: agent.bolnaAgentId,
          recipient_phone_number: recipientPhone,
          recipient_data: { name: candidate.name, timezone: candidate.timezone },
        })

        await prisma.call.update({
          where: { id: call.id },
          data: { bolnaExecutionId: bolnaRes.execution_id || bolnaRes.call_id, status: 'IN_PROGRESS' },
        })
      } catch (bolnaErr) {
        await prisma.call.update({ where: { id: call.id }, data: { status: 'FAILED' } })
        await prisma.candidate.updateMany({
          where: { id: candidateId, status: { notIn: ['APPROVED', 'REJECTED', 'IN_PROCESS'] } },
          data: { status: 'PENDING' },
        })
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
            select: {
              id: true,
              status: true,
              bolnaExecutionId: true,
              duration: true,
              completedAt: true,
              candidateId: true,
              transcript: true,
              summary: true,
            },
          })

          if (isCompleted && updated.transcript) {
            try {
              const { result, rawResponse } = await screeningService.analyzeWithRaw(
                updated.transcript,
                updated.summary || ''
              )

              await prisma.callAnalytic.upsert({
                where: { callId: updated.id },
                update: {
                  detectedTechStack: result.detectedTechStack || [],
                  extractedYearsExp: result.extractedYearsExp ?? null,
                  extractedCurrentRole: result.extractedCurrentRole ?? null,
                  salaryExpectation: result.salaryExpectation ?? null,
                  rawAnalysisPayload: {
                    provider: 'gemini-2.0-flash',
                    rawResponse,
                  },
                },
                create: {
                  callId: updated.id,
                  candidateId: updated.candidateId,
                  detectedTechStack: result.detectedTechStack || [],
                  extractedYearsExp: result.extractedYearsExp ?? null,
                  extractedCurrentRole: result.extractedCurrentRole ?? null,
                  salaryExpectation: result.salaryExpectation ?? null,
                  rawAnalysisPayload: {
                    provider: 'gemini-2.0-flash',
                    rawResponse,
                  },
                },
              })
            } catch (analysisErr) {
              console.error(`[Call Status] Screening analysis failed for call ${updated.id}:`, analysisErr)
            }
          }

          if (isCompleted) {
            await prisma.candidate.updateMany({
              where: { id: updated.candidateId, status: { notIn: ['APPROVED', 'REJECTED', 'IN_PROCESS'] } },
              data: { status: 'CALLED' },
            })
          } else if (isNoAnswer) {
            await prisma.candidate.updateMany({
              where: { id: updated.candidateId, status: { notIn: ['APPROVED', 'REJECTED', 'IN_PROCESS'] } },
              data: { status: 'NO_ANSWER' },
            })
          } else if (isFailed) {
            await prisma.candidate.updateMany({
              where: { id: updated.candidateId, status: { notIn: ['APPROVED', 'REJECTED', 'IN_PROCESS'] } },
              data: { status: 'PENDING' },
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

      res.json({ success: true, data: { transcript: call.transcript, summary: call.summary } })
    } catch (err) {
      next(err)
    }
  },

}
