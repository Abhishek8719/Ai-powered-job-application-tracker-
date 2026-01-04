import { Router } from 'express'
import { z } from 'zod'
import { pool } from '../db'

export const applicationsRouter = Router()

const StatusSchema = z.enum(['Applied', 'Interviewing', 'Offer', 'Rejected'])

const CreateSchema = z.object({
  company: z.string().min(1),
  role: z.string().min(1),
  status: StatusSchema.default('Applied'),
  jobUrl: z.string().url().optional().or(z.literal('')).transform((v) => (v ? v : undefined)),
  salary: z
    .union([z.number().int().nonnegative(), z.null()])
    .optional()
    .transform((v) => (v === null ? undefined : v)),
  dateApplied: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
})

const UpdateSchema = CreateSchema.partial()

applicationsRouter.get('/', async (req, res) => {
  const userId = req.userId!
  const status = typeof req.query.status === 'string' ? req.query.status : undefined
  const sort = typeof req.query.sort === 'string' ? req.query.sort : 'dateDesc'

  const where: string[] = ['user_id = ?']
  const params: any[] = [userId]

  if (status && ['Applied', 'Interviewing', 'Offer', 'Rejected'].includes(status)) {
    where.push('status = ?')
    params.push(status)
  }

  const orderBy = sort === 'dateAsc' ? 'date_applied ASC' : 'date_applied DESC'

  const [rows] = await pool.query(
    `SELECT id, company, role, status, job_url AS jobUrl, salary, DATE_FORMAT(date_applied, '%Y-%m-%d') AS dateApplied
     FROM applications
     WHERE ${where.join(' AND ')}
     ORDER BY ${orderBy}`,
    params
  )

  return res.json({ items: rows })
})

applicationsRouter.post('/', async (req, res) => {
  const userId = req.userId!
  const parsed = CreateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const { company, role, status, jobUrl, salary, dateApplied } = parsed.data

  const [result] = await pool.execute(
    'INSERT INTO applications (user_id, company, role, status, job_url, salary, date_applied) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [userId, company, role, status, jobUrl ?? null, salary ?? null, dateApplied]
  )

  const insertId = (result as any).insertId as number
  return res.status(201).json({ id: insertId })
})

applicationsRouter.put('/:id', async (req, res) => {
  const userId = req.userId!
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' })

  const parsed = UpdateSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })

  const patch = parsed.data
  const fields: string[] = []
  const values: any[] = []

  if (patch.company !== undefined) {
    fields.push('company = ?')
    values.push(patch.company)
  }
  if (patch.role !== undefined) {
    fields.push('role = ?')
    values.push(patch.role)
  }
  if (patch.status !== undefined) {
    fields.push('status = ?')
    values.push(patch.status)
  }
  if (patch.jobUrl !== undefined) {
    fields.push('job_url = ?')
    values.push(patch.jobUrl ?? null)
  }
  if (patch.salary !== undefined) {
    fields.push('salary = ?')
    values.push(patch.salary ?? null)
  }
  if (patch.dateApplied !== undefined) {
    fields.push('date_applied = ?')
    values.push(patch.dateApplied)
  }

  if (fields.length === 0) return res.json({ ok: true })

  values.push(userId, id)
  const [result] = await pool.execute(
    `UPDATE applications SET ${fields.join(', ')} WHERE user_id = ? AND id = ?`,
    values
  )

  const affected = (result as any).affectedRows as number
  if (affected === 0) return res.status(404).json({ error: 'Not found' })
  return res.json({ ok: true })
})

applicationsRouter.delete('/:id', async (req, res) => {
  const userId = req.userId!
  const id = Number(req.params.id)
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' })

  const [result] = await pool.execute('DELETE FROM applications WHERE user_id = ? AND id = ?', [userId, id])
  const affected = (result as any).affectedRows as number
  if (affected === 0) return res.status(404).json({ error: 'Not found' })

  return res.json({ ok: true })
})
