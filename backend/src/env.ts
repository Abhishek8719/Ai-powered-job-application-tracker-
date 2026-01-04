import dotenv from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'
import { z } from 'zod'

// Load environment variables reliably whether the backend is started from:
// - backend/ (common)
// - repo root via scripts/dev.cjs or other tooling
//
// We do NOT override already-set environment variables.
const envCandidates = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'backend', '.env')
]

for (const candidate of envCandidates) {
  if (fs.existsSync(candidate)) {
    dotenv.config({ path: candidate, override: false })
  }
}

const EnvSchema = z.object({
  PORT: z.coerce.number().default(3001),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('30d'),

  COOKIE_NAME: z.string().default('jat'),
  COOKIE_SECURE: z.coerce.boolean().default(false),

  DB_HOST: z.string(),
  DB_PORT: z.coerce.number().default(3306),
  DB_USER: z.string().default('root'),
  DB_PASSWORD: z.string(),
  DB_NAME: z.string().default('job_tracker_db'),

  // LLM providers (either can be used)
  // Gemini-only setup for this project.
  LLM_PROVIDER: z.literal('gemini').optional(),

  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-1.5-flash')
})

export const env = EnvSchema.parse(process.env)
