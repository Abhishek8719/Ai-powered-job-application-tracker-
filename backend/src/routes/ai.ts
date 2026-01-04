import { Router } from 'express'
import multer from 'multer'
import { z } from 'zod'
import { getGeminiClient, generateJsonWithGemini } from '../utils/gemini'
import { extractPdfText } from '../utils/pdf'
import { analyzeResumeAts } from '../utils/ats'

export const aiRouter = Router()

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })

function mapGeminiError(err: unknown): { status: number; error: string } | null {
  const anyErr = err as any
  const status: number | undefined =
    typeof anyErr?.status === 'number'
      ? anyErr.status
      : typeof anyErr?.response?.status === 'number'
        ? anyErr.response.status
        : undefined

  const message = anyErr instanceof Error ? anyErr.message : String(err)
  const lower = message.toLowerCase()

  // Common Gemini / Google AI Studio failures.
  if (status === 429 || lower.includes('quota') || lower.includes('rate') || lower.includes('resource has been exhausted')) {
    return {
      status: 429,
      error:
        'Gemini quota/rate limit exceeded. Check your Google AI billing/limits (or use a different key) and try again.'
    }
  }

  if (status === 401 || lower.includes('invalid api key') || lower.includes('api key')) {
    return {
      status: 401,
      error: 'Gemini authentication failed. Verify GEMINI_API_KEY in the backend .env and restart the server.'
    }
  }

  if (status === 403) {
    return {
      status: 403,
      error: 'Gemini request was forbidden. Check your Google AI project permissions and model access.'
    }
  }

  return null
}

aiRouter.post('/resume-compatibility', upload.single('resumePdf'), async (req, res) => {
  const client = getGeminiClient()
  if (!client) return res.status(501).json({ error: 'Gemini not configured (set GEMINI_API_KEY)' })

  const jobDescription = typeof req.body?.jobDescription === 'string' ? req.body.jobDescription : ''
  if (!jobDescription.trim()) return res.status(400).json({ error: 'jobDescription is required' })
  if (!req.file?.buffer) return res.status(400).json({ error: 'resumePdf is required' })

  try {
    // Quick sanity check: ensure the file looks like a PDF.
    const header = req.file.buffer.subarray(0, 8).toString('utf8')
    if (!header.startsWith('%PDF-')) {
      return res
        .status(422)
        .json({ error: 'This file does not look like a valid PDF. Please upload a real PDF (not a renamed Word/image file).' })
    }

    const resumeText = await extractPdfText(req.file.buffer)
    if (!resumeText.trim()) {
      return res.status(422).json({ error: 'Could not extract readable text from this PDF. Try a text-based resume PDF (not scanned images).' })
    }

    const analysis = await analyzeResumeAts({ client, resumeText, jobDescription })
    return res.json(analysis)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'ATS analysis failed'
    // If PDF parsing fails, surface a more helpful message.
    if (typeof msg === 'string' && msg.startsWith('PDF:')) {
      return res.status(422).json({ error: msg.replace(/^PDF:\s*/, '') })
    }

    const mapped = mapGeminiError(e)
    if (mapped) return res.status(mapped.status).json({ error: mapped.error })

    return res.status(502).json({ error: msg })
  }
})

const InterviewProbSchema = z.object({
  interviewProbability: z.number().min(0).max(100),
  reasoning: z.array(z.string()).default([]),
  recommendations: z.array(z.string()).default([])
})

aiRouter.post('/interview-probability', upload.single('resumePdf'), async (req, res) => {
  const client = getGeminiClient()
  if (!client) return res.status(501).json({ error: 'Gemini not configured (set GEMINI_API_KEY)' })

  const jobDescription = typeof req.body?.jobDescription === 'string' ? req.body.jobDescription : ''
  const profileSummary = typeof req.body?.profileSummary === 'string' ? req.body.profileSummary : ''

  if (!jobDescription.trim()) return res.status(400).json({ error: 'jobDescription is required' })
  if (!profileSummary.trim()) return res.status(400).json({ error: 'profileSummary is required' })

  let resumeText = ''
  if (req.file?.buffer) {
    try {
      resumeText = await extractPdfText(req.file.buffer)
    } catch (e) {
      const msg = e instanceof Error ? e.message : ''
      if (typeof msg === 'string' && msg.startsWith('PDF:')) {
        return res.status(422).json({ error: msg.replace(/^PDF:\s*/, '') })
      }
      return res.status(422).json({ error: 'Failed to read this PDF. Please upload a different resume PDF.' })
    }
  }

  try {
    const prompt = {
      role: 'user' as const,
      content:
        'You are a hiring funnel analyst. Predict likelihood of securing an interview. ' +
        'Return ONLY valid JSON with keys: interviewProbability (0-100 number), reasoning (string[]), recommendations (string[]).\n' +
        `RESUME (may be empty):\n${resumeText}\n\nPROFILE SUMMARY:\n${profileSummary}\n\nJOB DESCRIPTION:\n${jobDescription}`
    }

    const json: unknown = await generateJsonWithGemini(client, { prompt: prompt.content, temperature: 0.3 })

    const parsed = InterviewProbSchema.safeParse(json)
    if (!parsed.success) {
      return res.status(502).json({ error: 'AI JSON did not match schema', details: parsed.error.flatten(), raw: json })
    }

    return res.json(parsed.data)
  } catch (e) {
    const mapped = mapGeminiError(e)
    if (mapped) return res.status(mapped.status).json({ error: mapped.error })

    const msg = e instanceof Error ? e.message : 'Interview probability failed'
    return res.status(502).json({ error: msg })
  }
})
