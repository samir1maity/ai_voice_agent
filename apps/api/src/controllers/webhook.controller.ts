import { Request, Response, NextFunction } from 'express'
import { prisma } from '@ai-voice-agent/db'
import type { BolnaWebhookPayload } from '@ai-voice-agent/types'
import { screeningService } from '../services/screening.service'

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

      const bolnaStatus = payload.status?.toLowerCase()

      const isCompleted = bolnaStatus === 'completed' || bolnaStatus === 'call-disconnected'
      const isFailed =
        bolnaStatus === 'failed' ||
        bolnaStatus === 'call-failed' ||
        !!payload.error_message
      const isNoAnswer =
        bolnaStatus === 'no-answer' ||
        bolnaStatus === 'busy' ||
        bolnaStatus === 'canceled' ||
        bolnaStatus === 'balance-low'

      const callStatus = isCompleted
        ? 'COMPLETED'
        : isFailed
          ? 'FAILED'
          : isNoAnswer
            ? 'NO_ANSWER'
            : 'IN_PROGRESS'

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
            completedAt: isCompleted ? new Date() : undefined,
            recordingUrl: payload.telephony_data?.recording_url || undefined,
            agentPhoneNumber: payload.telephony_data?.from_number || undefined,
            candidatePhoneNumber: payload.telephony_data?.to_number || undefined,
            rawWebhookPayload: payload as object,
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
                completedAt: isCompleted ? new Date() : undefined,
                recordingUrl: payload.telephony_data?.recording_url || undefined,
                agentPhoneNumber: payload.telephony_data?.from_number || undefined,
                candidatePhoneNumber: payload.telephony_data?.to_number || undefined,
                rawWebhookPayload: payload as object,
              },
            })
          }
        }
      }

      if (!call) {
        console.warn(`[Webhook] Could not match execution ${payload.id} to any call`)
        return
      }

      if (isCompleted && call.transcript) {
        try {
          const { result, rawResponse } = await screeningService.analyzeWithRaw(
            call.transcript,
            call.summary || ''
          )

          await prisma.callAnalytic.upsert({
            where: { callId: call.id },
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
              callId: call.id,
              candidateId: call.candidateId,
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
          console.error(`[Webhook] Screening analysis failed for call ${call.id}:`, analysisErr)
        }
      }

      if (isCompleted) {
        await prisma.candidate.updateMany({
          where: { id: call.candidateId, status: { notIn: ['APPROVED', 'REJECTED', 'IN_PROCESS'] } },
          data: { status: 'CALLED' },
        })
      } else if (isNoAnswer) {
        await prisma.candidate.updateMany({
          where: { id: call.candidateId, status: { notIn: ['APPROVED', 'REJECTED', 'IN_PROCESS'] } },
          data: { status: 'NO_ANSWER' },
        })
      } else if (isFailed) {
        await prisma.candidate.updateMany({
          where: { id: call.candidateId, status: { notIn: ['APPROVED', 'REJECTED', 'IN_PROCESS'] } },
          data: { status: 'PENDING' },
        })
      }
    } catch (err) {
      console.error('[Webhook] Error:', err)
    }
  },
}
