import { Request, Response, NextFunction } from 'express'
import { prisma } from '@ai-voice-agent/db'
import { getWorkspace } from '../lib/workspace'

export const analyticsController = {
  async dashboard(req: Request, res: Response, next: NextFunction) {
    try {
      const workspace = await getWorkspace(req)
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const callsWhere = { agent: { workspaceId: workspace.id } }

      const [
        totalCalls,
        completedCalls,
        callsToday,
        activeAgents,
        totalCandidates,
        avgDurationResult,
        recentCalls,
      ] = await Promise.all([
        prisma.call.count({ where: callsWhere }),
        prisma.call.count({ where: { ...callsWhere, status: 'COMPLETED' } }),
        prisma.call.count({ where: { ...callsWhere, initiatedAt: { gte: today } } }),
        prisma.agent.count({ where: { workspaceId: workspace.id, status: 'ACTIVE' } }),
        prisma.candidate.count(),
        prisma.call.aggregate({ _avg: { duration: true }, where: { ...callsWhere, status: 'COMPLETED' } }),
        prisma.call.findMany({
          where: callsWhere,
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { candidate: { select: { name: true, phone: true } } },
        }),
      ])

      res.json({
        success: true,
        data: {
          metrics: {
            totalCalls,
            completedCalls,
            avgDuration: Math.round(avgDurationResult._avg.duration || 0),
            callsToday,
            activeAgents,
            totalCandidates,
          },
          recentCalls: recentCalls.map((c) => ({
            id: c.id,
            candidateName: c.candidate.name,
            candidatePhone: c.candidate.phone,
            status: c.status,
            duration: c.duration,
            initiatedAt: c.initiatedAt,
          })),
        },
      })
    } catch (err) {
      next(err)
    }
  },
}
