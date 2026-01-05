import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import fs from 'node:fs'
import path from 'node:path'
import { env } from './env'
import { authRouter } from './routes/auth'
import { requireAuth } from './middleware/requireAuth'
import { applicationsRouter } from './routes/applications'
import { dashboardRouter } from './routes/dashboard'
import { aiRouter } from './routes/ai'

const app = express()        // Create Express application instance 

const allowedOrigins = env.CORS_ORIGIN.split(',')
  .map((s) => s.trim())
  .filter(Boolean)

app.use(
  cors({
    origin(origin, callback) {
      // Allow non-browser clients (curl, server-to-server) with no Origin header.
      if (!origin) return callback(null, true)

      if (allowedOrigins.includes(origin)) return callback(null, true)

      return callback(new Error(`Not allowed by CORS: ${origin}`))
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);
app.use(cookieParser())                   // Parse cookies from incoming requests
app.use(express.json({ limit: '1mb' }))   // Parse JSON bodies with a size limit

// Health check endpoint to verify server is running

app.get('/health', (_req, res) => res.json({ ok: true }))

app.use('/auth', authRouter)  

// Public authentication routes

// Protected routes that require authentication

app.use('/api', requireAuth)
app.use('/api/applications', applicationsRouter)
app.use('/api/dashboard', dashboardRouter)
app.use('/api/ai', aiRouter)

// Serve the built frontend (single-origin deployment).
// This avoids cross-site cookie/SameSite issues in production.
const frontendDist = path.resolve(__dirname, '../../frontend/dist')
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist))

  // SPA fallback for non-API routes
  app.get(/^\/(?!api\/|auth\/|health$).*/, (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'))
  })
}

app.use((err: any, _req: any, res: any, _next: any) => {

  console.error(err)                 
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(env.PORT, () => {

  console.log(`Backend listening on http://localhost:${env.PORT}`)
})
