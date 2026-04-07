import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist'
import PdfJsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?worker'
import { recognize } from 'tesseract.js'

export type ExtractedPdf = {
  pages: number
  ocrPages: number
  text: string
}

let workerConfigured = false
let pdfJsWorker: Worker | null = null

function ensurePdfWorkerConfigured(): void {
  if (!workerConfigured) {
    pdfJsWorker = new PdfJsWorker()
    GlobalWorkerOptions.workerPort = pdfJsWorker
    workerConfigured = true
  }
}

export async function extractPdfText(
  file: File,
  onProgress: (stepIndex: number, progress: number, label: string) => void,
  steps: string[],
): Promise<ExtractedPdf> {
  ensurePdfWorkerConfigured()

  onProgress(0, 5, steps[0])
  const fileBuffer = await file.arrayBuffer()

  onProgress(1, 15, steps[1])
  const loadingTask = getDocument({ data: fileBuffer })
  const pdf = await loadingTask.promise

  const pagesText: string[] = []
  let ocrPages = 0

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
    const page = await pdf.getPage(pageNum)
    const textContent = await page.getTextContent()
    const pageText = (textContent.items as Array<{ str?: string }>)
      .map((item) => item.str ?? '')
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()

    const baseProgress = 15 + Math.round((pageNum / pdf.numPages) * 50)

    if (pageText.length > 25) {
      pagesText.push(pageText)
      onProgress(1, baseProgress, `${steps[1]} (page ${pageNum}/${pdf.numPages})`)
      continue
    }

    ocrPages += 1
    onProgress(2, baseProgress, `${steps[2]} (page ${pageNum}/${pdf.numPages})`)

    const viewport = page.getViewport({ scale: 2 })
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    const context = canvas.getContext('2d')

    if (!context) {
      pagesText.push('')
      continue
    }

    await page.render({ canvas, canvasContext: context, viewport }).promise
    const ocrResult = await recognize(canvas, 'eng')
    pagesText.push(ocrResult.data.text.replace(/\s+/g, ' ').trim())
  }

  return {
    pages: pdf.numPages,
    ocrPages,
    text: pagesText.join('\n\n').trim(),
  }
}
