import { z } from 'zod'

export const createCandidateSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().min(10).max(20).regex(/^\+?[\d\s\-()]+$/, 'Invalid phone number'),
  email: z.string().email().optional(),
  currentRole: z.string().max(100).optional(),
  yearsOfExperience: z.number().int().min(0).max(50).optional(),
  timezone: z.string().default('Asia/Kolkata'),
  notes: z.string().max(2000).optional(),
})

export const updateCandidateSchema = createCandidateSchema.partial()
