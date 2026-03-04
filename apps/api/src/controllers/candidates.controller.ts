import { Request, Response, NextFunction } from 'express'
import { parse } from 'csv-parse/sync'
import { prisma } from '@ai-voice-agent/db'
import { AppError } from '../middleware/error.middleware'

export const candidatesController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1
      const limit = parseInt(req.query.limit as string) || 20
      const skip = (page - 1) * limit
      const { status, search } = req.query
      console.log('req.query', req.query)

      const where: Record<string, unknown> = {}
      if (status) {
        const statuses = (status as string).split(',').map((s) => s.trim()).filter(Boolean)
        where.status = statuses.length === 1 ? statuses[0] : { in: statuses }
      }
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search as string } },
        ]
      }

      const [candidates, total] = await Promise.all([
        prisma.candidate.findMany({
          where,
          include: {
            _count: { select: { calls: true } },
            calls: {
              select: { initiatedAt: true },
              orderBy: { initiatedAt: 'desc' },
              take: 1,
            },
            callAnalytics: {
              select: { detectedTechStack: true, extractedYearsExp: true },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.candidate.count({ where }),
      ])

      const candidatesWithLastCall = candidates.map((candidate) => ({
        ...candidate,
        lastCallDate: candidate.calls[0]?.initiatedAt || null,
        mentionedTechStack: candidate.callAnalytics[0]?.detectedTechStack || [],
        extractedYearsExp: candidate.callAnalytics[0]?.extractedYearsExp ?? null,
      }))

      res.json({
        success: true,
        data: candidatesWithLastCall,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      })
    } catch (err) {
      next(err)
    }
  },

  async get(req: Request, res: Response, next: NextFunction) {
    try {
      const candidate = await prisma.candidate.findUnique({
        where: { id: req.params.id },
        include: {
          calls: {
            include: { analytics: true, agent: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'desc' },
          },
        },
      })
      if (!candidate) throw new AppError(404, 'Candidate not found')
      res.json({ success: true, data: candidate })
    } catch (err) {
      next(err)
    }
  },

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const candidate = await prisma.candidate.create({ data: req.body })
      res.status(201).json({ success: true, data: candidate })
    } catch (err: unknown) {
      if ((err as { code?: string }).code === 'P2002') {
        next(new AppError(409, 'A candidate with this phone or email already exists'))
        return
      }
      next(err)
    }
  },

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const existing = await prisma.candidate.findUnique({ where: { id: req.params.id } })
      if (!existing) throw new AppError(404, 'Candidate not found')

      const candidate = await prisma.candidate.update({
        where: { id: req.params.id },
        data: req.body,
      })
      res.json({ success: true, data: candidate })
    } catch (err) {
      next(err)
    }
  },

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const existing = await prisma.candidate.findUnique({ where: { id: req.params.id } })
      if (!existing) throw new AppError(404, 'Candidate not found')

      await prisma.$transaction([
        prisma.callAnalytic.deleteMany({ where: { candidateId: req.params.id } }),
        prisma.call.deleteMany({ where: { candidateId: req.params.id } }),
        prisma.candidate.delete({ where: { id: req.params.id } }),
      ])

      res.json({ success: true, message: 'Candidate deleted' })
    } catch (err: unknown) {
      if ((err as { code?: string }).code === 'P2003') {
        next(new AppError(409, 'Candidate cannot be deleted because related records exist'))
        return
      }
      next(err)
    }
  },

  async getCalls(req: Request, res: Response, next: NextFunction) {
    try {
      const calls = await prisma.call.findMany({
        where: { candidateId: req.params.id },
        include: { analytics: true, agent: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      })
      res.json({ success: true, data: calls })
    } catch (err) {
      next(err)
    }
  },

  async importCsv(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) throw new AppError(400, 'CSV file is required')

      const fileContent = req.file.buffer.toString('utf-8')
      let records: Record<string, string>[]

      try {
        records = parse(fileContent, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
        })
      } catch {
        throw new AppError(400, 'Invalid CSV format')
      }

      const batch = await prisma.importBatch.create({
        data: { filename: req.file.originalname, totalRecords: records.length },
      })

      const errors: Array<{ row: number; error: string }> = []
      let imported = 0

      for (let i = 0; i < records.length; i++) {
        const row = records[i]
        try {
          if (!row.name || !row.phone) {
            errors.push({ row: i + 2, error: 'Missing required fields: name, phone' })
            continue
          }

          await prisma.candidate.upsert({
            where: { phone: row.phone.trim() },
            update: {},
            create: {
              name: row.name.trim(),
              phone: row.phone.trim(),
              email: row.email?.trim() || undefined,
              currentRole: row.currentRole?.trim() || row.current_role?.trim() || undefined,
              yearsOfExperience: row.yearsOfExperience || row.years_of_experience
                ? parseInt(row.yearsOfExperience || row.years_of_experience)
                : undefined,
              timezone: row.timezone?.trim() || 'Asia/Kolkata',
              importBatchId: batch.id,
            },
          })
          imported++
        } catch (err: unknown) {
          errors.push({ row: i + 2, error: (err as Error).message })
        }
      }

      await prisma.importBatch.update({
        where: { id: batch.id },
        data: { imported, failed: errors.length, status: 'completed', errors },
      })

      res.status(201).json({
        success: true,
        data: { batchId: batch.id, total: records.length, imported, failed: errors.length, errors },
      })
    } catch (err) {
      next(err)
    }
  },

  async getImportBatch(req: Request, res: Response, next: NextFunction) {
    try {
      const batch = await prisma.importBatch.findUnique({ where: { id: req.params.batchId } })
      if (!batch) throw new AppError(404, 'Import batch not found')
      res.json({ success: true, data: batch })
    } catch (err) {
      next(err)
    }
  },
}
