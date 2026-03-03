import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('4000').transform(Number),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  BOLNA_API_KEY: z.string().min(1, 'BOLNA_API_KEY is required'),
  BOLNA_BASE_URL: z.string().default('https://api.bolna.ai'),
  BOLNA_WEBHOOK_SECRET: z.string().optional(),
  WEBHOOK_BASE_URL: z.string().default('http://localhost:4000'),
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY is required'),
})

function validateEnv() {
  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    console.error('❌ Invalid environment variables:')
    console.error(parsed.error.flatten().fieldErrors)
    process.exit(1)
  }
  return parsed.data
}

export const env = validateEnv()
