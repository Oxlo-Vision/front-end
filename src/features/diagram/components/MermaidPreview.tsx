import { useEffect, useId, useState } from 'react'
import { buildSafeFlowchartFromText, normalizeMermaidScript } from '../utils'

type MermaidPreviewProps = {
  chart: string
}

let mermaidInitialized = false

export function MermaidPreview({ chart }: MermaidPreviewProps) {
  const [svg, setSvg] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const renderId = useId().replace(/:/g, '-')

  useEffect(() => {
    const run = async () => {
      if (!chart.trim()) {
        setSvg('')
        setError(null)
        return
      }

      try {
        const mermaidModule = await import('mermaid')
        const mermaid = mermaidModule.default
        const normalized = normalizeMermaidScript(chart)

        if (!mermaidInitialized) {
          mermaid.initialize({
            startOnLoad: false,
            theme: 'dark',
            securityLevel: 'loose',
            fontFamily: 'IBM Plex Sans, Inter, sans-serif',
          })
          mermaidInitialized = true
        }

        try {
          const { svg: output } = await mermaid.render(`mermaid-${renderId}`, normalized)
          setSvg(output)
          setError(null)
        } catch {
          const rescue = buildSafeFlowchartFromText(normalized)
          const { svg: output } = await mermaid.render(`mermaid-${renderId}-rescue`, rescue)
          setSvg(output)
          setError(null)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'No se pudo renderizar el diagrama Mermaid.'
        setError(message)
        setSvg('')
      }
    }

    void run()
  }, [chart, renderId])

  if (error) {
    return <div className="mermaid-error">Error Mermaid: {error}</div>
  }

  if (!svg) {
    return <div className="mermaid-loading">Renderizando diagrama...</div>
  }

  return <div className="mermaid-preview" dangerouslySetInnerHTML={{ __html: svg }} />
}
