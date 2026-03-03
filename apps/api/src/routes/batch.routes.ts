import { Router } from 'express'
import { batchController } from '../controllers/batch.controller'
import { validate } from '../middleware/validate.middleware'
import { batchCallSchema } from '../validators/call.validator'

const router = Router()

router.post('/calls', validate(batchCallSchema), batchController.initiateCalls)

export default router
