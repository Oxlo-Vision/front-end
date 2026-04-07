import { Link } from 'react-router-dom'
import {
  FiBookOpen,
  FiFileText,
  FiGitBranch,
  FiLink2,
  FiList,
  FiTarget,
  FiTool,
  FiZap,
} from 'react-icons/fi'
import './index.css'

// ── SVG Icons inlined ──────────────────────────────────────────
const LogoIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
      stroke="#05070A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

// ── Data ───────────────────────────────────────────────────────
const features = [
  {
    icon: <FiFileText />,
    title: 'Resumen Inteligente',
    desc: 'Convierte PDFs extensos en resúmenes claros y accionables, manteniendo el contexto esencial del documento.',
  },
  {
    icon: <FiGitBranch />,
    title: 'Mapas Conceptuales',
    desc: 'Organiza ideas, conceptos y relaciones en diagramas claros para estudiar, explicar o presentar mejor la información.',
  },
  {
    icon: <FiBookOpen />,
    title: 'Mapas Mentales',
    desc: 'Estructura el contenido en ramas jerárquicas para aprender más rápido y retener lo importante.',
  },
  {
    icon: <FiTarget />,
    title: 'Puntos Clave',
    desc: 'Identifica de forma automática los hallazgos más relevantes para estudiar, investigar o tomar decisiones.',
  },
  {
    icon: <FiZap />,
    title: 'Chat Contextual del Documento',
    desc: 'Haz preguntas en lenguaje natural sobre el PDF y recibe respuestas basadas en su contenido.',
  },
  {
    icon: <FiList />,
    title: 'Exportables Listos para Usar',
    desc: 'Descarga Markdown y texto extraído para compartir, documentar o reutilizar en otros flujos de trabajo.',
  },
]

const steps = [
  { num: '01', title: 'Sube cualquier PDF', desc: 'Carga apuntes, papers, manuales, contratos, reportes o documentación técnica.' },
  { num: '02', title: 'Extracción y OCR', desc: 'La plataforma lee el contenido y recupera texto incluso en documentos escaneados.' },
  { num: '03', title: 'Análisis con IA', desc: 'Genera resumen, mapas y puntos clave para entender el documento en menos tiempo.' },
  { num: '04', title: 'Consulta y exporta', desc: 'Pregunta al chat sobre el contenido y descarga resultados listos para usar.' },
]

const outputs = [
  { icon: <FiFileText />, title: 'Resumen ejecutivo', desc: 'Síntesis clara de las ideas más relevantes del PDF.' },
  { icon: <FiLink2 />, title: 'Mapa conceptual', desc: 'Relación visual entre conceptos clave del documento.' },
  { icon: <FiGitBranch />, title: 'Mapa mental', desc: 'Estructura jerárquica para estudiar o explicar contenidos complejos.' },
  { icon: <FiTarget />, title: 'Puntos clave', desc: 'Lista priorizada de hallazgos importantes para acción rápida.' },
  { icon: <FiList />, title: 'Texto extraído y Markdown', desc: 'Archivos listos para compartir, revisar o usar con asistentes de IA.' },
  { icon: <FiTool />, title: 'Chat sobre el documento', desc: 'Respuestas puntuales basadas en el contenido del PDF cargado.' },
]

// ── Component ──────────────────────────────────────────────────
export default function App() {
  return (
    <>
      {/* ── NAVBAR ── */}
      <nav className="nav">
        <div className="container nav__inner">
          <a href="#" className="nav__logo">
            <div className="nav__logo-icon">
              <LogoIcon />
            </div>
            Oxlo<span>Vision</span>
          </a>

          <ul className="nav__links">
            <li><a href="#features">Características</a></li>
            <li><a href="#how">Cómo funciona</a></li>
            <li><a href="#outputs">Outputs</a></li>
            <li><Link to="/app" className="nav__cta">Iniciar análisis</Link></li>
          </ul>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="hero">
        <div className="container hero__inner">
          {/* Left */}
          <div className="hero__content">
            <div className="hero__badge">
              <span className="badge-dot" />
              Para estudiantes, profesionales y equipos
            </div>

            <h1 className="hero__title">
              Cualquier PDF.<br />
              <em>Entendido</em> en minutos.
            </h1>

            <p className="hero__desc">
              Oxlo Vision transforma documentos PDF complejos en resúmenes,
              mapas y respuestas contextuales para estudiar, investigar,
              trabajar y decidir mejor.
            </p>

            <div className="hero__actions">
              <Link to="/app" className="btn-primary">
                <span>Iniciar análisis</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
              <a href="#how" className="btn-secondary">
                Ver demo
              </a>
            </div>
          </div>

          {/* Right — animated card */}
          <div className="hero__visual">
            <div className="hero__badge-float hero__badge-float--tl">
              <span className="badge-float-dot" />
              OCR + IA sobre cualquier PDF
            </div>

            <div className="hero__card">
              <div className="card__header">
                <div className="card__icon"><FiFileText /></div>
                <div>
                  <div className="card__filename">manual_redes_avanzadas.pdf</div>
                  <div className="card__size">2.4 MB · 87 páginas</div>
                </div>
              </div>

              <div className="card__progress">
                <div className="progress-label">
                  <span>Analizando documento…</span>
                  <span style={{ color: 'var(--cyan)' }}>87%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" />
                </div>
              </div>

              <div className="card__outputs">
                {[
                  { label: 'Resumen', active: true },
                  { label: 'Mapa conceptual', active: true },
                  { label: 'Puntos clave', active: false },
                  { label: 'Chat', active: false },
                ].map((o) => (
                  <div key={o.label} className={`output-chip ${o.active ? 'active' : ''}`}>
                    <span className="chip-dot" />
                    {o.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="hero__badge-float hero__badge-float--br">
              <span className="badge-float-dot" />
              Respuesta contextual en segundos
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="features" id="features">
        <div className="container">
          <div className="features__header">
            <div className="section-label">Capacidades</div>
            <h2 className="section-title">Análisis documental para todo tipo de perfiles</h2>
            <p className="section-desc">
              Desde estudiantes hasta ingenieros, abogados o equipos de negocio:
              sube un PDF y convierte contenido denso en conocimiento útil.
            </p>
          </div>

          <div className="features__grid">
            {features.map((f) => (
              <div className="feature-card" key={f.title}>
                <div className="feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="how" id="how">
        <div className="container how__inner">
          <div className="features__header how__header">
            <div className="section-label">Proceso</div>
            <h2 className="section-title">Flujo simple para cualquier documento</h2>
            <p className="section-desc">
              De PDF a información accionable en cuatro pasos.
            </p>
          </div>

          <div className="how__steps">
            {steps.map((s) => (
              <div className="step-card" key={s.num}>
                <div className="step-num">{s.num}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── OUTPUTS ── */}
      <section className="outputs" id="outputs">
        <div className="container outputs__inner">
          {/* Left — list */}
          <div>
            <div className="section-label">Outputs</div>
            <h2 className="section-title">Resultados listos para tu mesa de trabajo</h2>
            <p className="section-desc">
              Cada salida está pensada para estudio, investigación, redacción y trabajo colaborativo.
            </p>

            <div className="outputs__list">
              {outputs.map((o) => (
                <div className="output-item" key={o.title}>
                  <div className="output-item__icon">{o.icon}</div>
                  <div className="output-item__text">
                    <h4>{o.title}</h4>
                    <p>{o.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — code preview */}
          <div className="outputs__code">
            <div className="code-header">
              <span className="code-dot" />
              <span className="code-dot" />
              <span className="code-dot" />
              <span className="code-title">output.md — Oxlo Vision</span>
            </div>
            <div className="code-body">
              {[
                { ln: '1', parts: [{ cls: 'ck', t: '# ' }, { cls: 'cs', t: 'Resumen ejecutivo' }] },
                { ln: '2', parts: [] },
                { ln: '3', parts: [{ cls: 'cc', t: '> Documento técnico sobre arquitectura de microservicios y observabilidad.' }] },
                { ln: '4', parts: [] },
                { ln: '5', parts: [{ cls: 'ck', t: '## ' }, { cls: 'cm', t: 'Puntos clave' }] },
                { ln: '6', parts: [{ cls: 'cs', t: '- ' }, { cls: 'cc', t: 'El sistema reduce latencia media en un 18% tras separar el servicio de colas.' }] },
                { ln: '7', parts: [{ cls: 'cs', t: '- ' }, { cls: 'cc', t: 'Se recomienda trazabilidad distribuida para incidentes en producción.' }] },
                { ln: '8', parts: [{ cls: 'cs', t: '- ' }, { cls: 'cc', t: 'La adopción de métricas SLO mejora la priorización de errores críticos.' }] },
                { ln: '9', parts: [] },
                { ln: '10', parts: [{ cls: 'ck', t: '## ' }, { cls: 'cm', t: 'Mapa conceptual' }] },
                { ln: '11', parts: [{ cls: 'cc', t: '```mermaid' }] },
                { ln: '12', parts: [{ cls: 'cs', t: 'graph TD' }] },
                { ln: '13', parts: [{ cls: 'cc', t: '  A[Microservicios] --> B[Observabilidad]' }] },
                { ln: '14', parts: [{ cls: 'cc', t: '  A --> C[Escalabilidad]' }] },
                { ln: '15', parts: [{ cls: 'cc', t: '```' }] },
              ].map((row) => (
                <div className="code-line" key={row.ln}>
                  <span className="code-ln">{row.ln}</span>
                  <span>
                    {row.parts.map((p, i) => (
                      <span key={i} className={p.cls}>{p.t}</span>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="cta-banner" id="cta">
        <div className="container cta-banner__inner">
          <div className="hero__badge" style={{ marginBottom: 0 }}>
            <span className="badge-dot" />
            Sin tarjeta de crédito
          </div>
          <h2>
            Convierte PDFs extensos en<br />
            <span className="cyan">conocimiento accionable</span>
          </h2>
          <p>
            Carga tu documento, analiza con IA y consulta por chat contextual.
            Menos tiempo leyendo de forma manual, más tiempo creando valor.
          </p>
          <div className="cta-banner__actions">
            <Link to="/app" className="btn-primary">
              Probar con un PDF
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <a href="#features" className="btn-secondary">Ver características</a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="footer">
        <div className="container">
          <div className="footer__top">
            <div className="footer__brand">
              <a href="#" className="nav__logo" style={{ justifyContent: 'flex-start' }}>
                <div className="nav__logo-icon"><LogoIcon /></div>
                Oxlo<span>Vision</span>
              </a>
              <p>Plataforma de análisis de PDFs para estudiantes, profesionales y equipos de cualquier sector.</p>
            </div>

            <div className="footer__links">
              <div className="footer__col">
                <h5>Producto</h5>
                <a href="#features">Características</a>
                <a href="#how">Cómo funciona</a>
                <a href="#outputs">Outputs</a>
                <a href="#">Precios</a>
              </div>
              <div className="footer__col">
                <h5>Recursos</h5>
                <a href="#">Documentación</a>
                <a href="#">API</a>
                <a href="#">Changelog</a>
                <a href="#">Blog</a>
              </div>
              <div className="footer__col">
                <h5>Empresa</h5>
                <a href="#">Acerca de</a>
                <a href="#">Contacto</a>
                <a href="#">Privacidad</a>
                <a href="#">Términos</a>
              </div>
            </div>
          </div>

          <div className="footer__bottom">
            <span>© 2024 OxBuild — <span>Oxlo Vision</span>. Todos los derechos reservados.</span>
            
          </div>
        </div>
      </footer>
    </>
  )
}
