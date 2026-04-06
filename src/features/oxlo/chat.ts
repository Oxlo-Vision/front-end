import type { MindMapData } from '../mindmap/types'
import type { ConceptMapData } from '../conceptmap/types'

function getBackendUrl(): string {
  return import.meta.env.VITE_BACKEND_URL ?? '/api'
}

type CatalogEndpoint = {
  model: string
}

type CatalogResponse = {
  byCategory?: {
    reasoning?: CatalogEndpoint[]
  }
}

let cachedReasoningModel: string | null = null

async function resolveReasoningModel(): Promise<string> {
  if (cachedReasoningModel) {
    return cachedReasoningModel
  }

  try {
    const response = await fetch(`${getBackendUrl()}/api/ias`)
    if (!response.ok) {
      cachedReasoningModel = 'deepseek-v3.2'
      return cachedReasoningModel
    }

    const catalog = (await response.json()) as CatalogResponse
    const modelFromCatalog = catalog.byCategory?.reasoning?.[0]?.model
    cachedReasoningModel = modelFromCatalog || 'deepseek-v3.2'
  } catch {
    cachedReasoningModel = 'deepseek-v3.2'
  }

  return cachedReasoningModel
}

async function chatCompletions(messages: Array<{ role: 'system' | 'user'; content: string }>, maxTokens: number): Promise<string> {
  const model = await resolveReasoningModel()

  const response = await fetch(`${getBackendUrl()}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages,
    }),
  })

  if (!response.ok) {
    throw new Error(`Error Oxlo completions HTTP ${response.status}`)
  }

  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content

  if (!content || typeof content !== 'string') {
    throw new Error('Respuesta de Oxlo sin contenido util.')
  }

  return content.trim()
}

export async function generateSummaryWithOxlo(text: string): Promise<string> {
  const clippedText = text.slice(0, 14000)

  return chatCompletions(
    [
      {
        role: 'system',
        content: 'Eres un asistente que resume documentos tecnicos en espanol. Responde con claridad y precision.',
      },
      {
        role: 'user',
        content: `Resume este texto en espanol y agrega 5 puntos clave al final:\n\n${clippedText}`,
      },
    ],
    700,
  )
}

export async function generateMindMapWithOxlo(fileName: string, text: string, summary: string): Promise<MindMapData> {
  const clippedSummary = summary.slice(0, 2200)
  const clippedText = text.slice(0, 5000)

  const content = await chatCompletions(
    [
      {
        role: 'system',
        content: 'Responde solo JSON valido para mapa mental. No uses markdown.',
      },
      {
        role: 'user',
        content: `Crea un mapa mental en JSON con esta forma exacta: {"centralTopic":"string","branches":[{"title":"string","children":["string"]}]}.\n\nNombre archivo: ${fileName}\n\nResumen:\n${clippedSummary}\n\nTexto:\n${clippedText}`,
      },
    ],
    650,
  )

  const clean = content
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```/, '')
    .replace(/```$/, '')

  const parsed = JSON.parse(clean) as MindMapData

  if (!parsed.centralTopic || !Array.isArray(parsed.branches)) {
    throw new Error('JSON de mapa mental invalido.')
  }

  return {
    centralTopic: parsed.centralTopic,
    branches: parsed.branches
      .filter((branch) => branch && typeof branch.title === 'string')
      .map((branch) => ({
        title: branch.title,
        children: Array.isArray(branch.children) ? branch.children.filter((child) => typeof child === 'string') : [],
      }))
      .slice(0, 8),
  }
}

export async function generateConceptMapWithOxlo(fileName: string, text: string, summary: string): Promise<ConceptMapData> {
  const clippedSummary = summary.slice(0, 2200)
  const clippedText = text.slice(0, 6000)

  const content = await chatCompletions(
    [
      {
        role: 'system',
        content: 'Responde solo JSON valido para mapa conceptual. No uses markdown.',
      },
      {
        role: 'user',
        content:
          `Genera un mapa conceptual del documento y responde JSON con este esquema exacto: ` +
          `{"title":"string","nodes":[{"id":"string","label":"string","kind":"core|concept|detail"}],"relations":[{"source":"string","target":"string","label":"string"}]}. ` +
          `Usa ids cortos y unicos, al menos 5 nodos y 4 relaciones.\n\n` +
          `Archivo: ${fileName}\n\nResumen:\n${clippedSummary}\n\nTexto:\n${clippedText}`,
      },
    ],
    900,
  )

  const clean = content
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```/, '')
    .replace(/```$/, '')

  const parsed = JSON.parse(clean) as ConceptMapData

  if (!parsed.title || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.relations)) {
    throw new Error('JSON de mapa conceptual invalido.')
  }

  return {
    title: parsed.title,
    nodes: parsed.nodes
      .filter((node) => node && typeof node.id === 'string' && typeof node.label === 'string')
      .map((node) => ({
        id: node.id,
        label: node.label,
        kind: node.kind,
      }))
      .slice(0, 20),
    relations: parsed.relations
      .filter((relation) => relation && typeof relation.source === 'string' && typeof relation.target === 'string')
      .map((relation) => ({
        source: relation.source,
        target: relation.target,
        label: typeof relation.label === 'string' ? relation.label : 'relaciona',
      }))
      .slice(0, 30),
  }
}
