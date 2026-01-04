import type { RequestHandler } from 'express'
import { env } from '../env'
import { verifyUserJwt } from '../auth'

declare global {
  namespace Express {
    interface Request {
      userId?: string
    }
  }
}

export const requireAuth: RequestHandler = (req, res, next) => {
  try {
    const bearer = req.header('authorization')
    const tokenFromBearer = bearer?.startsWith('Bearer ') ? bearer.slice('Bearer '.length) : undefined
    const token = tokenFromBearer ?? (req.cookies?.[env.COOKIE_NAME] as string | undefined)

    if (!token) {
      return res.status(401).json({ error: 'Missing auth token' })
    }

    const payload = verifyUserJwt(token)
    req.userId = payload.sub
    return next()
  } catch {
    return res.status(401).json({ error: 'Invalid auth token' })
  }
}
