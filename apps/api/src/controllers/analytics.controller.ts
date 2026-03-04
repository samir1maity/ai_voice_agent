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
        totalCostResult,
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
        prisma.call.aggregate({ _sum: { cost: true } }),
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
            totalCost: Math.round((totalCostResult._sum.cost || 0) * 100) / 100,
            callsToday,
            activeAgents,
            totalCandidates,
          },
          funnel: {
            pending: statusMap.PENDING || 0,
            scheduled: statusMap.SCHEDULED || 0,
            called: statusMap.CALLED || 0,
            noAnswer: statusMap.NO_ANSWER || 0,
          },
          recentCalls: recentCalls.map((c) => ({
            id: c.id,
            candidateName: c.candidate.name,
            candidatePhone: c.candidate.phone,
            status: c.status,
            duration: c.duration,
            cost: c.cost,
            initiatedAt: c.initiatedAt,
          })),
          techStackFrequency: techFrequency,
        },
      })
    } catch (err) {
      next(err)
    }
  },

  async costs(req: Request, res: Response, next: NextFunction) {
    try {
      const days = parseInt(req.query.days as string) || 30
      const from = new Date()
      from.setDate(from.getDate() - days)

      const calls = await prisma.call.findMany({
        where: { initiatedAt: { gte: from }, status: 'COMPLETED' },
        select: { initiatedAt: true, cost: true },
        orderBy: { initiatedAt: 'asc' },
      })

      const dailyMap: Record<string, { cost: number; calls: number }> = {}
      for (const call of calls) {
        const date = call.initiatedAt.toISOString().split('T')[0]
        if (!dailyMap[date]) dailyMap[date] = { cost: 0, calls: 0 }
        dailyMap[date].cost += call.cost || 0
        dailyMap[date].calls += 1
      }

      const dailyCosts = Object.entries(dailyMap).map(([date, data]) => ({
        date,
        cost: Math.round(data.cost * 100) / 100,
        calls: data.calls,
      }))

      res.json({ success: true, data: dailyCosts })
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
