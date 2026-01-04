import { env } from '../env'

export type LlmGenerateParams = {
  prompt: string
  temperature?: number
}

export type LlmClient = {
  generateText(params: LlmGenerateParams): Promise<string>
}

export function getGeminiClient(): LlmClient | null {
  if (!env.GEMINI_API_KEY) return null

  // Dynamic import so TypeScript can compile even before dependencies are installed.
  // You still must run `npm install` for runtime.
  return {
    async generateText({ prompt, temperature }: LlmGenerateParams): Promise<string> {
      const mod: any = await import('@google/generative-ai')
      const GoogleGenerativeAI: any = mod?.GoogleGenerativeAI ?? mod?.default?.GoogleGenerativeAI
      if (typeof GoogleGenerativeAI !== 'function') {
        throw new Error('Gemini SDK not available. Run `npm install` in backend/.')
      }

      const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY)
      const model = genAI.getGenerativeModel({ model: env.GEMINI_MODEL })

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: typeof temperature === 'number' ? temperature : undefined
        }
      })

      return (result?.response?.text?.() ?? '').trim()
    }
  }
}

function stripCodeFences(text: string): string {
  const trimmed = text.trim()
  // ```json ... ``` or ``` ... ```
  const fenced = trimmed.match(/^```(?:json)?\s*\n([\s\S]*?)\n```\s*$/i)
  return fenced ? fenced[1].trim() : trimmed
}

export async function generateJsonWithGemini<T = unknown>(
  client: LlmClient,
  params: LlmGenerateParams
): Promise<T> {
  const raw = await client.generateText(params)
  const cleaned = stripCodeFences(raw)
  try {
    return JSON.parse(cleaned) as T
  } catch {
    // Keep raw output for server logs; bubble a safe error.
    console.error('[gemini] non-JSON output:', raw)
    throw new Error('AI returned non-JSON output')
  }
}
