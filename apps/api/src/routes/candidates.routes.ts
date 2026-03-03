import { Router } from 'express'
import multer from 'multer'
import { candidatesController } from '../controllers/candidates.controller'
import { validate } from '../middleware/validate.middleware'
import { createCandidateSchema, updateCandidateSchema } from '../validators/candidate.validator'

const router = Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })

router.get('/', candidatesController.list)
router.post('/', validate(createCandidateSchema), candidatesController.create)
router.get('/import/:batchId', candidatesController.getImportBatch)
router.post('/import', upload.single('file'), candidatesController.importCsv)
router.get('/:id', candidatesController.get)
router.put('/:id', validate(updateCandidateSchema), candidatesController.update)
router.delete('/:id', candidatesController.delete)
router.get('/:id/calls', candidatesController.getCalls)

export default router
