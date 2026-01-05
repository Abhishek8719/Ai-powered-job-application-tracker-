import jwt, { type SignOptions } from 'jsonwebtoken'
import { env } from './env'

export type JwtPayload = {
  sub: string
}
export function signUserJwt(userId: string): string {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn']
  }

  return jwt.sign({ sub: userId } satisfies JwtPayload, env.JWT_SECRET, options)
}

export function verifyUserJwt(token: string): JwtPayload {
  const payload = jwt.verify(token, env.JWT_SECRET)
  if (typeof payload !== 'object' || payload === null || typeof (payload as any).sub !== 'string') {
    throw new Error('Invalid token payload')
  }
  return payload as JwtPayload
}
