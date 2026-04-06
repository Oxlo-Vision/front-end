import { useCallback, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { recognize } from 'tesseract.js'
import '../dashboard.css'

type AppState = 'idle' | 'processing' | 'done'
type ResultTab = 'summary' | 'keypoints' | 'markdown' | 'raw'

type ExtractedPdf = {
  pages: number
  ocrPages: number
  text: string
}

const PROCESSING_STEPS = [
  'Validando archivo PDF',
  'Leyendo paginas con PDF.js',
  'Aplicando OCR a paginas escaneadas',
  'Generando resumen con Oxlo',
  'Finalizando',
]

const RESULT_TABS: { id: ResultTab; label: string; icon: string }[] = [
  { id: 'summary', label: 'Resumen', icon: '📋' },
  { id: 'keypoints', label: 'Puntos Clave', icon: '🎯' },
  { id: 'markdown', label: 'Archivo .md', icon: '📝' },
  { id: 'raw', label: 'Texto extraido', icon: '📄' },
]

GlobalWorkerOptions.workerSrc = pdfWorkerUrl

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function simpleKeyPoints(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 55)
    .slice(0, 6)
}

function buildMarkdown(fileName: string, summary: string, points: string[]): string {
  const pointsMd = points.map((p) => `- ${p}`).join('\n')
  return `# Resumen - ${fileName}\n\n## Puntos clave\n${pointsMd || '- Sin puntos clave suficientes.'}\n\n## Resumen ejecutivo\n${summary}`
}

async function extractPdfText(file: File, onProgress: (stepIndex: number, progress: number, label: string) => void): Promise<ExtractedPdf> {
  onProgress(0, 5, PROCESSING_STEPS[0])
  const fileBuffer = await file.arrayBuffer()

  onProgress(1, 15, PROCESSING_STEPS[1])
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
      onProgress(1, baseProgress, `${PROCESSING_STEPS[1]} (pagina ${pageNum}/${pdf.numPages})`)
      continue
    }

    ocrPages += 1
    onProgress(2, baseProgress, `${PROCESSING_STEPS[2]} (pagina ${pageNum}/${pdf.numPages})`)

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

  const text = pagesText.join('\n\n').trim()
  return {
    pages: pdf.numPages,
    ocrPages,
    text,
  }
}

async function generateSummaryWithOxlo(text: string): Promise<string> {
  const backendUrl = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8080'
  const clippedText = text.slice(0, 14000)

  const response = await fetch(`${backendUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-v3.2',
      max_tokens: 700,
      messages: [
        {
          role: 'system',
          content: 'Eres un asistente que resume documentos tecnicos en espanol. Responde con claridad y precision.',
        },
        {
          role: 'user',
          content: `Resume este texto en espanol y agrega 5 puntos clave al final:\n\n${clippedText}`,
        },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error(`No se pudo generar resumen. HTTP ${response.status}`)
  }

  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content
  if (!content || typeof content !== 'string') {
    throw new Error('La respuesta del modelo no contiene texto util.')
  }
  return content.trim()
}

export default function Dashboard() {
  const [appState, setAppState] = useState<AppState>('idle')
  const [isDragging, setIsDragging] = useState(false)
  const [activeTab, setActiveTab] = useState<ResultTab>('summary')
  const [processStep, setProcessStep] = useState(0)
  const [processProgress, setProcessProgress] = useState(0)
  const [displayLabel, setDisplayLabel] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  const [fileSize, setFileSize] = useState(0)
  const [pages, setPages] = useState(0)
  const [ocrPages, setOcrPages] = useState(0)
  const [extractedText, setExtractedText] = useState('')
  const [summary, setSummary] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const keyPoints = useMemo(() => simpleKeyPoints(summary || extractedText), [summary, extractedText])
  const markdown = useMemo(() => buildMarkdown(fileName, summary, keyPoints), [fileName, summary, keyPoints])

  const processFile = useCallback(async (file: File) => {
    setErrorMessage(null)
    setAppState('processing')
    setProcessStep(0)
    setProcessProgress(0)
    setDisplayLabel(PROCESSING_STEPS[0])
    setFileName(file.name)
    setFileSize(file.size)

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('El archivo debe ser PDF.')
      setAppState('idle')
      return
    }

    try {
      const extracted = await extractPdfText(file, (step, progress, label) => {
        setProcessStep(step)
        setProcessProgress(progress)
        setDisplayLabel(label)
      })

      setPages(extracted.pages)
      setOcrPages(extracted.ocrPages)
      setExtractedText(extracted.text)

      if (!extracted.text || extracted.text.length < 40) {
        setSummary('No se pudo extraer suficiente texto del PDF. Prueba con un archivo de mejor calidad o mayor resolucion.')
        setProcessStep(4)
        setProcessProgress(100)
        setDisplayLabel(PROCESSING_STEPS[4])
        setAppState('done')
        return
      }

      setProcessStep(3)
      setProcessProgress(85)
      setDisplayLabel(PROCESSING_STEPS[3])

      try {
        const aiSummary = await generateSummaryWithOxlo(extracted.text)
        setSummary(aiSummary)
      } catch {
        const fallback = extracted.text.slice(0, 1400)
        setSummary(`Resumen local de respaldo:\n\n${fallback}${extracted.text.length > 1400 ? '...' : ''}`)
      }

      setProcessStep(4)
      setProcessProgress(100)
      setDisplayLabel(PROCESSING_STEPS[4])
      setAppState('done')
      setActiveTab('summary')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error inesperado procesando el PDF.'
      setErrorMessage(message)
      setAppState('idle')
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      void processFile(file)
    }
  }, [processFile])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)
  const handleFileClick = () => fileInputRef.current?.click()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      void processFile(file)
    }
  }

  const handleReset = () => {
    setAppState('idle')
    setProcessStep(0)
    setProcessProgress(0)
    setDisplayLabel('')
    setErrorMessage(null)
    setFileName('')
    setFileSize(0)
    setPages(0)
    setOcrPages(0)
    setExtractedText('')
    setSummary('')
    setActiveTab('summary')
  }

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      setErrorMessage('No se pudo copiar al portapapeles.')
    }
  }

  return (
    <div className="db-root">
      {/* ── Sidebar ── */}
      <aside className="db-sidebar">
        <div className="db-logo">
          <div className="db-logo-icon">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke="#05070A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span>Oxlo<b>Vision</b></span>
        </div>

        <nav className="db-nav">
          <div className="db-nav-label">Workspace</div>
          <a className="db-nav-item db-nav-item--active" href="#">
            <span>📄</span> Documentos
          </a>
          <a className="db-nav-item" href="#">
            <span>📊</span> Resultados
          </a>
          <a className="db-nav-item" href="#">
            <span>🕒</span> Historial
          </a>
          <div className="db-nav-label" style={{ marginTop: 24 }}>Configuración</div>
          <a className="db-nav-item" href="#">
            <span>⚙️</span> Ajustes
          </a>
          <a className="db-nav-item" href="#">
            <span>🔑</span> API Keys
          </a>
        </nav>

        <div className="db-sidebar-footer">
          <Link to="/" className="db-back-link">← Volver al inicio</Link>
          <div className="db-plan">
            <span className="db-plan-badge">BETA</span>
            Plan gratuito · 3/5 PDFs
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="db-main">
        {/* Topbar */}
        <header className="db-topbar">
          <div className="db-topbar-title">
            {appState === 'idle' && 'Nuevo analisis'}
            {appState === 'processing' && 'Procesando documento...'}
            {appState === 'done' && (
              <span>{fileName} <span className="db-done-badge">✓ Completado</span></span>
            )}
          </div>
          <div className="db-topbar-actions">
            {appState === 'done' && (
              <button className="db-btn-ghost" onClick={handleReset}>+ Nuevo PDF</button>
            )}
            <div className="db-avatar">FA</div>
          </div>
        </header>

        {/* Content */}
        <div className="db-content">

          {/* ── IDLE / DRAGGING state ── */}
          {appState === 'idle' && (
            <div className="db-upload-area">
              <div
                className={`dropzone ${isDragging ? 'dropzone--over' : ''}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={handleFileClick}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                <div className="dropzone__icon">
                  {isDragging ? '📂' : '📄'}
                </div>
                <h2 className="dropzone__title">
                  {isDragging ? 'Suelta tu PDF aqui' : 'Arrastra tu PDF aqui'}
                </h2>
                <p className="dropzone__sub">
                  {isDragging ? 'Listo para analizar' : 'o haz clic para seleccionar un archivo'}
                </p>
                {!isDragging && (
                  <button className="dropzone__btn">
                    Seleccionar PDF
                  </button>
                )}
                <p className="dropzone__hint">PDF hasta 50 MB · Max. 500 paginas</p>
              </div>

              {/* Format options */}
              <div className="format-options">
                <div className="format-title">¿Qué quieres generar?</div>
                <div className="format-grid">
                  {[
                    { icon: '📄', label: 'Extraccion texto PDF', checked: true },
                    { icon: '🔍', label: 'OCR para escaneados', checked: true },
                    { icon: '📋', label: 'Resumen IA', checked: true },
                    { icon: '🎯', label: 'Puntos clave', checked: true },
                    { icon: '📝', label: 'Salida Markdown', checked: true },
                    { icon: '🗺️', label: 'Mapa mental (proximo)', checked: false },
                  ].map(opt => (
                    <label className={`format-chip ${opt.checked ? 'format-chip--on' : ''}`} key={opt.label}>
                      <span>{opt.icon}</span>
                      <span>{opt.label}</span>
                      <span className={`format-check ${opt.checked ? 'format-check--on' : ''}`}>
                        {opt.checked ? '✓' : ''}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {errorMessage && (
                <div className="result-panel">
                  <div className="rp-header">
                    <h3>Error</h3>
                  </div>
                  <p className="rp-body">{errorMessage}</p>
                </div>
              )}
            </div>
          )}

          {/* ── PROCESSING state ── */}
          {appState === 'processing' && (
            <div className="db-processing">
              <div className="proc-card">
                <div className="proc-file">
                  <div className="proc-file-icon">📄</div>
                  <div>
                    <div className="proc-filename">{fileName || 'documento.pdf'}</div>
                    <div className="proc-meta">{formatBytes(fileSize)}</div>
                  </div>
                </div>

                <div className="proc-progress-wrap">
                  <div className="proc-bar-outer">
                    <div
                      className="proc-bar-fill"
                      style={{ width: `${processProgress}%` }}
                    />
                  </div>
                  <div className="proc-pct">{processProgress}%</div>
                </div>

                <div className="proc-label">
                  <span className="proc-spinner">⟳</span>
                  {displayLabel}<span className="proc-cursor">|</span>
                </div>

                <div className="proc-steps">
                  {PROCESSING_STEPS.map((label, i) => (
                    <div
                      key={label}
                      className={`proc-step ${
                        i < processStep ? 'proc-step--done' :
                        i === processStep ? 'proc-step--active' : ''
                      }`}
                    >
                      <span className="proc-step-dot" />
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── DONE / RESULTS state ── */}
          {appState === 'done' && (
            <div className="db-results">
              {/* File info bar */}
              <div className="results-info-bar">
                <div className="results-file">
                  <span className="results-file-icon">📄</span>
                  <div>
                    <div className="results-filename">{fileName}</div>
                    <div className="results-meta">{formatBytes(fileSize)} · {pages} paginas · OCR en {ocrPages} paginas</div>
                  </div>
                </div>
                <button className="db-btn-ghost" onClick={handleReset}>+ Nuevo PDF</button>
              </div>

              {/* Tabs */}
              <div className="results-tabs">
                {RESULT_TABS.map(tab => (
                  <button
                    key={tab.id}
                    className={`results-tab ${activeTab === tab.id ? 'results-tab--active' : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <span>{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="results-body">
                {activeTab === 'summary' && (
                  <div className="result-panel">
                    <div className="rp-header">
                      <h3>Resumen ejecutivo</h3>
                      <button className="rp-copy" onClick={() => void copyToClipboard(summary)}>Copiar</button>
                    </div>
                    <p className="rp-meta">Generado desde texto extraido de PDF y OCR</p>
                    <div className="rp-body">
                      {summary.split('\n').filter(Boolean).map((line, index) => (
                        <p key={index}>{line}</p>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'keypoints' && (
                  <div className="result-panel">
                    <div className="rp-header">
                      <h3>Puntos clave</h3>
                      <button className="rp-copy" onClick={() => void copyToClipboard(keyPoints.join('\n'))}>Copiar</button>
                    </div>
                    <div className="keypoints-grid">
                      <div className="kp-category">
                        <div className="kp-cat-header">
                          <span>🎯</span>
                          <span>Hallazgos</span>
                        </div>
                        <ul>
                          {keyPoints.length === 0 && <li>No hay suficientes frases para generar puntos clave.</li>}
                          {keyPoints.map((item, index) => (
                            <li key={index}>
                              <span className="kp-bullet" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'markdown' && (
                  <div className="result-panel markdownp">
                    <div className="rp-header">
                      <h3>Archivo .md</h3>
                      <button className="rp-copy" onClick={() => void copyToClipboard(markdown)}>Copiar</button>
                    </div>
                    <p className="rp-meta">Salida markdown para usar con asistentes de IA</p>
                    <div className="md-preview">
                      <div className="md-header">
                        <span className="code-dot" style={{ background: '#ff5f56' }} />
                        <span className="code-dot" style={{ background: '#ffbd2e' }} />
                        <span className="code-dot" style={{ background: '#27c93f' }} />
                        <span className="md-filename">output.md</span>
                      </div>
                      <pre className="md-body"><code>{markdown}</code></pre>
                    </div>
                  </div>
                )}

                {activeTab === 'raw' && (
                  <div className="result-panel markdownp">
                    <div className="rp-header">
                      <h3>Texto extraido</h3>
                      <button className="rp-copy" onClick={() => void copyToClipboard(extractedText)}>Copiar</button>
                    </div>
                    <p className="rp-meta">Fuente completa para depuracion y QA de extraccion</p>
                    <div className="md-preview">
                      <div className="md-header">
                        <span className="code-dot" style={{ background: '#ff5f56' }} />
                        <span className="code-dot" style={{ background: '#ffbd2e' }} />
                        <span className="code-dot" style={{ background: '#27c93f' }} />
                        <span className="md-filename">raw-text.txt</span>
                      </div>
                      <pre className="md-body"><code>{extractedText || 'Sin texto extraido.'}</code></pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
