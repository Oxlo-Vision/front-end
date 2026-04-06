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
    desc: 'Extrae lo esencial de cualquier PDF en segundos. La IA comprende el contexto y genera resúmenes precisos y coherentes.',
  },
  {
    icon: <FiGitBranch />,
    title: 'Mapas Conceptuales',
    desc: 'Visualiza las relaciones entre ideas. Genera diagramas conectados automáticamente desde el contenido del documento.',
  },
  {
    icon: <FiBookOpen />,
    title: 'Mapas Mentales',
    desc: 'Transforma textos complejos en estructuras jerárquicas visuales, perfectas para el estudio y la retención.',
  },
  {
    icon: <FiTarget />,
    title: 'Puntos Clave',
    desc: 'Identifica y extrae los argumentos principales, datos críticos y conclusiones del documento de forma automática.',
  },
  {
    icon: <FiList />,
    title: 'Archivos .MD para IA',
    desc: 'Exporta en formato Markdown optimizado para GitHub Copilot y otros asistentes. Contexto listo para usar.',
  },
  {
    icon: <FiZap />,
    title: 'Skills & Integraciones',
    desc: 'Genera skills personalizadas para integrar el conocimiento del PDF en tus flujos de trabajo de IA favoritos.',
  },
]

const steps = [
  { num: '01', title: 'Sube tu PDF', desc: 'Arrastra o selecciona cualquier documento PDF desde tu dispositivo.' },
  { num: '02', title: 'Elige el modo', desc: 'Selecciona qué tipo de extracción necesitas: resumen, mapa, puntos clave…' },
  { num: '03', title: 'La IA procesa', desc: 'Nuestros modelos analizan el contenido con precisión y contexto completo.' },
  { num: '04', title: 'Descarga y usa', desc: 'Obtén tus resultados en segundos listos para usar o integrar.' },
]

const outputs = [
  { icon: <FiFileText />, title: 'Resumen ejecutivo', desc: 'Texto conciso con las ideas más importantes del documento.' },
  { icon: <FiLink2 />, title: 'Mapa conceptual', desc: 'Diagrama JSON/SVG listo para visualizar en cualquier herramienta.' },
  { icon: <FiGitBranch />, title: 'Mapa mental', desc: 'Estructura jerárquica exportable en formato compatible con MindNode y Miro.' },
  { icon: <FiTarget />, title: 'Puntos principales', desc: 'Lista curada de los argumentos y datos esenciales.' },
  { icon: <FiList />, title: 'Archivo .md', desc: 'Markdown optimizado como contexto para GitHub Copilot y otros LLMs.' },
  { icon: <FiTool />, title: 'Skill personalizada', desc: 'Integración lista para asistentes de IA como Copilot Chat.' },
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
            <li><Link to="/app" className="nav__cta">Empezar gratis</Link></li>
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
              Potenciado por IA · Versión Beta
            </div>

            <h1 className="hero__title">
              Tu PDF.<br />
              <em>Destilado</em> por IA.
            </h1>

            <p className="hero__desc">
              Oxlo Vision convierte documentos PDF complejos en resúmenes,
              mapas mentales, puntos clave y archivos .md listos para tus
              flujos de trabajo con IA — en segundos.
            </p>

            <div className="hero__actions">
              <Link to="/app" className="btn-primary">
                <span>Empezar gratis</span>
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
              98% precisión
            </div>

            <div className="hero__card">
              <div className="card__header">
                <div className="card__icon"><FiFileText /></div>
                <div>
                  <div className="card__filename">research_paper_2024.pdf</div>
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
                  { label: 'Mapa mental', active: true },
                  { label: 'Puntos clave', active: false },
                  { label: 'Archivo .md', active: false },
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
              5s procesado
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="features" id="features">
        <div className="container">
          <div className="features__header">
            <div className="section-label">Capacidades</div>
            <h2 className="section-title">Todo lo que necesitas de un PDF</h2>
            <p className="section-desc">
              Oxlo Vision no solo resume — comprende, estructura y produce
              información lista para humanos y para otras IAs.
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
            <h2 className="section-title">Simple y ultrarrápido</h2>
            <p className="section-desc">
              Cuatro pasos para convertir cualquier documento en conocimiento
              estructurado y accionable.
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
            <h2 className="section-title">Obtén exactamente lo que necesitas</h2>
            <p className="section-desc">
              Cada archivo generado está listo para usar directamente en tus herramientas
              favoritas de productividad e IA.
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
                { ln: '3', parts: [{ cls: 'cc', t: '> Este documento analiza los efectos de...' }] },
                { ln: '4', parts: [] },
                { ln: '5', parts: [{ cls: 'ck', t: '## ' }, { cls: 'cm', t: 'Puntos principales' }] },
                { ln: '6', parts: [{ cls: 'cs', t: '- ' }, { cls: 'cc', t: 'El modelo XYZ supera en 12%...' }] },
                { ln: '7', parts: [{ cls: 'cs', t: '- ' }, { cls: 'cc', t: 'Se identificaron 3 patrones clave...' }] },
                { ln: '8', parts: [{ cls: 'cs', t: '- ' }, { cls: 'cc', t: 'La metodología empleada fue...' }] },
                { ln: '9', parts: [] },
                { ln: '10', parts: [{ cls: 'ck', t: '## ' }, { cls: 'cm', t: 'Mapa Conceptual' }] },
                { ln: '11', parts: [{ cls: 'cc', t: '```mermaid' }] },
                { ln: '12', parts: [{ cls: 'cs', t: 'graph TD' }] },
                { ln: '13', parts: [{ cls: 'cc', t: '  A[Concepto raíz] --> B[Idea 1]' }] },
                { ln: '14', parts: [{ cls: 'cc', t: '  A --> C[Idea 2]' }] },
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
            Convierte tus PDFs en<br />
            <span className="cyan">superpoderes</span> para tu IA
          </h2>
          <p>
            Empieza gratis hoy. Sin configuración. Sin fricción.
            Solo sube tu PDF y deja que Oxlo Vision haga el resto.
          </p>
          <div className="cta-banner__actions">
            <Link to="/app" className="btn-primary">
              Empezar gratis — es gratis
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
              <p>Extractor de PDF potenciado por IA. Transforma documentos en conocimiento estructurado.</p>
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
            <span>Hecho con ❤️ y IA</span>
          </div>
        </div>
      </footer>
    </>
  )
}
