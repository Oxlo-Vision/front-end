import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import '../dashboard.css'
import { extractPdfText, type ExtractedPdf } from '../features/pdf/extractPdfText'
import {
  generateConceptMapWithOxlo,
  generateDiagramWithOxlo,
  generateMindMapWithOxlo,
  generateSkillFilesWithOxlo,
  getChatModelOptions,
  chatAboutPdfWithOxlo,
  type ChatModelOption,
  generateSummaryWithOxlo,
} from '../features/oxlo/chat'
import { MindMapPanel } from '../features/mindmap/components/MindMapPanel'
import { buildMarkdown, fallbackMindMap, mindMapToFlow, simpleKeyPoints } from '../features/mindmap/utils'
import type { MindMapData } from '../features/mindmap/types'
import { ConceptMapPanel } from '../features/conceptmap/components/ConceptMapPanel'
import { conceptMapToFlow, fallbackConceptMap } from '../features/conceptmap/utils'
import type { ConceptMapData } from '../features/conceptmap/types'
import type { DiagramArtifact } from '../features/diagram/types'
import { diagramFileExtension, diagramKindLabel, fallbackDiagram } from '../features/diagram/utils'
import { MermaidPreview } from '../features/diagram/components/MermaidPreview'
import type { SkillFile } from '../features/skills/types'
import { fallbackSkillFiles } from '../features/skills/utils'

type AppState = 'idle' | 'processing' | 'done'
type AiMode = 'unknown' | 'oxlo' | 'fallback'
type ResultTab = 'summary' | 'mindmap' | 'conceptmap' | 'diagram' | 'skills' | 'keypoints' | 'markdown' | 'raw'
type ChatMessage = { role: 'user' | 'assistant'; content: string }

const PROCESSING_STEPS = [
  'Validando archivo PDF',
  'Leyendo paginas con PDF.js',
  'Aplicando OCR a paginas escaneadas',
  'Generando resumen con Oxlo',
  'Generando mapa mental',
  'Generando mapa conceptual',
  'Generando diagrama contextual',
  'Generando skill files',
  'Finalizando',
]

const RESULT_TABS: { id: ResultTab; label: string; icon: string }[] = [
  { id: 'summary', label: 'Resumen', icon: '📋' },
  { id: 'mindmap', label: 'Mapa Mental', icon: '🧠' },
  { id: 'conceptmap', label: 'Mapa Conceptual', icon: '🗺️' },
  { id: 'diagram', label: 'Diagramas', icon: '📐' },
  { id: 'skills', label: 'Skills', icon: '🧩' },
  { id: 'keypoints', label: 'Puntos Clave', icon: '🎯' },
  { id: 'markdown', label: 'Archivo .md', icon: '📝' },
  { id: 'raw', label: 'Texto extraido', icon: '📄' },
]

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function Dashboard() {
  const [appState, setAppState] = useState<AppState>('idle')
  const [isDragging, setIsDragging] = useState(false)
  const [activeTab, setActiveTab] = useState<ResultTab>('summary')
  const [processStep, setProcessStep] = useState(0)
  const [processProgress, setProcessProgress] = useState(0)
  const [displayLabel, setDisplayLabel] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [aiMode, setAiMode] = useState<AiMode>('unknown')
  const [aiModeDetail, setAiModeDetail] = useState('Esperando procesamiento')

  const [fileName, setFileName] = useState('')
  const [fileSize, setFileSize] = useState(0)
  const [pages, setPages] = useState(0)
  const [ocrPages, setOcrPages] = useState(0)
  const [extractedText, setExtractedText] = useState('')
  const [summary, setSummary] = useState('')
  const [mindMap, setMindMap] = useState<MindMapData | null>(null)
  const [conceptMap, setConceptMap] = useState<ConceptMapData | null>(null)
  const [diagram, setDiagram] = useState<DiagramArtifact | null>(null)
  const [skillFiles, setSkillFiles] = useState<SkillFile[]>([])
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatSending, setChatSending] = useState(false)
  const [chatModelOptions, setChatModelOptions] = useState<ChatModelOption[]>([])
  const [selectedChatModel, setSelectedChatModel] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  const keyPoints = useMemo(() => simpleKeyPoints(summary || extractedText), [summary, extractedText])
  const markdown = useMemo(() => buildMarkdown(fileName, summary, keyPoints), [fileName, summary, keyPoints])

  const mindMapFlow = useMemo(() => {
    if (!mindMap) return { nodes: [], edges: [] }
    return mindMapToFlow(mindMap)
  }, [mindMap])

  const conceptMapFlow = useMemo(() => {
    if (!conceptMap) return { nodes: [], edges: [] }
    return conceptMapToFlow(conceptMap)
  }, [conceptMap])

  useEffect(() => {
    if (appState !== 'done' || extractedText.length < 30) {
      return
    }

    let cancelled = false

    const loadModels = async () => {
      const options = await getChatModelOptions()
      if (cancelled) return
      setChatModelOptions(options)
      if (!selectedChatModel && options.length > 0) {
        setSelectedChatModel(options[0].model)
      }
    }

    void loadModels()

    return () => {
      cancelled = true
    }
  }, [appState, extractedText, selectedChatModel])

  const applyExtractionState = (extracted: ExtractedPdf): void => {
    setPages(extracted.pages)
    setOcrPages(extracted.ocrPages)
    setExtractedText(extracted.text)
  }

  const downloadTextFile = (fileNameToSave: string, content: string, mimeType = 'text/plain;charset=utf-8'): void => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = fileNameToSave
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  const runFallbackMode = (file: File, extracted: ExtractedPdf, reason: string): void => {
    const fallbackText = extracted.text.slice(0, 1400)
    const fallbackSummary = `Resumen local de respaldo:\n\n${fallbackText}${extracted.text.length > 1400 ? '...' : ''}`

    const points = simpleKeyPoints(extracted.text)
    const fallbackMd = buildMarkdown(file.name, fallbackSummary, points)
    const localMindMap = fallbackMindMap(file.name, fallbackSummary, points)
    const localConceptMap = fallbackConceptMap(file.name, fallbackSummary, points)
    const localDiagram = fallbackDiagram(file.name, fallbackSummary, extracted.text, points)
    const localSkills = fallbackSkillFiles(file.name, fallbackSummary, points, fallbackMd)

    setSummary(fallbackSummary)
    setMindMap(localMindMap)
    setConceptMap(localConceptMap)
    setDiagram(localDiagram)
    setSkillFiles(localSkills)
    setAiMode('fallback')
    setAiModeDetail(`Fallback local activo: ${reason}`)
  }

  const processFile = useCallback(async (file: File) => {
    setErrorMessage(null)
    setAiMode('unknown')
    setAiModeDetail('Conectando con Oxlo...')
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
      }, PROCESSING_STEPS)

      applyExtractionState(extracted)

      if (!extracted.text || extracted.text.length < 40) {
        runFallbackMode(file, extracted, 'No se extrajo texto suficiente para usar el backend')
        setProcessStep(8)
        setProcessProgress(100)
        setDisplayLabel(PROCESSING_STEPS[8])
        setAppState('done')
        setActiveTab('summary')
        return
      }

      setProcessStep(3)
      setProcessProgress(82)
      setDisplayLabel(PROCESSING_STEPS[3])

      try {
        const aiSummary = await generateSummaryWithOxlo(extracted.text)
        const summaryPoints = simpleKeyPoints(aiSummary)
        const summaryMarkdown = buildMarkdown(file.name, aiSummary, summaryPoints)

        setSummary(aiSummary)
        setAiMode('oxlo')
        setAiModeDetail('Resumen y estructuras generadas con Oxlo API')

        setProcessStep(4)
        setProcessProgress(90)
        setDisplayLabel(PROCESSING_STEPS[4])

        try {
          const aiMindMap = await generateMindMapWithOxlo(file.name, extracted.text, aiSummary)
          setMindMap(aiMindMap)
        } catch {
          setMindMap(fallbackMindMap(file.name, aiSummary, summaryPoints))
          setAiModeDetail('Resumen con Oxlo + mapa mental local de respaldo')
        }

        setProcessStep(5)
        setProcessProgress(94)
        setDisplayLabel(PROCESSING_STEPS[5])

        try {
          const aiConceptMap = await generateConceptMapWithOxlo(file.name, extracted.text, aiSummary)
          setConceptMap(aiConceptMap)
        } catch {
          setConceptMap(fallbackConceptMap(file.name, aiSummary, summaryPoints))
          setAiModeDetail('Resumen con Oxlo + mapa conceptual local de respaldo')
        }

        setProcessStep(6)
        setProcessProgress(96)
        setDisplayLabel(PROCESSING_STEPS[6])

        try {
          const aiDiagram = await generateDiagramWithOxlo(file.name, extracted.text, aiSummary)
          setDiagram(aiDiagram)
        } catch {
          setDiagram(fallbackDiagram(file.name, aiSummary, extracted.text, summaryPoints))
          setAiModeDetail('Resumen con Oxlo + diagrama local de respaldo')
        }

        setProcessStep(7)
        setProcessProgress(98)
        setDisplayLabel(PROCESSING_STEPS[7])

        try {
          const aiSkills = await generateSkillFilesWithOxlo(file.name, aiSummary, summaryPoints, summaryMarkdown)
          setSkillFiles(aiSkills)
        } catch {
          setSkillFiles(fallbackSkillFiles(file.name, aiSummary, summaryPoints, summaryMarkdown))
          setAiModeDetail('Resumen con Oxlo + skills locales de respaldo')
        }
      } catch (summaryError) {
        const reason = summaryError instanceof Error ? summaryError.message : 'No se pudo conectar al backend'
        runFallbackMode(file, extracted, reason)
      }

      setProcessStep(8)
      setProcessProgress(100)
      setDisplayLabel(PROCESSING_STEPS[8])
      setAppState('done')
      setActiveTab('summary')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error inesperado procesando el PDF.'
      setErrorMessage(message)
      setAppState('idle')
      setAiMode('fallback')
      setAiModeDetail(`Error en procesamiento local: ${message}`)
    }
  }, [])

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    setIsDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (file) {
      void processFile(file)
    }
  }, [processFile])

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)
  const handleFileClick = () => fileInputRef.current?.click()

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
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
    setAiMode('unknown')
    setAiModeDetail('Esperando procesamiento')
    setFileName('')
    setFileSize(0)
    setPages(0)
    setOcrPages(0)
    setExtractedText('')
    setSummary('')
    setMindMap(null)
    setConceptMap(null)
    setDiagram(null)
    setSkillFiles([])
    setChatMessages([])
    setChatInput('')
    setChatSending(false)
    setChatModelOptions([])
    setSelectedChatModel('')
    setActiveTab('summary')
  }

  const sendChatMessage = async () => {
    const question = chatInput.trim()
    if (!question || chatSending || !selectedChatModel) return

    setChatInput('')
    setChatSending(true)
    setChatMessages((prev) => [...prev, { role: 'user', content: question }])

    try {
      const answer = await chatAboutPdfWithOxlo({
        model: selectedChatModel,
        question,
        fileName,
        extractedText,
        summary,
        keyPoints,
      })

      setChatMessages((prev) => [...prev, { role: 'assistant', content: answer }])
    } catch (error) {
      const errorText = error instanceof Error ? error.message : 'No se pudo completar la respuesta.'
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `No pude responder con el modelo seleccionado. Detalle: ${errorText}`,
        },
      ])
    } finally {
      setChatSending(false)
    }
  }

  const copyToClipboard = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      setErrorMessage('No se pudo copiar al portapapeles.')
    }
  }

  const chatSidebar = (
    <aside className="db-chat-sidebar">
      <div className="db-chat-card">
        <div className="rp-header">
          <h3>Copilot PDF</h3>
        </div>
        <p className="rp-meta">Chat lateral con contexto del documento cargado.</p>

        <div className="chat-model-row">
          <label htmlFor="chat-model">Modelo Oxlo (debil → fuerte)</label>
          <select
            id="chat-model"
            className="chat-model-select"
            value={selectedChatModel}
            onChange={(event) => setSelectedChatModel(event.target.value)}
          >
            {chatModelOptions.length === 0 && <option value="">Cargando modelos...</option>}
            {chatModelOptions.map((option) => (
              <option key={option.model} value={option.model}>
                {option.displayName} · {option.category} · score {option.strengthScore}
              </option>
            ))}
          </select>
        </div>

        <div className="chat-thread">
          {chatMessages.length === 0 && (
            <div className="chat-empty">
              Aun no hay mensajes. Prueba con: "Que conclusiones principales tiene este PDF?"
            </div>
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
  )

  return (
    <div className="db-root">
      <aside className="db-sidebar">
        <div className="db-logo">
          <div className="db-logo-icon">
            <svg viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                stroke="#05070A"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span>Oxlo<b>Vision</b></span>
        </div>

        <nav className="db-nav">
          <div className="db-nav-label">Workspace</div>
          <a className="db-nav-item db-nav-item--active" href="#"><span>📄</span> Documentos</a>
          <a className="db-nav-item" href="#"><span>📊</span> Resultados</a>
          <a className="db-nav-item" href="#"><span>🕒</span> Historial</a>
        </nav>

        <div className="db-sidebar-footer">
          <Link to="/" className="db-back-link">← Volver al inicio</Link>
          <div className="db-plan">
            <span className="db-plan-badge">BETA</span>
            Plan gratuito · 3/5 PDFs
          </div>
        </div>
      </aside>

      <main className="db-main">
        <header className="db-topbar">
          <div className="db-topbar-title">
            {appState === 'idle' && 'Nuevo analisis'}
            {appState === 'processing' && 'Procesando documento...'}
            {appState === 'done' && (
              <span>
                {fileName} <span className="db-done-badge">✓ Completado</span>
              </span>
            )}
          </div>
          <div className="db-topbar-actions">
            <div className={`ai-status ai-status--${aiMode}`} title={aiModeDetail}>
              <span className="ai-status-dot" />
              {aiMode === 'oxlo' && 'Modo Oxlo API'}
              {aiMode === 'fallback' && 'Modo Local Fallback'}
              {aiMode === 'unknown' && 'Estado IA: pendiente'}
            </div>
            {appState === 'done' && (
              <button className="db-btn-ghost" onClick={handleReset}>+ Nuevo PDF</button>
            )}
            <div className="db-avatar">FA</div>
          </div>
        </header>

        <div className="db-content">
          {appState === 'idle' && (
            <div className="db-upload-area">
              <div
                className={`dropzone ${isDragging ? 'dropzone--over' : ''}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={handleFileClick}
              >
                <input ref={fileInputRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={handleFileChange} />
                <div className="dropzone__icon">{isDragging ? '📂' : '📄'}</div>
                <h2 className="dropzone__title">{isDragging ? 'Suelta tu PDF aqui' : 'Arrastra tu PDF aqui'}</h2>
                <p className="dropzone__sub">{isDragging ? 'Listo para analizar' : 'o haz clic para seleccionar un archivo'}</p>
                {!isDragging && <button className="dropzone__btn">Seleccionar PDF</button>}
                <p className="dropzone__hint">PDF hasta 50 MB · Max. 500 paginas</p>
              </div>

              <div className="format-options">
                <div className="format-title">¿Que quieres generar?</div>
                <div className="format-grid">
                  {[
                    { icon: '📄', label: 'Extraccion texto PDF', checked: true },
                    { icon: '🔍', label: 'OCR para escaneados', checked: true },
                    { icon: '📋', label: 'Resumen IA', checked: true },
                    { icon: '🧠', label: 'Mapa mental React Flow', checked: true },
                    { icon: '🗺️', label: 'Mapa conceptual IA', checked: true },
                    { icon: '📐', label: 'Diagrama UML/ER contextual', checked: true },
                    { icon: '💬', label: 'Chat con contexto del PDF', checked: true },
                    { icon: '🧩', label: 'Skill files para IA', checked: true },
                    { icon: '🎯', label: 'Puntos clave', checked: true },
                    { icon: '📝', label: 'Salida Markdown', checked: true },
                  ].map((option) => (
                    <label className={`format-chip ${option.checked ? 'format-chip--on' : ''}`} key={option.label}>
                      <span>{option.icon}</span>
                      <span>{option.label}</span>
                      <span className={`format-check ${option.checked ? 'format-check--on' : ''}`}>{option.checked ? '✓' : ''}</span>
                    </label>
                  ))}
                </div>
              </div>

              {errorMessage && (
                <div className="result-panel">
                  <div className="rp-header"><h3>Error</h3></div>
                  <p className="rp-body">{errorMessage}</p>
                </div>
              )}
            </div>
          )}

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
                  <div className="proc-bar-outer"><div className="proc-bar-fill" style={{ width: `${processProgress}%` }} /></div>
                  <div className="proc-pct">{processProgress}%</div>
                </div>

                <div className="proc-label"><span className="proc-spinner">⟳</span>{displayLabel}<span className="proc-cursor">|</span></div>

                <div className="proc-steps">
                  {PROCESSING_STEPS.map((label, index) => (
                    <div
                      key={label}
                      className={`proc-step ${index < processStep ? 'proc-step--done' : index === processStep ? 'proc-step--active' : ''}`}
                    >
                      <span className="proc-step-dot" />
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {appState === 'done' && (
            <div className="db-results-layout">
              <div className="db-results db-results-main">
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

                <div className="results-tabs">
                  {RESULT_TABS.map((tab) => (
                    <button
                      key={tab.id}
                      className={`results-tab ${activeTab === tab.id ? 'results-tab--active' : ''}`}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      <span>{tab.icon}</span>{tab.label}
                    </button>
                  ))}
                </div>

                <div className="results-body">
                {activeTab === 'summary' && (
                  <div className="result-panel">
                    <div className="rp-header">
                      <h3>Resumen ejecutivo</h3>
                      <button className="rp-copy" onClick={() => void copyToClipboard(summary)}>Copiar</button>
                    </div>
                    <p className="rp-meta">Generado desde texto extraido de PDF y OCR</p>
                    <p className="rp-meta">{aiModeDetail}</p>
                    <div className="rp-body">
                      {summary.split('\n').filter(Boolean).map((line, index) => (
                        <p key={index}>{line}</p>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'mindmap' && (
                  <MindMapPanel
                    mindMap={mindMap}
                    flow={mindMapFlow}
                    onCopyJson={() => void copyToClipboard(JSON.stringify(mindMap, null, 2))}
                  />
                )}

                {activeTab === 'conceptmap' && (
                  <ConceptMapPanel
                    conceptMap={conceptMap}
                    flow={conceptMapFlow}
                    onCopyJson={() => void copyToClipboard(JSON.stringify(conceptMap, null, 2))}
                  />
                )}

                {activeTab === 'diagram' && (
                  <div className="result-panel markdownp">
                    <div className="rp-header">
                      <h3>Diagrama contextual</h3>
                      <div className="diagram-actions">
                        <button
                          className="rp-copy"
                          onClick={() => void copyToClipboard(diagram?.mermaid || '')}
                          disabled={!diagram}
                        >
                          Copiar Mermaid
                        </button>
                        <button
                          className="rp-copy"
                          onClick={() => {
                            if (!diagram) return
                            downloadTextFile(
                              `diagram-${diagram.kind}.${diagramFileExtension()}`,
                              diagram.mermaid,
                              'text/plain;charset=utf-8',
                            )
                          }}
                          disabled={!diagram}
                        >
                          Descargar
                        </button>
                      </div>
                    </div>
                    {diagram && (
                      <>
                        <p className="rp-meta">Tipo: {diagramKindLabel(diagram.kind)}</p>
                        <p className="rp-meta">Criterio: {diagram.rationale}</p>
                        <div className="mermaid-shell">
                          <MermaidPreview chart={diagram.mermaid} />
                        </div>
                        <div className="md-preview">
                          <div className="md-header">
                            <span className="code-dot" style={{ background: '#ff5f56' }} />
                            <span className="code-dot" style={{ background: '#ffbd2e' }} />
                            <span className="code-dot" style={{ background: '#27c93f' }} />
                            <span className="md-filename">diagram.mmd</span>
                          </div>
                          <pre className="md-body"><code>{diagram.mermaid}</code></pre>
                        </div>
                      </>
                    )}
                    {!diagram && <p className="rp-body">No hay diagrama disponible.</p>}
                  </div>
                )}

                {activeTab === 'skills' && (
                  <div className="result-panel">
                    <div className="rp-header">
                      <h3>Skills para asistentes IA</h3>
                    </div>
                    <p className="rp-meta">Archivos listos para reutilizar en asistentes de desarrollo y analisis.</p>
                    <div className="skill-files-grid">
                      {skillFiles.length === 0 && <p className="rp-body">No hay skills generados.</p>}
                      {skillFiles.map((skillFile) => (
                        <div className="skill-file-card" key={skillFile.fileName}>
                          <div className="skill-file-head">
                            <h4>{skillFile.fileName}</h4>
                            <span>{skillFile.description}</span>
                          </div>
                          <div className="skill-file-actions">
                            <button className="rp-copy" onClick={() => void copyToClipboard(skillFile.content)}>Copiar</button>
                          </div>
                          <pre className="skill-file-preview"><code>{skillFile.content.slice(0, 380)}{skillFile.content.length > 380 ? '\n...' : ''}</code></pre>
                        </div>
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
                        <div className="kp-cat-header"><span>🎯</span><span>Hallazgos</span></div>
                        <ul>
                          {keyPoints.length === 0 && <li>No hay suficientes frases para generar puntos clave.</li>}
                          {keyPoints.map((item, index) => (
                            <li key={index}><span className="kp-bullet" />{item}</li>
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

              {chatSidebar}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
