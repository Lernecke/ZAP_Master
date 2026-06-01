export interface ExtractedText {
  text: string
  pageCount?: number
  wordCount: number
}

/**
 * Extrahiert Text aus einer PDF- oder Word-Datei.
 * Läuft ausschliesslich serverseitig (Node.js).
 * Dynamische Imports verhindern dass Next.js die nativen Module beim Bundling auswertet.
 */
export async function extractTextFromBuffer(
  buffer: Buffer,
  fileType: string
): Promise<ExtractedText> {
  if (fileType === 'application/pdf') {
    // pdf-parse/lib/pdf-parse umgeht den automatischen Test-PDF-Load beim Import
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse/lib/pdf-parse') as (buffer: Buffer) => Promise<{ text: string; numpages: number }>
    const data = await pdfParse(buffer)
    const text = data.text.trim()
    return {
      text,
      pageCount: data.numpages,
      wordCount: text.split(/\s+/).filter(Boolean).length,
    }
  }

  if (
    fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileType === 'application/msword'
  ) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mammoth = require('mammoth') as typeof import('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    const text = result.value.trim()
    return {
      text,
      wordCount: text.split(/\s+/).filter(Boolean).length,
    }
  }

  throw new Error(`Nicht unterstütztes Dateiformat: ${fileType}`)
}
