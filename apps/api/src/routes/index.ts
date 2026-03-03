import { Router } from 'express'
import agentsRouter from './agents.routes'
import candidatesRouter from './candidates.routes'
import callsRouter from './calls.routes'
import webhookRouter from './webhook.routes'
import analyticsRouter from './analytics.routes'
import batchRouter from './batch.routes'

const router = Router()

router.use('/agents', agentsRouter)
router.use('/candidates', candidatesRouter)
router.use('/calls', callsRouter)
router.use('/webhook', webhookRouter)
router.use('/analytics', analyticsRouter)
router.use('/batch', batchRouter)

export default router
