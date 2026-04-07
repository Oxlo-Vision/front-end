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
    title: 'Smart Summaries',
    desc: 'Turn long PDFs into clear, actionable summaries while preserving the document context.',
  },
  {
    icon: <FiGitBranch />,
    title: 'Concept Maps',
    desc: 'Organize ideas, concepts, and relationships into clear diagrams for study, explanation, and presentations.',
  },
  {
    icon: <FiBookOpen />,
    title: 'Mind Maps',
    desc: 'Structure content in hierarchical branches to learn faster and retain what matters.',
  },
  {
    icon: <FiTarget />,
    title: 'Key Points',
    desc: 'Automatically identify the most relevant findings for studying, research, and decision-making.',
  },
  {
    icon: <FiZap />,
    title: 'Contextual Document Chat',
    desc: 'Ask natural-language questions about the PDF and get answers grounded in its content.',
  },
  {
    icon: <FiList />,
    title: 'Ready-to-Use Exports',
    desc: 'Download Markdown and extracted text to share, document, or reuse in other workflows.',
  },
]

const steps = [
  { num: '01', title: 'Upload any PDF', desc: 'Upload notes, papers, manuals, contracts, reports, or technical documentation.' },
  { num: '02', title: 'Extraction and OCR', desc: 'The platform reads content and recovers text even from scanned documents.' },
  { num: '03', title: 'AI Analysis', desc: 'Generate summaries, maps, and key points to understand documents faster.' },
  { num: '04', title: 'Ask and Export', desc: 'Chat about the content and download ready-to-use outputs.' },
]

const outputs = [
  { icon: <FiFileText />, title: 'Executive Summary', desc: 'Clear synthesis of the most relevant ideas in the PDF.' },
  { icon: <FiLink2 />, title: 'Concept Map', desc: 'Visual relationships between key document concepts.' },
  { icon: <FiGitBranch />, title: 'Mind Map', desc: 'Hierarchical structure to study or explain complex content.' },
  { icon: <FiTarget />, title: 'Key Points', desc: 'Prioritized list of important findings for quick action.' },
  { icon: <FiList />, title: 'Extracted Text and Markdown', desc: 'Files ready to share, review, or use with AI assistants.' },
  { icon: <FiTool />, title: 'Document Chat', desc: 'Focused answers grounded in the uploaded PDF content.' },
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
            <li><a href="#features">Features</a></li>
            <li><a href="#how">How it works</a></li>
            <li><a href="#outputs">Outputs</a></li>
            <li><Link to="/app" className="nav__cta">Start analysis</Link></li>
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
              For students, professionals, and teams
            </div>

            <h1 className="hero__title">
              Any PDF.<br />
              <em>Understood</em> in minutes.
            </h1>

            <p className="hero__desc">
              Oxlo Vision transforms complex PDFs into summaries,
              maps, and contextual answers for studying, research,
              work, and faster decision-making.
            </p>

            <div className="hero__actions">
              <Link to="/app" className="btn-primary">
                <span>Start analysis</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </Link>
              <a href="#how" className="btn-secondary">
                View demo
              </a>
            </div>
          </div>

          {/* Right — animated card */}
          <div className="hero__visual">
            <div className="hero__badge-float hero__badge-float--tl">
              <span className="badge-float-dot" />
              OCR + AI on any PDF
            </div>

            <div className="hero__card">
              <div className="card__header">
                <div className="card__icon"><FiFileText /></div>
                <div>
                  <div className="card__filename">document.pdf</div>
                  <div className="card__size">2.4 MB · 87 pages</div>
                </div>
              </div>

              <div className="card__progress">
                <div className="progress-label">
                  <span>Analyzing document...</span>
                  <span style={{ color: 'var(--cyan)' }}>87%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" />
                </div>
              </div>

              <div className="card__outputs">
                {[
                  { label: 'Summary', active: true },
                  { label: 'Concept map', active: true },
                  { label: 'Key points', active: false },
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
              Contextual answers in seconds
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="features" id="features">
        <div className="container">
          <div className="features__header">
            <div className="section-label">Capabilities</div>
            <h2 className="section-title">Document analysis for every profile</h2>
            <p className="section-desc">
              From students to engineers, lawyers, and business teams:
              upload a PDF and turn dense content into useful knowledge.
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
            <div className="section-label">Process</div>
            <h2 className="section-title">Simple workflow for any document</h2>
            <p className="section-desc">
              From PDF to actionable information in four steps.
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
            <h2 className="section-title">Results ready for your workflow</h2>
            <p className="section-desc">
              Each output is designed for study, research, writing, and collaboration.
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
                { ln: '1', parts: [{ cls: 'ck', t: '# ' }, { cls: 'cs', t: 'Executive summary' }] },
                { ln: '2', parts: [] },
                { ln: '3', parts: [{ cls: 'cc', t: '> Technical document on microservices architecture and observability.' }] },
                { ln: '4', parts: [] },
                { ln: '5', parts: [{ cls: 'ck', t: '## ' }, { cls: 'cm', t: 'Key points' }] },
                { ln: '6', parts: [{ cls: 'cs', t: '- ' }, { cls: 'cc', t: 'The system reduced average latency by 18% after splitting the queue service.' }] },
                { ln: '7', parts: [{ cls: 'cs', t: '- ' }, { cls: 'cc', t: 'Distributed tracing is recommended for production incident diagnosis.' }] },
                { ln: '8', parts: [{ cls: 'cs', t: '- ' }, { cls: 'cc', t: 'Adopting SLO metrics improves prioritization of critical errors.' }] },
                { ln: '9', parts: [] },
                { ln: '10', parts: [{ cls: 'ck', t: '## ' }, { cls: 'cm', t: 'Concept map' }] },
                { ln: '11', parts: [{ cls: 'cc', t: '```mermaid' }] },
                { ln: '12', parts: [{ cls: 'cs', t: 'graph TD' }] },
                { ln: '13', parts: [{ cls: 'cc', t: '  A[Microservices] --> B[Observability]' }] },
                { ln: '14', parts: [{ cls: 'cc', t: '  A --> C[Scalability]' }] },
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
            No credit card required
          </div>
          <h2>
            Turn long PDFs into<br />
            <span className="cyan">actionable knowledge</span>
          </h2>
          <p>
            Upload your document, analyze it with AI, and ask contextual questions by chat.
            Less manual reading, more time creating value.
          </p>
          <div className="cta-banner__actions">
            <Link to="/app" className="btn-primary">
              Try with a PDF
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>
            <a href="#features" className="btn-secondary">View features</a>
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
              <p>PDF analysis platform for students, professionals, and teams across industries.</p>
            </div>

            <div className="footer__links">
              <div className="footer__col">
                <h5>Product</h5>
                <a href="#features">Features</a>
                <a href="#how">How it works</a>
                <a href="#outputs">Outputs</a>
                <a href="#">Pricing</a>
              </div>
              <div className="footer__col">
                <h5>Resources</h5>
                <a href="#">Documentation</a>
                <a href="#">API</a>
                <a href="#">Changelog</a>
                <a href="#">Blog</a>
              </div>
              <div className="footer__col">
                <h5>Company</h5>
                <a href="#">About</a>
                <a href="#">Contact</a>
                <a href="#">Privacy</a>
                <a href="#">Terms</a>
              </div>
            </div>
          </div>

          <div className="footer__bottom">
            <span>© 2024 OxBuild — <span>Oxlo Vision</span>. All rights reserved.</span>
            
          </div>
        </div>
      </footer>
    </>
  )
}
