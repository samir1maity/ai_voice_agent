import { z } from 'zod'

export const initiateCallSchema = z.object({
  candidateId: z.string().cuid(),
  agentId: z.string().cuid(),
})

export const batchCallSchema = z.object({
  candidateIds: z.array(z.string().cuid()).min(1).max(50),
  agentId: z.string().cuid(),
})
