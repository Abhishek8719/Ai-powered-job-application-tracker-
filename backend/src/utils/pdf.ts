type PdfParseFn = (data: Buffer) => Promise<{ text?: string | null }>

let cachedParse: PdfParseFn | null = null
let initPromise: Promise<void> | null = null

async function ensureParserLoaded(): Promise<void> {
  if (cachedParse) return
  if (initPromise) return initPromise

  initPromise = (async () => {
    // pdf-parse may be ESM-only in newer setups; dynamic import works in both CJS+ESM.
    // Note: pdf-parse v2.x exports a PDFParse class (no default export).
    let mod: any
    try {
      mod = await import('pdf-parse')
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error('[pdf] failed to import pdf-parse:', message)
      cachedParse = null
      return
    }

    const candidate: any = mod?.default ?? mod
    const parse: PdfParseFn | null =
      typeof candidate === 'function'
        ? candidate
        : typeof candidate?.default === 'function'
          ? candidate.default
          : typeof mod?.default?.default === 'function'
            ? mod.default.default
            : typeof mod?.PDFParse === 'function'
              ? async (data: Buffer) => {
                  const parser = new mod.PDFParse({ data })
                  try {
                    const result = await parser.getText()
                    return { text: (result?.text ?? '').toString() }
                  } finally {
                    // Best-effort cleanup; failures should not mask parse errors.
                    await parser.destroy().catch(() => undefined)
                  }
                }
              : null

    if (!parse) {
      const keys = (obj: any) => (obj && typeof obj === 'object' ? Object.keys(obj) : [])
      console.error('[pdf] pdf-parse module shape unexpected', {
        typeofMod: typeof mod,
        modKeys: keys(mod),
        typeofDefault: typeof mod?.default,
        defaultKeys: keys(mod?.default),
        typeofPDFParse: typeof mod?.PDFParse
      })
      cachedParse = null
      return
    }

    cachedParse = parse
  })()

  return initPromise
}

export async function extractPdfText(buffer: Buffer): Promise<string> {
  await ensureParserLoaded()
  const parse = cachedParse
  if (!parse) throw new Error('PDF: PDF parser is not available in this runtime.')
  try {
    const data = await parse(buffer)
    return (data.text ?? '').trim()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    // Keep details in server logs; return a safe message to the client.
    console.error('[pdf] extractPdfText failed:', message)
    const lower = message.toLowerCase()

    if (lower.includes('password') || lower.includes('passwordexception')) {
      throw new Error('PDF: This PDF is password-protected. Remove the password and upload again.')
    }

    if (lower.includes('invalidpdf') || lower.includes('invalid pdf') || lower.includes('corrupt') || lower.includes('xref')) {
      throw new Error('PDF: This PDF looks corrupted/unsupported. Re-export it as a standard PDF and try again.')
    }

    throw new Error('PDF: Failed to read this PDF. Please re-export it as a standard PDF and upload again.')
  }
}
