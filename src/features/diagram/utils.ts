import type { DiagramArtifact, DiagramKind } from './types'

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
