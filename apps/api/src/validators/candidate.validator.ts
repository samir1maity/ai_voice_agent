import { z } from 'zod'

const candidateStatusSchema = z.enum([
  'PENDING',
  'CALLED',
  'NO_ANSWER',
  'APPROVED',
  'REJECTED',
  'IN_PROCESS',
  'READY_FOR_CALL',
])

export const createCandidateSchema = z.object({
  name: z.string().min(1).max(100),
  countryCode: z.string().regex(/^\d{1,4}$/, 'Invalid country code').optional(),
  phone: z.string().min(10).max(20).regex(/^\+?[\d\s\-()]+$/, 'Invalid phone number'),
  email: z.string().email().optional(),
  currentRole: z.string().max(100).optional(),
  yearsOfExperience: z.number().int().min(0).max(50).optional(),
  timezone: z.string().default('Asia/Kolkata'),
  notes: z.string().max(2000).optional(),
  status: candidateStatusSchema.optional(),
})

export const updateCandidateSchema = createCandidateSchema.partial()
