import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import type { IconType } from 'react-icons'
import {
  FiAlertTriangle,
  FiCheck,
  FiChevronDown,
  FiFileText,
  FiGitBranch,
  FiList,
  FiMap,
  FiTarget,
  FiX,
  FiUploadCloud,
} from 'react-icons/fi'
import '../dashboard.css'
import { extractPdfText, type ExtractedPdf } from '../features/pdf/extractPdfText'
import {
  chatAboutPdfWithOxlo,
  generateConceptMapWithOxlo,
  generateMindMapWithOxlo,
  generateSummaryWithOxlo,
  getChatModelOptions,
  type ChatModelOption,
} from '../features/oxlo/chat'
import { MindMapPanel } from '../features/mindmap/components/MindMapPanel'
import { buildMarkdown, fallbackMindMap, mindMapToFlow, simpleKeyPoints } from '../features/mindmap/utils'
import type { MindMapData } from '../features/mindmap/types'
import { ConceptMapPanel } from '../features/conceptmap/components/ConceptMapPanel'
import { conceptMapToFlow, fallbackConceptMap } from '../features/conceptmap/utils'
import type { ConceptMapData } from '../features/conceptmap/types'

type AppState = 'idle' | 'processing' | 'done'
type ResultTab = 'summary' | 'mindmap' | 'conceptmap' | 'keypoints' | 'markdown' | 'raw'
type ChatMessage = { role: 'user' | 'assistant'; content: string }

const CHAT_TIMEOUT_FRIENDLY_MESSAGE = 'Ahora mismo estamos con mucha demanda en oxlo.ai y no llegamos a responder a tiempo. Intenta de nuevo en unos segundos o usa un modelo mas ligero.'

function getModelTier(strengthScore: number): { label: string; tone: 'light' | 'balanced' | 'pro' } {
  if (strengthScore < 700) return { label: 'Ligero', tone: 'light' }
  if (strengthScore < 2200) return { label: 'Balanceado', tone: 'balanced' }
  return { label: 'Potente', tone: 'pro' }
}

const PROCESSING_STEPS = [
  'Validando archivo PDF',
  'Leyendo páginas con PDF.js',
  'Aplicando OCR a páginas escaneadas',
  'Generando resumen con Oxlo',
  'Generando mapa mental',
  'Generando mapa conceptual',
  'Finalizando',
]

const RESULT_TABS: { id: ResultTab; label: string; icon: IconType }[] = [
  { id: 'summary',    label: 'Resumen',         icon: FiFileText },
  { id: 'mindmap',    label: 'Mapa Mental',     icon: FiGitBranch },
  { id: 'conceptmap', label: 'Mapa Conceptual', icon: FiMap },
  { id: 'keypoints',  label: 'Puntos Clave',    icon: FiTarget },
  { id: 'markdown',   label: 'Archivo .md',     icon: FiList },
  { id: 'raw',        label: 'Texto extraído',  icon: FiFileText },
]

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Logo SVG reutilizable
const LogoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <path
      d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
      stroke="#05070A"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export default function Dashboard() {
  const [appState, setAppState]           = useState<AppState>('idle')
  const [isDragging, setIsDragging]       = useState(false)
  const [activeTab, setActiveTab]         = useState<ResultTab>('summary')
  const [processStep, setProcessStep]     = useState(0)
  const [processProgress, setProcessProgress] = useState(0)
  const [displayLabel, setDisplayLabel]   = useState('')
  const [errorMessage, setErrorMessage]   = useState<string | null>(null)
  const [copyFeedback, setCopyFeedback]   = useState<string | null>(null)

  const [fileName, setFileName]           = useState('')
  const [fileSize, setFileSize]           = useState(0)
  const [pages, setPages]                 = useState(0)
  const [ocrPages, setOcrPages]           = useState(0)
  const [extractedText, setExtractedText] = useState('')
  const [summary, setSummary]             = useState('')
  const [mindMap, setMindMap]             = useState<MindMapData | null>(null)
  const [conceptMap, setConceptMap]       = useState<ConceptMapData | null>(null)
  const [chatMessages, setChatMessages]   = useState<ChatMessage[]>([])
  const [chatInput, setChatInput]         = useState('')
  const [chatSending, setChatSending]     = useState(false)
  const [chatModelOptions, setChatModelOptions] = useState<ChatModelOption[]>([])
  const [selectedChatModel, setSelectedChatModel] = useState('')
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatThreadRef = useRef<HTMLDivElement>(null)
  const modelMenuRef = useRef<HTMLDivElement>(null)

  const keyPoints   = useMemo(() => simpleKeyPoints(summary || extractedText), [summary, extractedText])
  const markdown    = useMemo(() => buildMarkdown(fileName, summary, keyPoints), [fileName, summary, keyPoints])
  const selectedModelMeta = useMemo(() => {
    if (!selectedChatModel) return null
    return chatModelOptions.find((option) => option.model === selectedChatModel) ?? null
  }, [chatModelOptions, selectedChatModel])
  const selectedModelRank = useMemo(() => {
    if (!selectedModelMeta) return null
    const index = chatModelOptions.findIndex((option) => option.model === selectedModelMeta.model)
    return index >= 0 ? index + 1 : null
  }, [chatModelOptions, selectedModelMeta])

  const mindMapFlow = useMemo(() => {
    if (!mindMap) return { nodes: [], edges: [] }
    return mindMapToFlow(mindMap)
  }, [mindMap])

  const conceptMapFlow = useMemo(() => {
    if (!conceptMap) return { nodes: [], edges: [] }
    return conceptMapToFlow(conceptMap)
  }, [conceptMap])

  useEffect(() => {
    if (appState !== 'done' || extractedText.length < 40) return

    let cancelled = false

    const loadModels = async () => {
      const options = await getChatModelOptions()
      if (cancelled) return
      setChatModelOptions(options)
      if (!selectedChatModel && options.length > 0) {
        const preferred = options.find((option) => option.model === 'deepseek-v3.2')
        setSelectedChatModel(preferred?.model ?? options[0].model)
      }
    }

    void loadModels()

    return () => {
      cancelled = true
    }
  }, [appState, extractedText, selectedChatModel])

  useEffect(() => {
    const thread = chatThreadRef.current
    if (!thread) return
    thread.scrollTop = thread.scrollHeight
  }, [chatMessages, chatSending])

  useEffect(() => {
    if (!isModelMenuOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (!modelMenuRef.current?.contains(target)) {
        setIsModelMenuOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsModelMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isModelMenuOpen])

  // ── helpers ────────────────────────────────────────────────────
  const applyExtractionState = (extracted: ExtractedPdf): void => {
    setPages(extracted.pages)
    setOcrPages(extracted.ocrPages)
    setExtractedText(extracted.text)
  }

  const runFallbackMode = (file: File, extracted: ExtractedPdf): void => {
    const fallbackText    = extracted.text.slice(0, 1400)
    const fallbackSummary = `Resumen local de respaldo:\n\n${fallbackText}${extracted.text.length > 1400 ? '…' : ''}`
    const points          = simpleKeyPoints(extracted.text)
    const localMindMap    = fallbackMindMap(file.name, fallbackSummary, points)
    const localConceptMap = fallbackConceptMap(file.name, fallbackSummary, points)

    setSummary(fallbackSummary)
    setMindMap(localMindMap)
    setConceptMap(localConceptMap)
  }

  // ── processing ─────────────────────────────────────────────────
  const processFile = useCallback(async (file: File) => {
    setErrorMessage(null)
    setAppState('processing')
    setProcessStep(0)
    setProcessProgress(0)
    setDisplayLabel(PROCESSING_STEPS[0])
    setFileName(file.name)
    setFileSize(file.size)

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('El archivo debe ser un PDF válido.')
      setAppState('idle')
      return
    }

    try {
      const extracted = await extractPdfText(
        file,
        (step, progress, label) => {
          setProcessStep(step)
          setProcessProgress(progress)
          setDisplayLabel(label)
        },
        PROCESSING_STEPS
      )

      applyExtractionState(extracted)

      if (!extracted.text || extracted.text.length < 40) {
        runFallbackMode(file, extracted)
        setProcessStep(6); setProcessProgress(100)
        setDisplayLabel(PROCESSING_STEPS[6])
        setAppState('done'); setActiveTab('summary')
        return
      }

      setProcessStep(3); setProcessProgress(82)
      setDisplayLabel(PROCESSING_STEPS[3])

      try {
        const aiSummary = await generateSummaryWithOxlo(extracted.text)
        setSummary(aiSummary)

        setProcessStep(4); setProcessProgress(90)
        setDisplayLabel(PROCESSING_STEPS[4])

        try {
          const aiMindMap = await generateMindMapWithOxlo(file.name, extracted.text, aiSummary)
          setMindMap(aiMindMap)
        } catch {
          setMindMap(fallbackMindMap(file.name, aiSummary, simpleKeyPoints(aiSummary)))
        }

        setProcessStep(5); setProcessProgress(96)
        setDisplayLabel(PROCESSING_STEPS[5])

        try {
          const aiConceptMap = await generateConceptMapWithOxlo(file.name, extracted.text, aiSummary)
          setConceptMap(aiConceptMap)
        } catch {
          setConceptMap(fallbackConceptMap(file.name, aiSummary, simpleKeyPoints(aiSummary)))
        }
      } catch (summaryError) {
        runFallbackMode(file, extracted)
      }

      setProcessStep(6); setProcessProgress(100)
      setDisplayLabel(PROCESSING_STEPS[6])
      setAppState('done'); setActiveTab('summary')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error inesperado procesando el PDF.'
      setErrorMessage(message)
      setAppState('idle')
    }
  }, [])

  // ── drag & drop ────────────────────────────────────────────────
  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    setIsDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (file) void processFile(file)
  }, [processFile])

  const handleDragOver  = (event: React.DragEvent) => { event.preventDefault(); setIsDragging(true) }
  const handleDragLeave = () => setIsDragging(false)
  const handleFileClick = () => fileInputRef.current?.click()
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) void processFile(file)
  }

  // ── reset ──────────────────────────────────────────────────────
  const handleReset = () => {
    setAppState('idle'); setProcessStep(0); setProcessProgress(0)
    setDisplayLabel(''); setErrorMessage(null)
    setFileName(''); setFileSize(0); setPages(0); setOcrPages(0)
    setExtractedText(''); setSummary('')
    setMindMap(null); setConceptMap(null); setActiveTab('summary')
    setChatMessages([]); setChatInput(''); setChatSending(false)
    setChatModelOptions([]); setSelectedChatModel('')
    // Limpiar input file para que se pueda subir el mismo archivo de nuevo
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const sendChatMessage = async () => {
    const question = chatInput.trim()
    if (!question || chatSending || !selectedChatModel || appState !== 'done') return

    setChatInput('')
    setChatSending(true)
    setChatMessages((prev) => [...prev, { role: 'user', content: question }])

    try {
      const response = await chatAboutPdfWithOxlo({
        model: selectedChatModel,
        question,
        fileName,
        extractedText,
        summary,
        keyPoints,
      })
      setChatMessages((prev) => [...prev, { role: 'assistant', content: response }])
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo completar la respuesta.'
      const timeoutHints = [
        '504',
        'Gateway Timeout',
        'tardo demasiado',
        'Tiempo de espera agotado',
      ]
      const isTimeout = timeoutHints.some((hint) => message.includes(hint))

      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: isTimeout
            ? CHAT_TIMEOUT_FRIENDLY_MESSAGE
            : `No pude responder con ese modelo. Detalle: ${message}`,
        },
      ])
    } finally {
      setChatSending(false)
    }
  }

  // ── clipboard + download ───────────────────────────────────────
  const showCopyFeedback = (label: string) => {
    setCopyFeedback(label)
    setTimeout(() => setCopyFeedback(null), 2000)
  }

  const copyToClipboard = async (value: string, label = 'Copiado') => {
    try {
      await navigator.clipboard.writeText(value)
      showCopyFeedback(label)
    } catch {
      setErrorMessage('No se pudo copiar al portapapeles.')
    }
  }

  const downloadMarkdown = () => {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = fileName.replace(/\.pdf$/i, '') + '_oxlo.md'
    a.click()
    URL.revokeObjectURL(url)
  }

  const quickPrompts = [
    'Resume este PDF en 5 bullets accionables.',
    'Que partes son mas importantes para estudiar?',
    'Detecta contradicciones o errores potenciales.',
    'Genera 6 preguntas tipo examen con respuestas.',
  ]

  const selectedModelName = selectedModelMeta?.displayName ?? 'Selecciona un modelo'
  const selectedModelCategory = selectedModelMeta?.category ?? 'Sin categoria'

  // ── render ─────────────────────────────────────────────────────
  return (
    <div className="db-root">
      {/* ── Sidebar ── */}
      <aside className="db-sidebar">
        <div className="db-logo">
          <div className="db-logo-icon">
            <LogoIcon />
          </div>
          <span>Oxlo<b>Vision</b></span>
        </div>

        <nav className="db-nav">
          <div className="db-nav-label">Workspace</div>
          {/* Único item funcional: el documento activo */}
          <div className="db-nav-item db-nav-item--active">
            <span><FiFileText /></span>
            {appState === 'idle'       && 'Nuevo análisis'}
            {appState === 'processing' && 'Procesando…'}
            {appState === 'done'       && (fileName || 'Documento')}
          </div>
        </nav>

        <div className="db-sidebar-footer">
          <Link to="/" className="db-back-link">← Volver al inicio</Link>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="db-main">
        {/* ── Topbar ── */}
        <header className="db-topbar">
          <div className="db-topbar-title">
            {appState === 'idle'       && 'Nuevo análisis'}
            {appState === 'processing' && 'Procesando documento…'}
            {appState === 'done'       && <span className="db-topbar-filename">{fileName}</span>}
          </div>

          <div className="db-topbar-actions">
            {copyFeedback && (
              <span className="db-copy-toast">{copyFeedback} ✓</span>
            )}
            {appState === 'done' && (
              <button className="db-btn-ghost" onClick={handleReset}>
                + Nuevo PDF
              </button>
            )}
          </div>
        </header>

        {/* ── Content ── */}
        <div className="db-content">

          {/* ── IDLE: drop zone ── */}
          {appState === 'idle' && (
            <div className="db-upload-area">
              <div
                className={`dropzone ${isDragging ? 'dropzone--over' : ''}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={handleFileClick}
                role="button"
                tabIndex={0}
                aria-label="Zona para soltar archivo PDF"
                onKeyDown={(e) => e.key === 'Enter' && handleFileClick()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                <div className="dropzone__icon">{isDragging ? <FiUploadCloud /> : <FiFileText />}</div>
                <h2 className="dropzone__title">
                  {isDragging ? 'Suelta el PDF aquí' : 'Analiza tu PDF con IA'}
                </h2>
                <p className="dropzone__sub">
                  {isDragging
                    ? 'Listo para analizar'
                    : 'Arrastra un archivo o haz clic para seleccionarlo'}
                </p>
                {!isDragging && (
                  <button className="dropzone__btn" onClick={(e) => { e.stopPropagation(); handleFileClick() }}>
                    Seleccionar PDF
                  </button>
                )}
                <p className="dropzone__hint">PDF · hasta 50 MB · máximo 500 páginas</p>
              </div>

              {errorMessage && (
                <div className="db-error-banner">
                  <span><FiAlertTriangle /></span>
                  <span>{errorMessage}</span>
                  <button onClick={() => setErrorMessage(null)} className="db-error-close"><FiX /></button>
                </div>
              )}
            </div>
          )}

          {/* ── PROCESSING ── */}
          {appState === 'processing' && (
            <div className="db-processing">
              <div className="proc-card">
                <div className="proc-file">
                  <div className="proc-file-icon"><FiFileText /></div>
                  <div>
                    <div className="proc-filename">{fileName || 'documento.pdf'}</div>
                    <div className="proc-meta">{formatBytes(fileSize)}</div>
                  </div>
                </div>

                <div className="proc-progress-wrap">
                  <div className="proc-bar-outer">
                    <div className="proc-bar-fill" style={{ width: `${processProgress}%` }} />
                  </div>
                  <div className="proc-pct">{processProgress}%</div>
                </div>

                <div className="proc-label">
                  <span className="proc-spinner">⟳</span>
                  {displayLabel}
                  <span className="proc-cursor">|</span>
                </div>

                <div className="proc-steps">
                  {PROCESSING_STEPS.map((label, index) => (
                    <div
                      key={label}
                      className={`proc-step ${
                        index < processStep
                          ? 'proc-step--done'
                          : index === processStep
                          ? 'proc-step--active'
                          : ''
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

          {/* ── DONE: results ── */}
          {appState === 'done' && (
            <div className="db-results-layout">
              <div className="db-results db-results-main">
              {/* Info bar */}
              <div className="results-info-bar">
                <div className="results-file">
                  <span className="results-file-icon"><FiFileText /></span>
                  <div>
                    <div className="results-filename">{fileName}</div>
                    <div className="results-meta">
                      {formatBytes(fileSize)}
                      {pages > 0 && ` · ${pages} página${pages !== 1 ? 's' : ''}`}
                      {ocrPages > 0 && ` · OCR en ${ocrPages} página${ocrPages !== 1 ? 's' : ''}`}
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="results-tabs" role="tablist">
                {RESULT_TABS.map((tab) => (
                  (() => {
                    const TabIcon = tab.icon
                    return (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={activeTab === tab.id}
                    className={`results-tab ${activeTab === tab.id ? 'results-tab--active' : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    <span><TabIcon /></span>{tab.label}
                  </button>
                    )
                  })()
                ))}
              </div>

              {/* Panel content */}
              <div className="results-body" role="tabpanel">

                {/* Resumen */}
                {activeTab === 'summary' && (
                  <div className="result-panel">
                    <div className="rp-header">
                      <h3>Resumen ejecutivo</h3>
                      <button className="rp-copy" onClick={() => void copyToClipboard(summary, '¡Resumen copiado!')}>
                        Copiar
                      </button>
                    </div>
                    <p className="rp-meta">Generado desde el texto extraído del PDF</p>
                    <div className="rp-body">
                      {summary.split('\n').filter(Boolean).map((line, index) => (
                        <p key={index}>{line}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mapa Mental */}
                {activeTab === 'mindmap' && (
                  <MindMapPanel
                    mindMap={mindMap}
                    flow={mindMapFlow}
                    onCopyJson={() => void copyToClipboard(JSON.stringify(mindMap, null, 2), '¡JSON copiado!')}
                  />
                )}

                {/* Mapa Conceptual */}
                {activeTab === 'conceptmap' && (
                  <ConceptMapPanel
                    conceptMap={conceptMap}
                    flow={conceptMapFlow}
                    onCopyJson={() => void copyToClipboard(JSON.stringify(conceptMap, null, 2), '¡JSON copiado!')}
                  />
                )}

                {/* Puntos Clave */}
                {activeTab === 'keypoints' && (
                  <div className="result-panel">
                    <div className="rp-header">
                      <h3>Puntos clave</h3>
                      <button className="rp-copy" onClick={() => void copyToClipboard(keyPoints.join('\n'), '¡Puntos copiados!')}>
                        Copiar
                      </button>
                    </div>
                    <p className="rp-meta">Frases principales extraídas del documento</p>
                    <div className="keypoints-grid">
                      <div className="kp-category">
                        <div className="kp-cat-header"><span><FiTarget /></span><span>Hallazgos principales</span></div>
                        <ul>
                          {keyPoints.length === 0
                            ? <li><span className="kp-bullet" />No se encontraron frases suficientemente largas.</li>
                            : keyPoints.map((item, index) => (
                                <li key={index}><span className="kp-bullet" />{item}</li>
                              ))
                          }
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Markdown */}
                {activeTab === 'markdown' && (
                  <div className="result-panel">
                    <div className="rp-header">
                      <h3>Archivo .md</h3>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="rp-copy rp-download" onClick={downloadMarkdown}>
                          ↓ Descargar
                        </button>
                        <button className="rp-copy" onClick={() => void copyToClipboard(markdown, '¡Markdown copiado!')}>
                          Copiar
                        </button>
                      </div>
                    </div>
                    <p className="rp-meta">Markdown optimizado para usar como contexto en asistentes de IA</p>
                    <div className="md-preview">
                      <div className="md-header">
                        <span className="code-dot" style={{ background: '#ff5f56' }} />
                        <span className="code-dot" style={{ background: '#ffbd2e' }} />
                        <span className="code-dot" style={{ background: '#27c93f' }} />
                        <span className="md-filename">
                          {fileName.replace(/\.pdf$/i, '')}_oxlo.md
                        </span>
                      </div>
                      <pre className="md-body"><code>{markdown}</code></pre>
                    </div>
                  </div>
                )}

                {/* Texto extraído */}
                {activeTab === 'raw' && (
                  <div className="result-panel">
                    <div className="rp-header">
                      <h3>Texto extraído</h3>
                      <button className="rp-copy" onClick={() => void copyToClipboard(extractedText, '¡Texto copiado!')}>
                        Copiar
                      </button>
                    </div>
                    <p className="rp-meta">
                      Fuente completa del PDF · {extractedText.length.toLocaleString()} caracteres
                      {ocrPages > 0 && ` · ${ocrPages} página${ocrPages !== 1 ? 's' : ''} vía OCR`}
                    </p>
                    <div className="md-preview">
                      <div className="md-header">
                        <span className="code-dot" style={{ background: '#ff5f56' }} />
                        <span className="code-dot" style={{ background: '#ffbd2e' }} />
                        <span className="code-dot" style={{ background: '#27c93f' }} />
                        <span className="md-filename">raw-text.txt</span>
                      </div>
                      <pre className="md-body"><code>{extractedText || 'Sin texto extraído.'}</code></pre>
                    </div>
                  </div>
                )}

              </div>
            </div>

              <aside className="db-chat-sidebar" aria-label="Oxlo Chat">
                <div className="db-chat-card">
                  <div className="db-chat-head">
                    <h3>Oxlo Chat</h3>
                    <span className="db-chat-sub">Contexto del documento cargado</span>
                  </div>

                  <div className="chat-model-row">
                    <label htmlFor="chat-model-trigger">Modelo IA (debil → fuerte)</label>
                    <div className="chat-model-shell" ref={modelMenuRef}>
                      <button
                        id="chat-model-trigger"
                        type="button"
                        className={`chat-model-trigger ${isModelMenuOpen ? 'chat-model-trigger--open' : ''}`}
                        onClick={() => {
                          if (chatModelOptions.length > 0) {
                            setIsModelMenuOpen((prev) => !prev)
                          }
                        }}
                        aria-haspopup="listbox"
                        aria-expanded={isModelMenuOpen}
                        aria-label="Selector de modelo IA"
                        disabled={chatModelOptions.length === 0}
                      >
                        <span className="chat-model-trigger-main">{selectedModelName}</span>
                        <span className="chat-model-trigger-sub">{selectedModelCategory}</span>
                        <span className="chat-model-trigger-icon" aria-hidden="true"><FiChevronDown /></span>
                      </button>

                      {isModelMenuOpen && chatModelOptions.length > 0 && (
                        <div className="chat-model-menu" role="listbox" aria-label="Modelos IA disponibles">
                          {chatModelOptions.map((option, index) => {
                            const isSelected = selectedChatModel === option.model
                            return (
                              <button
                                key={option.model}
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                className={`chat-model-option ${isSelected ? 'chat-model-option--active' : ''}`}
                                onClick={() => {
                                  setSelectedChatModel(option.model)
                                  setIsModelMenuOpen(false)
                                }}
                              >
                                <span className="chat-model-option-name">{option.displayName}</span>
                                <span className="chat-model-option-meta">{option.category} · #{index + 1}</span>
                                <span className="chat-model-option-check" aria-hidden="true">
                                  {isSelected ? <FiCheck /> : null}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {selectedModelMeta && (
                      <div className="chat-model-meta" aria-live="polite">
                        <span className={`chat-model-tier chat-model-tier--${getModelTier(selectedModelMeta.strengthScore).tone}`}>
                          {getModelTier(selectedModelMeta.strengthScore).label}
                        </span>
                        <span className="chat-model-meta-text">
                          {selectedModelMeta.displayName} · {selectedModelMeta.category}
                        </span>
                        {selectedModelRank && (
                          <span className="chat-model-rank">
                            {selectedModelRank} / {chatModelOptions.length}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="chat-quick-prompts">
                    {quickPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        className="chat-prompt-chip"
                        onClick={() => setChatInput(prompt)}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>

                  <div className="chat-thread" ref={chatThreadRef}>
                    {chatMessages.length === 0 && (
                      <div className="chat-empty">Haz una pregunta sobre el PDF para empezar.</div>
                    )}

                    {chatMessages.map((message, index) => (
                      <div key={`${message.role}-${index}`} className={`chat-message chat-message--${message.role}`}>
                        <div className="chat-message-role">{message.role === 'user' ? 'Tu' : 'Oxlo'}</div>
                        <div className="chat-message-text">{message.content}</div>
                      </div>
                    ))}

                    {chatSending && (
                      <div className="chat-message chat-message--assistant">
                        <div className="chat-message-role">Oxlo</div>
                        <div className="chat-message-text">Pensando respuesta...</div>
                      </div>
                    )}
                  </div>

                  <div className="chat-input-row">
                    <textarea
                      className="chat-input"
                      value={chatInput}
                      placeholder="Pregunta sobre el PDF..."
                      onChange={(event) => setChatInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                          event.preventDefault()
                          void sendChatMessage()
                        }
                      }}
                    />
                    <button
                      className="chat-send"
                      onClick={() => void sendChatMessage()}
                      disabled={chatSending || !selectedChatModel || chatInput.trim().length === 0}
                    >
                      Enviar
                    </button>
                  </div>
                </div>
              </aside>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
