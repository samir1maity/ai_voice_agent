import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { env } from './config/env'
import { logger } from './middleware/logger.middleware'
import { errorMiddleware } from './middleware/error.middleware'
import apiRouter from './routes/index'

const app = express()

// ─── Security & Parsing ───────────────────────────────────────────────────────
app.use(helmet())
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(logger)

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/v1', apiRouter)

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.method} ${req.path} not found` })
})

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use(errorMiddleware)

export default app
