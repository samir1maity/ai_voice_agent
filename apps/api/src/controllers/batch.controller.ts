import { Request, Response, NextFunction } from 'express'
import { prisma } from '@ai-voice-agent/db'
import { bolnaService } from '../services/bolna.service'
import { AppError } from '../middleware/error.middleware'

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

export const batchController = {
  async initiateCalls(req: Request, res: Response, next: NextFunction) {
    try {
      const { candidateIds, agentId } = req.body

      const agent = await prisma.agent.findUnique({ where: { id: agentId } })
      if (!agent) throw new AppError(404, 'Agent not found')
      if (!agent.bolnaAgentId) throw new AppError(400, 'Agent is not synced with Bolna. Please sync first.')

      const candidates = await prisma.candidate.findMany({
        where: { id: { in: candidateIds } },
      })

      if (candidates.length === 0) throw new AppError(404, 'No candidates found')

      const results = { total: candidates.length, initiated: 0, failed: 0, callIds: [] as string[] }

      // Process candidates with a delay to avoid rate limiting
      for (const candidate of candidates) {
        try {
          const recipientPhone = formatRecipientPhone(candidate.phone, candidate.countryCode)
          const call = await prisma.call.create({
            data: {
              agentId,
              candidateId: candidate.id,
              status: 'INITIATED',
              candidatePhoneNumber: recipientPhone,
              callType: 'outbound',
              initiatedAt: new Date(),
            },
          })

          await prisma.candidate.updateMany({
            where: { id: candidate.id, status: { notIn: ['APPROVED', 'REJECTED', 'IN_PROCESS'] } },
            data: { status: 'PENDING' },
          })
          try {
            const bolnaRes = await bolnaService.initiateCall({
              agent_id: agent.bolnaAgentId!,
              recipient_phone_number: recipientPhone,
              recipient_data: { name: candidate.name, timezone: candidate.timezone },
            })

            const executionId = bolnaRes.execution_id || bolnaRes.call_id

            await prisma.call.update({
              where: { id: call.id },
              data: { bolnaExecutionId: executionId, status: 'IN_PROGRESS' },
            })

            results.initiated++
            results.callIds.push(call.id)
          } catch {
            await prisma.call.update({ where: { id: call.id }, data: { status: 'FAILED' } })
            await prisma.candidate.updateMany({
              where: { id: candidate.id, status: { notIn: ['APPROVED', 'REJECTED', 'IN_PROCESS'] } },
              data: { status: 'PENDING' },
            })
            results.failed++
          }

          // Rate limit: 1 second between calls
          await new Promise((resolve) => setTimeout(resolve, 1000))
        } catch (err) {
          console.error(`[Batch] Failed for candidate ${candidate.id}:`, err)
          results.failed++
        }
      }

      res.status(201).json({ success: true, data: results })
    } catch (err) {
      next(err)
    }
  },
}
