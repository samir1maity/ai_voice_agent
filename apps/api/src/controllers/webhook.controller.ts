import { Request, Response, NextFunction } from 'express'
import { prisma } from '@ai-voice-agent/db'
import { screeningService } from '../services/screening.service'
import type { BolnaWebhookPayload } from '@ai-voice-agent/types'

export const webhookController = {
  async handleBolna(req: Request, res: Response, next: NextFunction) {
    // Respond immediately - Bolna expects fast acknowledgment
    res.status(200).json({ received: true })

    try {
      const payload = req.body as BolnaWebhookPayload

      if (!payload.id) {
        console.warn('[Webhook] Invalid payload - missing id')
        return
      }

      console.log(`[Webhook] Received execution: ${payload.id}, status: ${payload.status}`)

      const isDisconnected = payload.status === 'call-disconnected'
      const isFailed = payload.status === 'call-failed' || !!payload.error_message
      const callStatus = isDisconnected ? 'COMPLETED' : isFailed ? 'FAILED' : 'IN_PROGRESS'

      // Find existing call
      let call = await prisma.call.findFirst({ where: { bolnaExecutionId: payload.id } })

      if (call) {
        call = await prisma.call.update({
          where: { id: call.id },
          data: {
            status: callStatus,
            transcript: payload.transcript || undefined,
            summary: payload.summary || undefined,
            duration: payload.conversation_duration || undefined,
            cost: payload.total_cost || undefined,
            completedAt: isDisconnected ? new Date() : undefined,
          },
        })
      } else {
        // Race condition: webhook arrived before bolnaExecutionId was saved
        const candidateName = payload.context_details?.recipient_data?.name
        const agent = payload.agent_id
          ? await prisma.agent.findFirst({ where: { bolnaAgentId: payload.agent_id } })
          : null

        if (agent && candidateName) {
          const candidate = await prisma.candidate.findFirst({
            where: { name: { equals: candidateName, mode: 'insensitive' } },
          })

          if (candidate) {
            call = await prisma.call.create({
              data: {
                bolnaExecutionId: payload.id,
                agentId: agent.id,
                candidateId: candidate.id,
                status: callStatus,
                transcript: payload.transcript || undefined,
                summary: payload.summary || undefined,
                duration: payload.conversation_duration || undefined,
                cost: payload.total_cost || undefined,
                completedAt: isDisconnected ? new Date() : undefined,
              },
            })
          }
        }
      }

      if (!call) {
        console.warn(`[Webhook] Could not match execution ${payload.id} to any call`)
        return
      }

      if (isDisconnected && payload.transcript) {
        const analysis = await screeningService.analyze(payload.transcript, payload.summary || '')

        await prisma.callAnalytic.upsert({
          where: { callId: call.id },
          update: {
            overallScore: analysis.overallScore,
            isQualified: analysis.isQualified,
            reason: analysis.reason,
            detectedTechStack: analysis.detectedTechStack,
            extractedYearsExp: analysis.extractedYearsExp,
            extractedCurrentRole: analysis.extractedCurrentRole,
          },
          create: {
            callId: call.id,
            candidateId: call.candidateId,
            overallScore: analysis.overallScore,
            isQualified: analysis.isQualified,
            reason: analysis.reason,
            detectedTechStack: analysis.detectedTechStack,
            extractedYearsExp: analysis.extractedYearsExp,
            extractedCurrentRole: analysis.extractedCurrentRole,
          },
        })

        await prisma.candidate.update({
          where: { id: call.candidateId },
          data: {
            status: analysis.isQualified ? 'QUALIFIED' : 'DISQUALIFIED',
            latestScore: analysis.overallScore,
            latestSummary: payload.summary || undefined,
          },
        })

        console.log(`[Webhook] Scoring done for call ${call.id}: score=${analysis.overallScore}, qualified=${analysis.isQualified}`)
      } else if (isFailed) {
        await prisma.candidate.update({
          where: { id: call.candidateId },
          data: { status: 'NO_ANSWER' },
        })
      }
    } catch (err) {
      console.error('[Webhook] Error:', err)
    }
  },
}
