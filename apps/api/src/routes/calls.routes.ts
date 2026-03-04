import { Router } from 'express'
import { callsController } from '../controllers/calls.controller'
import { validate } from '../middleware/validate.middleware'
import { initiateCallSchema } from '../validators/call.validator'

const router = Router()

router.get('/', callsController.list)
router.post('/', validate(initiateCallSchema), callsController.initiate)
router.get('/:id', callsController.get)
router.get('/:id/status', callsController.getStatus)
router.get('/:id/transcript', callsController.getTranscript)

export default router
