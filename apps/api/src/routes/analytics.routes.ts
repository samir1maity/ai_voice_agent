import { Router } from 'express'
import { analyticsController } from '../controllers/analytics.controller'

const router = Router()

router.get('/dashboard', analyticsController.dashboard)

export default router
