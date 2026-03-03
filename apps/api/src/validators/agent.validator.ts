import { z } from 'zod'

export const createAgentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(2000).optional(),
  prompt: z.string().min(1).max(10000),
  voice: z.string().min(1).max(100).optional(),
  model: z.string().min(1).max(100).optional(),
  maxDuration: z.number().int().min(60).max(7200).optional(),
})

export const updateAgentSchema = createAgentSchema.partial()
