import { Request, Response, NextFunction } from 'express'
import { prisma } from '@ai-voice-agent/db'

export const analyticsController = {
  async dashboard(_req: Request, res: Response, next: NextFunction) {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const [
        totalCalls,
        completedCalls,
        callsToday,
        activeAgents,
        totalCandidates,
        avgDurationResult,
        recentCalls,
        candidatesByStatus,
        allAnalytics,
      ] = await Promise.all([
        prisma.call.count(),
        prisma.call.count({ where: { status: 'COMPLETED' } }),
        prisma.call.count({ where: { initiatedAt: { gte: today } } }),
        prisma.agent.count({ where: { status: 'ACTIVE' } }),
        prisma.candidate.count(),
        prisma.call.aggregate({ _avg: { duration: true }, where: { status: 'COMPLETED' } }),
        prisma.call.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { candidate: { select: { name: true, phone: true } } },
        }),
        prisma.candidate.groupBy({ by: ['status'], _count: true }),
        prisma.callAnalytic.findMany({ select: { detectedTechStack: true } }),
      ])

      const statusMap: Record<string, number> = {}
      for (const s of candidatesByStatus) statusMap[s.status] = s._count

      const techFrequency = calculateTechFrequency(allAnalytics.map((a) => a.detectedTechStack))

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
          funnel: {
            pending: statusMap.PENDING || 0,
            called: statusMap.CALLED || 0,
            noAnswer: statusMap.NO_ANSWER || 0,
          },
          recentCalls: recentCalls.map((c) => ({
            id: c.id,
            candidateName: c.candidate.name,
            candidatePhone: c.candidate.phone,
            status: c.status,
            duration: c.duration,
            initiatedAt: c.initiatedAt,
          })),
          techStackFrequency: techFrequency,
        },
      })
    } catch (err) {
      next(err)
    }
  },
}

function calculateTechFrequency(techStacks: string[][]) {
  const counts: Record<string, number> = {}
  const total = techStacks.length

  for (const stack of techStacks) {
    for (const tech of stack) {
      counts[tech] = (counts[tech] || 0) + 1
    }
  }

  return Object.entries(counts)
    .map(([tech, count]) => ({
      tech,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
}
