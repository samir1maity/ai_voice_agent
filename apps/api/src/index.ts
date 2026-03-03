import { config } from 'dotenv'
import path from 'path'
config({ path: path.resolve(__dirname, '../.env') })

import { env } from './config/env'
import { prisma } from '@ai-voice-agent/db'
import app from './app'

async function bootstrap() {
  try {
    await prisma.$connect()
    console.log('✅ Database connected')

    app.listen(env.PORT, () => {
      console.log(`🚀 API server running on http://localhost:${env.PORT}`)
      console.log(`📡 Webhook endpoint: ${env.WEBHOOK_BASE_URL}/api/v1/webhook/bolna`)
      console.log(`🌍 Environment: ${env.NODE_ENV}`)
    })
  } catch (err) {
    console.error('❌ Failed to start server:', err)
    process.exit(1)
  }
}

bootstrap()

process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Graceful shutdown...')
  await prisma.$disconnect()
  process.exit(0)
})
