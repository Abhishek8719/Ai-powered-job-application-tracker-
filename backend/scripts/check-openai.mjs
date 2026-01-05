import dotenv from 'dotenv'
import path from 'node:path'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const key = process.env.OPENAI_API_KEY ?? ''
const model = process.env.OPENAI_MODEL ?? '(default)'

console.log('OPENAI_API_KEY loaded:', Boolean(key))
console.log('OPENAI_API_KEY looksLikeSk:', key.startsWith('sk-'))
console.log('OPENAI_API_KEY length:', key.length)
console.log('OPENAI_MODEL:', model)

if (!key) {
  console.error('Missing OPENAI_API_KEY in backend/.env')
  process.exit(2)
}


console.log('This project is configured for Gemini-only now.')
console.log('Use GEMINI_API_KEY in backend/.env and remove OPENAI_* keys.')
process.exit(0)
