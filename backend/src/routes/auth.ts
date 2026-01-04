import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { pool } from '../db'
import { env } from '../env'
import { signUserJwt, verifyUserJwt } from '../auth'

export const authRouter = Router()

function isSchemaError(e: any): boolean {
  const code = e?.code
  return code === 'ER_BAD_FIELD_ERROR' || code === 'ER_NO_SUCH_TABLE' || code === 'ER_PARSE_ERROR'
}

const RegisterSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string().email().max(320),
  password: z.string().min(8).max(200)
})

const LoginSchema = z.object({
  identifier: z.string().min(1).max(320),
  password: z.string().min(8).max(200)
})

function setAuthCookie(res: any, jwt: string) {
  res.cookie(env.COOKIE_NAME, jwt, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.COOKIE_SECURE,
    path: '/'
  })
}

authRouter.get('/me', async (req, res) => {
  const token = req.cookies?.[env.COOKIE_NAME] as string | undefined
  if (!token) return res.status(401).json({ error: 'Not authenticated' })

  let payload: { sub: string }
  try {
    payload = verifyUserJwt(token)
  } catch {
    return res.status(401).json({ error: 'Not authenticated' })
  }

  const userId = payload.sub

  try {
    const [rows] = await pool.query<any[]>('SELECT id, email, username FROM users WHERE id = ? LIMIT 1', [userId])
    const user = rows?.[0]
    if (!user) return res.status(401).json({ error: 'Not authenticated' })

    return res.json({
      userId: String(user.id),
      email: String(user.email ?? ''),
      username: String(user.username ?? '')
    })
  } catch (e: any) {
    if (isSchemaError(e)) {
      return res.status(500).json({
        error: 'Database schema is outdated. Update users table (username, email, password_hash) using backend/sql/schema.sql.'
      })
    }
    throw e
  }
})

authRouter.post('/register', async (req, res) => {
  const parsed = RegisterSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const username = parsed.data.username.trim().toLowerCase()
  const email = parsed.data.email.trim().toLowerCase()
  const passwordHash = await bcrypt.hash(parsed.data.password, 10)

  const userId = uuidv4()
  try {
    await pool.execute('INSERT INTO users (id, username, email, password_hash) VALUES (?, ?, ?, ?)', [
      userId,
      username,
      email,
      passwordHash
    ])
  } catch (e: any) {
    if (isSchemaError(e)) {
      return res.status(500).json({
        error: 'Database schema is outdated. Update users table (username, email, password_hash) using backend/sql/schema.sql.'
      })
    }
    if (e?.code === 'ER_DUP_ENTRY') {
      const msg = String(e?.message ?? '')
      if (msg.includes('uniq_users_username')) return res.status(409).json({ error: 'Username already taken' })
      if (msg.includes('uniq_users_email')) return res.status(409).json({ error: 'Email already registered' })
      return res.status(409).json({ error: 'Account already exists' })
    }
    throw e
  }

  const jwt = signUserJwt(userId)
  setAuthCookie(res, jwt)
  return res.status(201).json({ userId, email, username })
})

authRouter.post('/login', async (req, res) => {
  const parsed = LoginSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const identifier = parsed.data.identifier.trim()
  const identifierLower = identifier.toLowerCase()

  try {
    const [rows] = await pool.query<any[]>(
      'SELECT id, email, username, password_hash AS passwordHash FROM users WHERE email = ? OR username = ? LIMIT 1',
      [identifierLower, identifierLower]
    )

    const user = rows?.[0]
    if (!user) return res.status(401).json({ error: 'Invalid email/username or password' })

    const ok = await bcrypt.compare(parsed.data.password, String(user.passwordHash))
    if (!ok) return res.status(401).json({ error: 'Invalid email/username or password' })

    const userId = String(user.id)
    const jwt = signUserJwt(userId)
    setAuthCookie(res, jwt)
    return res.json({ userId, email: String(user.email ?? ''), username: String(user.username ?? '') })
  } catch (e: any) {
    if (isSchemaError(e)) {
      return res.status(500).json({
        error: 'Database schema is outdated. Update users table (username, email, password_hash) using backend/sql/schema.sql.'
      })
    }
    throw e
  }
})

authRouter.post('/logout', (req, res) => {
  res.clearCookie(env.COOKIE_NAME, { path: '/' })
  return res.json({ ok: true })
})
