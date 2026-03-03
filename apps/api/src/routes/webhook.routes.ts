import { Router } from 'express'
import { webhookController } from '../controllers/webhook.controller'

const router = Router()

router.post('/bolna', webhookController.handleBolna)

export default router
