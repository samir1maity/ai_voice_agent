import { Router } from 'express'
import { agentsController } from '../controllers/agents.controller'
import { validate } from '../middleware/validate.middleware'
import { createAgentSchema, updateAgentSchema, workspaceApiKeySchema } from '../validators/agent.validator'

const router = Router()

router.get('/workspace', agentsController.getWorkspace)
router.put('/workspace/api-key', validate(workspaceApiKeySchema), agentsController.setApiKey)
router.delete('/workspace/api-key', agentsController.removeApiKey)
router.get('/', agentsController.list)
router.post('/', validate(createAgentSchema), agentsController.create)
router.post('/fetch-all', agentsController.fetchAll)
router.get('/:id', agentsController.get)
router.put('/:id', validate(updateAgentSchema), agentsController.update)
router.delete('/:id', agentsController.delete)
router.post('/:id/sync', agentsController.sync)
router.get('/:id/calls', agentsController.getCalls)

export default router
