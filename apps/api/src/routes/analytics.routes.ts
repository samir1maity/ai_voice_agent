import { Router } from 'express'
import { analyticsController } from '../controllers/analytics.controller'

const router = Router()

router.get('/dashboard', analyticsController.dashboard)
router.get('/costs', analyticsController.costs)

export default router
