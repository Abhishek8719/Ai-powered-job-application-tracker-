import type { LlmClient } from './gemini'
import { generateJsonWithGemini } from './gemini'
import { z } from 'zod'
import { buildSkillAliasMap, SKILL_NAMES } from './skillsTaxonomy'

export type AtsAnalysis = {
  scoreTotal: number
  breakdown: {
    skills: number
    roleFit: number
    keywords: number
    formatting: number
  }
  skills: {
    required: string[]
    preferred: string[]
    matched: string[]
    missing: string[]
  }
  responsibilities: Array<{
    text: string
    supported: boolean
    evidence: string | null
  }>
  keywords: {
    important: string[]
    matched: string[]
    missing: string[]
  }
  tips: string[]
}

const JdExtractionSchema = z.object({
  requiredSkills: z.array(z.string()).max(25).default([]),
  preferredSkills: z.array(z.string()).max(15).default([]),
  responsibilities: z.array(z.string()).max(12).default([]),
  keywords: z.array(z.string()).max(20).default([])
})

const ResponsibilitiesEvalSchema = z.array(
  z.object({
    text: z.string().min(1),
    supported: z.boolean(),
    evidence: z.string().nullable().default(null)
  })
)

const TipsSchema = z.object({
  tips: z.array(z.string()).max(10).default([])
})

const skillAliasMap = buildSkillAliasMap()

function normalizeWordText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function includesWord(haystackWordText: string, needle: string): boolean {
  const n = normalizeWordText(needle)
  if (!n) return false
  const padded = ` ${haystackWordText} `
  return padded.includes(` ${n} `)
}

function detectSkillsInText(text: string, skillNames: string[]): string[] {
  const raw = text.toLowerCase()
  const wordText = normalizeWordText(text)

  const matched: string[] = []
  for (const name of skillNames) {
    const aliases = skillAliasMap.get(name) ?? [name]
    let found = false
    for (const alias of aliases) {
      const aliasLower = alias.toLowerCase()
      // If alias is purely alphanumeric words, use word-boundary style matching.
      if (/^[a-z0-9 ]+$/.test(aliasLower)) {
        if (includesWord(wordText, aliasLower)) {
          found = true
          break
        }
      } else {
        // For tokens like C++, C#, .NET, Next.js, match in raw text.
        if (raw.includes(aliasLower)) {
          found = true
          break
        }
      }
    }

    if (found) matched.push(name)
  }
  return matched
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n))
}

function safeRatio(num: number, den: number): number {
  if (!den) return 0
  return num / den
}

function computeFormattingScore(resumeText: string): number {
  const raw = resumeText
  const wordText = normalizeWordText(resumeText)

  let score = 0

  const hasEmail = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(raw)
  const hasPhone = /(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)[\s.-]?)?\d{3}[\s.-]?\d{3,4}[\s.-]?\d{0,4}/.test(raw)
  if (hasEmail) score += 2
  if (hasPhone) score += 1

  const hasSkillsHeading = /(^|\s)(skills|technical skills)(\s|$)/i.test(wordText)
  const hasExpHeading = /(^|\s)(experience|work experience|employment)(\s|$)/i.test(wordText)
  if (hasSkillsHeading) score += 2
  if (hasExpHeading) score += 2

  // Text length heuristic (pdf extraction varies): reward roughly 2–8 pages worth.
  const len = raw.trim().length
  if (len >= 1200 && len <= 25000) score += 2

  // Penalize very low extractability.
  const uniqueChars = new Set(raw.replace(/\s+/g, '')).size
  if (uniqueChars >= 15) score += 1

  return clamp(score, 0, 10)
}

function uniqSorted(list: string[]): string[] {
  return Array.from(new Set(list)).sort((a, b) => a.localeCompare(b))
}

export async function analyzeResumeAts(params: {
  client: LlmClient
  resumeText: string
  jobDescription: string
}): Promise<AtsAnalysis> {
  const { client, resumeText, jobDescription } = params

  const taxonomyList = SKILL_NAMES.map((s) => `- ${s}`).join('\n')

  const jdPrompt =
    'You are an ATS analyst. Extract requirements from the JOB DESCRIPTION using ONLY the provided SKILLS TAXONOMY. ' +
    'Return ONLY valid JSON with keys: requiredSkills (string[]), preferredSkills (string[]), responsibilities (string[]), keywords (string[]).\n' +
    'Rules:\n' +
    '- requiredSkills/preferredSkills entries MUST be exact strings from the taxonomy list.\n' +
    '- requiredSkills max 25, preferredSkills max 15.\n' +
    '- responsibilities max 12, short phrases.\n' +
    '- keywords max 20, short tokens/phrases (exclude skills already listed).\n\n' +
    `SKILLS TAXONOMY (allowed values):\n${taxonomyList}\n\nJOB DESCRIPTION:\n${jobDescription}`

  let jdJson: unknown
  try {
    jdJson = await generateJsonWithGemini(client, { prompt: jdPrompt, temperature: 0.2 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg === 'AI returned non-JSON output') throw new Error('AI returned non-JSON JD extraction')
    throw e
  }

  const jdParsed = JdExtractionSchema.safeParse(jdJson)
  if (!jdParsed.success) {
    throw new Error('AI JD extraction did not match schema')
  }

  const allowedSkills = new Set(SKILL_NAMES)
  const required = jdParsed.data.requiredSkills.filter((s) => allowedSkills.has(s))
  const preferred = jdParsed.data.preferredSkills.filter((s) => allowedSkills.has(s) && !required.includes(s))
  const responsibilities = jdParsed.data.responsibilities.filter((s) => typeof s === 'string' && s.trim()).slice(0, 12)
  const keywords = jdParsed.data.keywords.filter((s) => typeof s === 'string' && s.trim()).slice(0, 20)

  const matchedRequired = detectSkillsInText(resumeText, required)
  const matchedPreferred = detectSkillsInText(resumeText, preferred)

  const matchedSkills = uniqSorted([...matchedRequired, ...matchedPreferred])
  const missingSkills = uniqSorted([...required, ...preferred].filter((s) => !matchedSkills.includes(s)))

  // Evaluate responsibility evidence with AI (binary + short evidence).
  let respItems: Array<{ text: string; supported: boolean; evidence: string | null }> = []
  if (responsibilities.length) {
    const respPrompt =
      'You are an ATS resume reviewer. For each RESPONSIBILITY, decide if the RESUME provides evidence. ' +
      'Return ONLY valid JSON array of objects: { text, supported, evidence }. Evidence should be a short quote/fragment from the resume or null.\n\n' +
      `RESPONSIBILITIES:\n${responsibilities.map((r, i) => `${i + 1}. ${r}`).join('\n')}\n\nRESUME:\n${resumeText}`

    let respJson: unknown
    try {
      respJson = await generateJsonWithGemini(client, { prompt: respPrompt, temperature: 0.2 })
    } catch {
      // If AI fails, fall back to an empty eval (roleFit becomes 0).
      respJson = []
    }

    const respParsed = ResponsibilitiesEvalSchema.safeParse(respJson)
    respItems = respParsed.success
      ? respParsed.data
          .slice(0, responsibilities.length)
          .map((it, idx) => ({ text: it.text || responsibilities[idx], supported: it.supported, evidence: it.evidence ?? null }))
      : responsibilities.map((r) => ({ text: r, supported: false, evidence: null }))
  }

  // Keyword matching is deterministic.
  const keywordMatched: string[] = []
  if (keywords.length) {
    const rawLower = resumeText.toLowerCase()
    const wordLower = normalizeWordText(resumeText)
    for (const kw of keywords) {
      const kwLower = kw.toLowerCase()
      const hit = /^[a-z0-9 ]+$/.test(kwLower) ? includesWord(wordLower, kwLower) : rawLower.includes(kwLower)
      if (hit) keywordMatched.push(kw)
    }
  }

  const keywordMissing = uniqSorted(keywords.filter((k) => !keywordMatched.includes(k)))

  const formatting = computeFormattingScore(resumeText)

  // Deterministic rubric (0–100)
  const skillsScore =
    40 * safeRatio(matchedRequired.length, required.length) + 10 * safeRatio(matchedPreferred.length, preferred.length)

  const supportedCount = respItems.filter((r) => r.supported).length
  const roleFitScore = 25 * safeRatio(supportedCount, respItems.length)

  const keywordsScore = 15 * safeRatio(keywordMatched.length, keywords.length)

  const total = clamp(Math.round(skillsScore + roleFitScore + keywordsScore + formatting), 0, 100)

  // Tips: keep it concise and actionable.
  const missingRequired = required.filter((s) => !matchedSkills.includes(s))
  const unsupportedResponsibilities = respItems.filter((r) => !r.supported).map((r) => r.text)

  const tipsPrompt =
    'You are a resume coach. Create 6 concise, actionable tips to improve ATS screening and interview chances. ' +
    'Focus on closing gaps with evidence (projects/experience), adding missing keywords naturally, and improving bullet impact. ' +
    'Return ONLY valid JSON: { tips: string[] }.\n\n' +
    `MISSING REQUIRED SKILLS: ${missingRequired.join(', ') || 'None'}\n` +
    `MISSING OTHER SKILLS: ${missingSkills.join(', ') || 'None'}\n` +
    `UNSUPPORTED RESPONSIBILITIES: ${unsupportedResponsibilities.join(' | ') || 'None'}\n\n` +
    `RESUME (for context):\n${resumeText}\n\nJOB DESCRIPTION (for context):\n${jobDescription}`

  let tipsJson: unknown
  try {
    tipsJson = await generateJsonWithGemini(client, { prompt: tipsPrompt, temperature: 0.3 })
  } catch {
    tipsJson = { tips: [] }
  }

  const tipsParsed = TipsSchema.safeParse(tipsJson)
  const tips = tipsParsed.success ? tipsParsed.data.tips : []

  return {
    scoreTotal: total,
    breakdown: {
      skills: clamp(Math.round(skillsScore), 0, 50),
      roleFit: clamp(Math.round(roleFitScore), 0, 25),
      keywords: clamp(Math.round(keywordsScore), 0, 15),
      formatting
    },
    skills: {
      required: uniqSorted(required),
      preferred: uniqSorted(preferred),
      matched: matchedSkills,
      missing: missingSkills
    },
    responsibilities: respItems,
    keywords: {
      important: uniqSorted(keywords),
      matched: uniqSorted(keywordMatched),
      missing: keywordMissing
    },
    tips
  }
}
