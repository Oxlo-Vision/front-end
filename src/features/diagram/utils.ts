import type { DiagramArtifact, DiagramKind } from './types'

const SEQUENCE_ARROW_PATTERN = /(->>|-->>|->|-->|<-|<--|<->|--x|x--|o->|o-->|==>|<==)/

function sanitizeLabel(text: string): string {
  return text
    .replace(/[\[\]{}()<>|"'`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80)
}

export function buildSafeFlowchartFromText(source: string): string {
  const lines = source
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !line.startsWith('```'))
    .map((line) => line.replace(/^[-*\d.)\s]+/, '').trim())
    .map(sanitizeLabel)
    .filter((line) => line.length > 0)
    .slice(0, 6)

  const nodes = lines.length > 0 ? lines : ['Contexto detectado', 'Analisis', 'Resultado']
  const ids = ['A', 'B', 'C', 'D', 'E', 'F', 'G']
  const graphLines: string[] = ['flowchart TD']

  nodes.forEach((label, index) => {
    graphLines.push(`  ${ids[index]}[${label}]`)
    if (index > 0) {
      graphLines.push(`  ${ids[index - 1]} --> ${ids[index]}`)
    }
  })

  return graphLines.join('\n')
}

function stripCodeFences(source: string): string {
  return source
    .trim()
    .replace(/^```mermaid\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/, '')
    .trim()
}

function detectMermaidKind(source: string): DiagramKind | null {
  const firstLine = source.split('\n').find((line) => line.trim().length > 0)?.trim().toLowerCase() ?? ''

  if (firstLine.startsWith('sequenceDiagram'.toLowerCase())) return 'uml_sequence'
  if (firstLine.startsWith('classDiagram'.toLowerCase())) return 'uml_class'
  if (firstLine.startsWith('erDiagram'.toLowerCase())) return 'er'
  if (firstLine.startsWith('flowchart') || firstLine.startsWith('graph ')) return 'flowchart'

  return null
}

function sanitizeSequenceLines(lines: string[]): string[] {
  const kept = lines.filter((line, index) => {
    const trimmed = line.trim()

    if (trimmed.length === 0) return false
    if (index === 0 && trimmed.toLowerCase().startsWith('sequencediagram')) return true
    if (trimmed.startsWith('%%')) return true

    const lower = trimmed.toLowerCase()
    if (
      lower.startsWith('participant ') ||
      lower.startsWith('actor ') ||
      lower.startsWith('note ') ||
      lower.startsWith('title ') ||
      lower === 'alt' ||
      lower.startsWith('alt ') ||
      lower === 'else' ||
      lower.startsWith('else ') ||
      lower.startsWith('opt ') ||
      lower.startsWith('loop ') ||
      lower.startsWith('par ') ||
      lower.startsWith('and ') ||
      lower === 'end' ||
      lower.startsWith('autonumber')
    ) {
      return true
    }

    return SEQUENCE_ARROW_PATTERN.test(trimmed)
  })

  const hasArrow = kept.some((line) => SEQUENCE_ARROW_PATTERN.test(line))
  if (!hasArrow) {
    return [
      'sequenceDiagram',
      '  actor Usuario',
      '  participant Sistema',
      '  Usuario->>Sistema: Solicitud',
      '  Sistema-->>Usuario: Respuesta',
    ]
  }

  if (!kept[0] || !kept[0].trim().toLowerCase().startsWith('sequencediagram')) {
    return ['sequenceDiagram', ...kept.map((line) => (line.startsWith('  ') ? line : `  ${line.trim()}`))]
  }

  return kept
}

export function normalizeMermaidScript(source: string, preferredKind?: DiagramKind): string {
  const clean = stripCodeFences(source)
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .trim()

  if (!clean) {
    return 'flowchart TD\n  A[Sin datos] --> B[No se pudo generar diagrama]'
  }

  const detectedKind = detectMermaidKind(clean)
  const guessedKind = preferredKind ?? detectedKind ?? 'flowchart'

  if (!detectedKind && !preferredKind) {
    return buildSafeFlowchartFromText(clean)
  }

  const lines = clean
    .split('\n')
    .map((line) => line.replace(/\t/g, '  ').replace(/[\u200B-\u200D\uFEFF]/g, '').trimRight())

  if (guessedKind === 'uml_sequence') {
    return sanitizeSequenceLines(lines).join('\n')
  }

  if (guessedKind === 'uml_class' && !lines[0]?.trim().toLowerCase().startsWith('classdiagram')) {
    return ['classDiagram', ...lines].join('\n')
  }

  if (guessedKind === 'er' && !lines[0]?.trim().toLowerCase().startsWith('erdiagram')) {
    return ['erDiagram', ...lines].join('\n')
  }

  if (guessedKind === 'flowchart') {
    const startsWithFlow = lines[0]?.trim().toLowerCase().startsWith('flowchart') || lines[0]?.trim().toLowerCase().startsWith('graph ')
    if (!startsWithFlow) {
      return buildSafeFlowchartFromText(clean)
    }

    // Keep only arrow/node declarations to avoid free text parse failures.
    const safeFlowLines = lines.filter((line, index) => {
      const trimmed = line.trim()
      if (index === 0) return true
      if (trimmed.length === 0) return false
      if (trimmed.startsWith('%%')) return true
      if (trimmed.includes('-->') || trimmed.includes('---')) return true
      if (/^[A-Za-z0-9_]+\s*\[/.test(trimmed)) return true
      if (/^[A-Za-z0-9_]+\s*\(/.test(trimmed)) return true
      if (/^[A-Za-z0-9_]+\s*\{/.test(trimmed)) return true
      return false
    })

    if (safeFlowLines.length <= 1) {
      return buildSafeFlowchartFromText(clean)
    }

    return safeFlowLines.join('\n')
  }

  return lines.join('\n').trim()
}

function hasAny(text: string, words: string[]): boolean {
  const lower = text.toLowerCase()
  return words.some((word) => lower.includes(word))
}

function pickDiagramKind(text: string): DiagramKind {
  const lower = text.toLowerCase()

  const bioWords = ['celula', 'biologia', 'gen', 'proteina', 'tejido', 'organismo', 'ecosistema']
  const dbWords = ['tabla', 'database', 'base de datos', 'sql', 'relacion', 'entidad', 'atributo', 'llave']
  const codeWords = ['clase', 'objeto', 'metodo', 'atributo', 'java', 'typescript', 'api', 'servicio']
  const sequenceWords = ['paso', 'flujo', 'proceso', 'interaccion', 'request', 'response', 'mensaje']

  if (!hasAny(lower, bioWords) && hasAny(lower, dbWords)) {
    return 'er'
  }

  if (hasAny(lower, codeWords)) {
    return 'uml_class'
  }

  if (hasAny(lower, sequenceWords)) {
    return 'uml_sequence'
  }

  return 'flowchart'
}

export function fallbackDiagram(fileName: string, summary: string, text: string, keyPoints: string[]): DiagramArtifact {
  const selectedKind = pickDiagramKind(`${summary}\n${text}`)
  const title = fileName || 'Documento'

  if (selectedKind === 'er') {
    return {
      kind: 'er',
      title: `${title} - Diagrama ER`,
      rationale: 'Se detecto terminologia de datos y relaciones; ER es el formato mas util.',
      mermaid: [
        'erDiagram',
        '  ENTIDAD_PRINCIPAL ||--o{ ITEM : contiene',
        '  ENTIDAD_PRINCIPAL {',
        '    string id',
        '    string nombre',
        '    string estado',
        '  }',
        '  ITEM {',
        '    string id',
        '    string descripcion',
        '    string tipo',
        '  }',
      ].join('\n'),
    }
  }

  if (selectedKind === 'uml_class') {
    return {
      kind: 'uml_class',
      title: `${title} - UML Clases`,
      rationale: 'Se detecto contexto tecnico de software; UML de clases describe mejor la estructura.',
      mermaid: [
        'classDiagram',
        '  class Documento {',
        '    +string titulo',
        '    +string resumen',
        '    +extraerTexto()',
        '  }',
        '  class Analizador {',
        '    +generarResumen()',
        '    +generarMapa()',
        '  }',
        '  class Resultado {',
        '    +string tipo',
        '    +string contenido',
        '  }',
        '  Documento --> Analizador : procesa',
        '  Analizador --> Resultado : produce',
      ].join('\n'),
    }
  }

  if (selectedKind === 'uml_sequence') {
    return {
      kind: 'uml_sequence',
      title: `${title} - UML Secuencia`,
      rationale: 'El documento describe interacciones por pasos; UML secuencia representa el flujo temporal.',
      mermaid: [
        'sequenceDiagram',
        '  actor Usuario',
        '  participant Front as Frontend',
        '  participant Back as Backend',
        '  participant IA as Oxlo',
        '  Usuario->>Front: Sube PDF',
        '  Front->>Back: Solicita analisis',
        '  Back->>IA: /v1/chat/completions',
        '  IA-->>Back: Resumen y estructura',
        '  Back-->>Front: Resultado',
        '  Front-->>Usuario: Muestra diagrama',
      ].join('\n'),
    }
  }

  const flowNodes = keyPoints.slice(0, 4)
  return {
    kind: 'flowchart',
    title: `${title} - Flujo`,
    rationale: 'No se detecto una ontologia de software o datos; se usa flujo general contextual.',
    mermaid: [
      'flowchart TD',
      `  A[${title}] --> B[${flowNodes[0] || 'Contexto principal'}]`,
      `  B --> C[${flowNodes[1] || 'Analisis'}]`,
      `  C --> D[${flowNodes[2] || 'Resultado'}]`,
      `  D --> E[${flowNodes[3] || 'Conclusion'}]`,
    ].join('\n'),
  }
}

export function diagramKindLabel(kind: DiagramKind): string {
  switch (kind) {
    case 'uml_class':
      return 'UML Class'
    case 'uml_sequence':
      return 'UML Sequence'
    case 'er':
      return 'ER Diagram'
    case 'flowchart':
      return 'Flowchart'
    default:
      return kind
  }
}

export function diagramFileExtension(): string {
  return 'mmd'
}
