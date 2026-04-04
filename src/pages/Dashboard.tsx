import { useState, useRef, useCallback, useEffect } from 'react'
import { Link } from 'react-router-dom'
import '../dashboard.css'

// ── Types ──────────────────────────────────────────────────────
type AppState = 'idle' | 'dragging' | 'processing' | 'done'
type ResultTab = 'summary' | 'mindmap' | 'keypoints' | 'markdown' | 'skill'

// ── Mock data ──────────────────────────────────────────────────
const MOCK_FILE = { name: 'research_paper_2024.pdf', size: '2.4 MB', pages: 87 }

const PROCESSING_STEPS = [
  { label: 'Cargando documento…',  dur: 800  },
  { label: 'Extrayendo texto…',    dur: 900  },
  { label: 'Analizando contexto…', dur: 1100 },
  { label: 'Generando resumen…',   dur: 900  },
  { label: 'Construyendo mapas…',  dur: 1000 },
  { label: 'Finalizando…',         dur: 600  },
]

const RESULT_TABS: { id: ResultTab; label: string; icon: string }[] = [
  { id: 'summary',   label: 'Resumen',      icon: '📋' },
  { id: 'mindmap',   label: 'Mapa Mental',  icon: '🧠' },
  { id: 'keypoints', label: 'Puntos Clave', icon: '🎯' },
  { id: 'markdown',  label: 'Archivo .md',  icon: '📝' },
  { id: 'skill',     label: 'Skill',        icon: '⚡' },
]

// ── Sub-components ──────────────────────────────────────────────

function SummaryPanel() {
  return (
    <div className="result-panel">
      <div className="rp-header">
        <h3>Resumen Ejecutivo</h3>
        <button className="rp-copy">Copiar</button>
      </div>
      <p className="rp-meta">📄 87 páginas · Generado en 4.2 s</p>
      <div className="rp-body">
        <p>Este documento presenta un estudio comparativo sobre <strong>modelos de lenguaje de gran escala (LLMs)</strong> aplicados a la extracción de información estructurada en documentos científicos.</p>
        <p>Los autores proponen una metodología novedosa basada en <strong>retrieval-augmented generation (RAG)</strong> que supera en un 12.4% a los enfoques tradicionales de fine-tuning en tareas de comprensión lectora especializada.</p>
        <p>Se evaluaron seis arquitecturas distintas en tres benchmarks públicos, con especial énfasis en la <strong>precisión semántica</strong>, eficiencia computacional y escalabilidad en entornos de producción.</p>
        <p>Las conclusiones destacan que la combinación de indexación jerárquica y atención cruzada multi-etapa constituye el paradigma más prometedor para 2025, con implicaciones directas para sistemas de búsqueda empresarial y asistentes de IA especializados.</p>
      </div>
      <div className="rp-stats">
        <div className="stat-chip"><span>📊</span> 6 modelos evaluados</div>
        <div className="stat-chip"><span>🏆</span> +12.4% precisión</div>
        <div className="stat-chip"><span>📚</span> 3 benchmarks</div>
        <div className="stat-chip"><span>⏱️</span> 4.2s proceso</div>
      </div>
    </div>
  )
}

function MindMapPanel() {
  const nodes = [
    { id: 'root', x: 320, y: 200, label: 'LLMs en\nDocumentos', root: true },
    { id: 'rag',    x: 100, y: 80,  label: 'RAG' },
    { id: 'arch',   x: 100, y: 200, label: 'Arquitecturas' },
    { id: 'bench',  x: 100, y: 320, label: 'Benchmarks' },
    { id: 'results',x: 540, y: 80,  label: 'Resultados' },
    { id: 'apps',   x: 540, y: 200, label: 'Aplicaciones' },
    { id: 'future', x: 540, y: 320, label: 'Futuro' },
    { id: 'rag1',  x: -60, y: 40,  label: 'Indexación\nJerárquica' },
    { id: 'rag2',  x: -60, y: 120, label: 'Atención\nCruzada' },
    { id: 'res1',  x: 700, y: 40,  label: '+12.4%\nPrecisión' },
    { id: 'res2',  x: 700, y: 120, label: 'Escalabilidad' },
  ]
  const edges = [
    ['root','rag'],['root','arch'],['root','bench'],
    ['root','results'],['root','apps'],['root','future'],
    ['rag','rag1'],['rag','rag2'],
    ['results','res1'],['results','res2'],
  ]
  const findNode = (id: string) => nodes.find(n => n.id === id)!

  return (
    <div className="result-panel mindmap-panel">
      <div className="rp-header">
        <h3>Mapa Mental</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="rp-copy">Exportar SVG</button>
          <button className="rp-copy">Exportar JSON</button>
        </div>
      </div>
      <div className="mindmap-canvas">
        <svg viewBox="-90 10 840 370" className="mindmap-svg">
          {/* edges */}
          {edges.map(([a, b]) => {
            const na = findNode(a), nb = findNode(b)
            return (
              <line key={`${a}-${b}`}
                x1={na.x + 50} y1={na.y + 20}
                x2={nb.x + 50} y2={nb.y + 20}
                stroke="rgba(31,255,180,0.25)" strokeWidth="1.5"
              />
            )
          })}
          {/* nodes */}
          {nodes.map(n => (
            <g key={n.id} transform={`translate(${n.x},${n.y})`}>
              <rect
                x="0" y="0" width="100" height="40" rx="10"
                fill={n.root ? 'rgba(31,255,180,0.15)' : 'rgba(17,20,24,0.9)'}
                stroke={n.root ? 'rgba(31,255,180,0.7)' : 'rgba(31,255,180,0.2)'}
                strokeWidth={n.root ? 2 : 1}
              />
              {n.label.split('\n').map((line, i) => (
                <text key={i}
                  x="50" y={n.label.includes('\n') ? 14 + i * 14 : 24}
                  textAnchor="middle"
                  fill={n.root ? '#1FFFB4' : '#fff'}
                  fontSize={n.root ? '10' : '9'}
                  fontFamily="Inter, sans-serif"
                  fontWeight={n.root ? '700' : '400'}
                >{line}</text>
              ))}
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
}

function KeyPointsPanel() {
  const points = [
    { cat: 'Metodología', icon: '🔬', items: [
      'RAG supera fine-tuning en +12.4% en comprensión especializada.',
      'La indexación jerárquica es clave para la escalabilidad.',
      'La atención cruzada multi-etapa mejora la coherencia semántica.',
    ]},
    { cat: 'Resultados', icon: '📊', items: [
      'Evaluados en SQuAD 2.0, NaturalQuestions y TriviaQA.',
      'El modelo propuesto logra el estado del arte en 2 de 3 benchmarks.',
      'Reducción de latencia del 23% frente al baseline.',
    ]},
    { cat: 'Conclusiones', icon: '🏁', items: [
      'RAG jerárquico es el paradigma dominante para 2025.',
      'Alta aplicabilidad en búsqueda empresarial y asistentes de IA.',
      'Se propone código abierto del framework evaluado.',
    ]},
  ]
  return (
    <div className="result-panel">
      <div className="rp-header">
        <h3>Puntos Clave</h3>
        <button className="rp-copy">Copiar todo</button>
      </div>
      <div className="keypoints-grid">
        {points.map(cat => (
          <div className="kp-category" key={cat.cat}>
            <div className="kp-cat-header">
              <span>{cat.icon}</span>
              <span>{cat.cat}</span>
            </div>
            <ul>
              {cat.items.map((item, i) => (
                <li key={i}>
                  <span className="kp-bullet" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

function MarkdownPanel() {
  const md = `# Resumen — research_paper_2024.pdf

> Generado por Oxlo Vision · 2024-04-04

## 🎯 Puntos Principales

- RAG supera fine-tuning en **+12.4%** en comprensión especializada
- Indexación jerárquica es clave para la escalabilidad
- Evaluado en SQuAD 2.0, NaturalQuestions y TriviaQA

## 📋 Resumen Ejecutivo

Este documento presenta un estudio comparativo sobre modelos de lenguaje
de gran escala (LLMs) aplicados a la extracción de información estructurada...

## 🧠 Mapa Conceptual

\`\`\`mermaid
graph TD
  A[LLMs en Documentos] --> B[RAG]
  A --> C[Arquitecturas]
  A --> D[Benchmarks]
  B --> E[Indexación Jerárquica]
  B --> F[Atención Cruzada]
  D --> G[+12.4% Precisión]
\`\`\`

## 📚 Contexto para IA

Este archivo está optimizado como contexto para GitHub Copilot.
Usa \`@workspace\` para referenciar este conocimiento.`

  return (
    <div className="result-panel markdownp">
      <div className="rp-header">
        <h3>Archivo .md</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="rp-copy">Copiar</button>
          <button className="rp-copy rp-download">⬇ Descargar</button>
        </div>
      </div>
      <p className="rp-meta">📝 Optimizado para GitHub Copilot y LLMs</p>
      <div className="md-preview">
        <div className="md-header">
          <span className="code-dot" style={{ background: '#ff5f56' }} />
          <span className="code-dot" style={{ background: '#ffbd2e' }} />
          <span className="code-dot" style={{ background: '#27c93f' }} />
          <span className="md-filename">output.md</span>
        </div>
        <pre className="md-body"><code>{md}</code></pre>
      </div>
    </div>
  )
}

function SkillPanel() {
  return (
    <div className="result-panel">
      <div className="rp-header">
        <h3>Skill para IA</h3>
        <button className="rp-copy rp-download">⬇ Descargar .json</button>
      </div>
      <p className="rp-meta">⚡ Lista para usar en GitHub Copilot, ChatGPT, Claude y más</p>
      <div className="skill-cards">
        <div className="skill-card active">
          <div className="skill-card-icon">🤖</div>
          <div>
            <div className="skill-card-title">GitHub Copilot</div>
            <div className="skill-card-desc">Skill `.gh-skill.json` lista para importar</div>
          </div>
          <span className="skill-badge">Listo</span>
        </div>
        <div className="skill-card">
          <div className="skill-card-icon">💬</div>
          <div>
            <div className="skill-card-title">ChatGPT GPT</div>
            <div className="skill-card-desc">Instrucciones de sistema exportadas</div>
          </div>
          <span className="skill-badge">Listo</span>
        </div>
        <div className="skill-card">
          <div className="skill-card-icon">🧩</div>
          <div>
            <div className="skill-card-title">VS Code Extension</div>
            <div className="skill-card-desc">Snippet pack generado automáticamente</div>
          </div>
          <span className="skill-badge skill-badge--dim">Próximamente</span>
        </div>
      </div>
      <div className="skill-preview">
        <div className="md-header">
          <span className="code-dot" style={{ background: '#ff5f56' }} />
          <span className="code-dot" style={{ background: '#ffbd2e' }} />
          <span className="code-dot" style={{ background: '#27c93f' }} />
          <span className="md-filename">oxlo-skill.json</span>
        </div>
        <pre className="md-body"><code>{`{
  "name": "research_paper_2024 — Oxlo Vision Skill",
  "version": "1.0.0",
  "description": "Conocimiento extraído del PDF",
  "context": "RAG, indexación jerárquica, LLMs...",
  "keyPoints": [
    "RAG supera fine-tuning en +12.4%",
    "Indexación jerárquica escala mejor",
    "Evaluado en SQuAD 2.0"
  ],
  "model": "oxlo-vision-v1",
  "language": "es"
}`}</code></pre>
      </div>
    </div>
  )
}

// ── Main Dashboard ─────────────────────────────────────────────
export default function Dashboard() {
  const [appState, setAppState] = useState<AppState>('idle')
  const [isDragging, setIsDragging] = useState(false)
  const [activeTab, setActiveTab] = useState<ResultTab>('summary')
  const [processStep, setProcessStep] = useState(0)
  const [processProgress, setProcessProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // simulate processing
  const startProcessing = useCallback(() => {
    setAppState('processing')
    setProcessStep(0)
    setProcessProgress(0)

    let totalTime = 0
    PROCESSING_STEPS.forEach((step, i) => {
      setTimeout(() => {
        setProcessStep(i)
        setProcessProgress(Math.round(((i + 1) / PROCESSING_STEPS.length) * 100))
      }, totalTime)
      totalTime += step.dur
    })

    setTimeout(() => {
      setAppState('done')
    }, totalTime + 200)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    startProcessing()
  }, [startProcessing])

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }
  const handleDragLeave = () => setIsDragging(false)
  const handleFileClick = () => fileInputRef.current?.click()
  const handleFileChange = () => startProcessing()
  const handleReset = () => { setAppState('idle'); setProcessStep(0); setProcessProgress(0) }

  // typing cursor for processing label
  const [displayLabel, setDisplayLabel] = useState('')
  useEffect(() => {
    if (appState !== 'processing') return
    const label = PROCESSING_STEPS[processStep]?.label ?? ''
    setDisplayLabel('')
    let i = 0
    const iv = setInterval(() => {
      setDisplayLabel(label.slice(0, i + 1))
      i++
      if (i >= label.length) clearInterval(iv)
    }, 30)
    return () => clearInterval(iv)
  }, [processStep, appState])

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
            {appState === 'idle' && 'Nuevo análisis'}
            {appState === 'dragging' && 'Suelta para analizar'}
            {appState === 'processing' && 'Procesando documento…'}
            {appState === 'done' && (
              <span>{MOCK_FILE.name} <span className="db-done-badge">✓ Completado</span></span>
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
          {(appState === 'idle' || appState === 'dragging') && (
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
                  {isDragging ? 'Suelta tu PDF aquí' : 'Arrastra tu PDF aquí'}
                </h2>
                <p className="dropzone__sub">
                  {isDragging ? '¡Listo para analizar!' : 'o haz clic para seleccionar un archivo'}
                </p>
                {!isDragging && (
                  <button className="dropzone__btn">
                    Seleccionar PDF
                  </button>
                )}
                <p className="dropzone__hint">PDF hasta 50 MB · Máx. 500 páginas</p>
              </div>

              {/* Format options */}
              <div className="format-options">
                <div className="format-title">¿Qué quieres generar?</div>
                <div className="format-grid">
                  {[
                    { icon: '📋', label: 'Resumen', checked: true },
                    { icon: '🧠', label: 'Mapa Mental', checked: true },
                    { icon: '🗺️', label: 'Mapa Conceptual', checked: false },
                    { icon: '🎯', label: 'Puntos Clave', checked: true },
                    { icon: '📝', label: 'Archivo .md', checked: true },
                    { icon: '⚡', label: 'Skill IA', checked: false },
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
            </div>
          )}

          {/* ── PROCESSING state ── */}
          {appState === 'processing' && (
            <div className="db-processing">
              <div className="proc-card">
                <div className="proc-file">
                  <div className="proc-file-icon">📄</div>
                  <div>
                    <div className="proc-filename">{MOCK_FILE.name}</div>
                    <div className="proc-meta">{MOCK_FILE.size} · {MOCK_FILE.pages} páginas</div>
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
                  {PROCESSING_STEPS.map((s, i) => (
                    <div
                      key={s.label}
                      className={`proc-step ${
                        i < processStep ? 'proc-step--done' :
                        i === processStep ? 'proc-step--active' : ''
                      }`}
                    >
                      <span className="proc-step-dot" />
                      <span>{s.label}</span>
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
                    <div className="results-filename">{MOCK_FILE.name}</div>
                    <div className="results-meta">{MOCK_FILE.size} · {MOCK_FILE.pages} páginas · procesado en 4.2s</div>
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
                {activeTab === 'summary'   && <SummaryPanel />}
                {activeTab === 'mindmap'   && <MindMapPanel />}
                {activeTab === 'keypoints' && <KeyPointsPanel />}
                {activeTab === 'markdown'  && <MarkdownPanel />}
                {activeTab === 'skill'     && <SkillPanel />}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
