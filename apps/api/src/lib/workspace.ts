import { Request } from 'express'
import { prisma } from '@ai-voice-agent/db'
import { AppError } from '../middleware/error.middleware'

const CLIENT_ID_HEADER = 'x-client-id'
const MIN_CLIENT_ID_LENGTH = 8
const MAX_CLIENT_ID_LENGTH = 120

export function getClientId(req: Request): string {
  const clientId = req.header(CLIENT_ID_HEADER)?.trim()

  if (!clientId) {
    throw new AppError(400, 'Missing client id. Please refresh the app and try again.')
  }

  if (clientId.length < MIN_CLIENT_ID_LENGTH || clientId.length > MAX_CLIENT_ID_LENGTH) {
    throw new AppError(400, 'Invalid client id. Please refresh the app and try again.')
  }

  return clientId
}

export async function getWorkspace(req: Request) {
  const clientId = getClientId(req)

  return prisma.workspace.upsert({
    where: { clientId },
    update: {},
    create: { clientId },
  })
}

export async function getWorkspaceWithApiKey(req: Request) {
  const workspace = await getWorkspace(req)
  if (!workspace.bolnaApiKey) {
    throw new AppError(400, 'Bolna API key not set. Add it in Agents > API Key tab.')
  }
  return workspace
}

export function maskApiKey(apiKey?: string | null) {
  if (!apiKey) return null
  if (apiKey.length <= 8) return `${apiKey.slice(0, 2)}****`
  return `${apiKey.slice(0, 4)}****${apiKey.slice(-4)}`
}
