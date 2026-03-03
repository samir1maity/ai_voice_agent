import { Request, Response, NextFunction } from 'express'
import { ZodSchema, ZodError } from 'zod'

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body)
      next()
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(422).json({
          success: false,
          error: 'Validation failed',
          details: err.flatten().fieldErrors,
        })
        return
      }
      next(err)
    }
  }
}
