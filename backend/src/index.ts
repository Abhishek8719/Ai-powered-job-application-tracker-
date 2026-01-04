import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { env } from './env'
import { authRouter } from './routes/auth'
import { requireAuth } from './middleware/requireAuth'
import { applicationsRouter } from './routes/applications'
import { dashboardRouter } from './routes/dashboard'
import { aiRouter } from './routes/ai'

const app = express()        // Create Express application instance 

app.use(
  cors({
    origin: env.CORS_ORIGIN,  // Only allow requests from this origin for security
    credentials: true
  })
)
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

app.use((err: any, _req: any, res: any, _next: any) => {

  console.error(err)                 
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(env.PORT, () => {

  console.log(`Backend listening on http://localhost:${env.PORT}`)
})
