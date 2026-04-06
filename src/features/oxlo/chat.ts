import type { MindMapData } from '../mindmap/types'
import type { ConceptMapData } from '../conceptmap/types'
import type { DiagramArtifact, DiagramKind } from '../diagram/types'
import { normalizeMermaidScript } from '../diagram/utils'
import type { SkillFile } from '../skills/types'

function getBackendUrl(): string {
  return import.meta.env.VITE_BACKEND_URL ?? '/api'
}

type CatalogEndpoint = {
  category?: string
  displayName?: string
  model: string
  apiPath?: string
}

type CatalogResponse = {
  byCategory?: Record<string, CatalogEndpoint[]>
}

export type ChatModelOption = {
  category: string
  displayName: string
  model: string
  strengthScore: number
}

let cachedReasoningModel: string | null = null
let cachedChatModelOptions: ChatModelOption[] | null = null

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function estimateStrengthScore(model: string, category: string): number {
  const lower = model.toLowerCase()

  const billionMatch = lower.match(/(\d+(?:\.\d+)?)b/)
  const millionMatch = lower.match(/(\d+(?:\.\d+)?)m/)

  let score = 0

  if (billionMatch) {
    score += Math.round(Number.parseFloat(billionMatch[1]) * 100)
  } else if (millionMatch) {
    score += Math.round(Number.parseFloat(millionMatch[1]))
  }

  if (lower.includes('thinking')) score += 120
  if (lower.includes('r1')) score += 80
  if (lower.includes('v3')) score += 60
  if (lower.includes('oss')) score += 40
  if (lower.includes('claw')) score += 140

  if (category === 'reasoning') score += 35
  if (category === 'coding') score += 20

  return score
}

function fallbackChatModels(): ChatModelOption[] {
  const fallback = [
    { category: 'chat', displayName: 'Llama 3.2 3B', model: 'llama-3.2-3b' },
    { category: 'chat', displayName: 'Gemma 3 4B', model: 'gemma-3-4b' },
    { category: 'chat', displayName: 'Mistral 7B', model: 'mistral-7b' },
    { category: 'reasoning', displayName: 'DeepSeek R1 8B', model: 'deepseek-r1-8b' },
    { category: 'chat', displayName: 'Llama 3.1 8B', model: 'llama-3.1-8b' },
    { category: 'chat', displayName: 'Ministral 14B', model: 'ministral-14b' },
    { category: 'reasoning', displayName: 'GPT-OSS 20B', model: 'gpt-oss-20b' },
    { category: 'chat', displayName: 'Gemma 3 27B', model: 'gemma-3-27b' },
    { category: 'chat', displayName: 'Qwen 3 32B', model: 'qwen-3-32b' },
    { category: 'reasoning', displayName: 'DeepSeek R1 70B', model: 'deepseek-r1-70b' },
    { category: 'reasoning', displayName: 'GPT-OSS 120B', model: 'gpt-oss-120b' },
    { category: 'reasoning', displayName: 'Oxlo Claw Model', model: 'oxlo-claw' },
  ]

  return fallback
    .map((item) => ({
      ...item,
      strengthScore: estimateStrengthScore(item.model, item.category),
    }))
    .sort((a, b) => a.strengthScore - b.strengthScore || a.displayName.localeCompare(b.displayName))
}

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

async function chatCompletions(
  messages: Array<{ role: 'system' | 'user'; content: string }>,
  maxTokens: number,
  modelOverride?: string,
): Promise<string> {
  const model = modelOverride ?? await resolveReasoningModel()

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 45000)

    try {
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
        signal: controller.signal,
      })

      if (!response.ok) {
        const transient = response.status === 502 || response.status === 503 || response.status === 504

        if (transient && attempt === 0) {
          await delay(700)
          continue
        }

        if (response.status === 504) {
          throw new Error('Oxlo tardo demasiado en responder (504 Gateway Timeout). Intenta de nuevo o usa un modelo mas ligero.')
        }

        throw new Error(`Error Oxlo completions HTTP ${response.status}`)
      }

      const data = await response.json()
      const content = data?.choices?.[0]?.message?.content

      if (!content || typeof content !== 'string') {
        throw new Error('Respuesta de Oxlo sin contenido util.')
      }

      return content.trim()
    } catch (error) {
      const isAbort = error instanceof DOMException && error.name === 'AbortError'

      if ((isAbort || error instanceof TypeError) && attempt === 0) {
        await delay(700)
        continue
      }

      if (isAbort) {
        throw new Error('Tiempo de espera agotado al llamar Oxlo. Intenta con una pregunta mas corta o un modelo mas ligero.')
      }

      throw error
    } finally {
      clearTimeout(timeoutId)
    }
  }

  throw new Error('No se pudo completar la solicitud a Oxlo tras reintento.')
}

export async function getChatModelOptions(): Promise<ChatModelOption[]> {
  if (cachedChatModelOptions && cachedChatModelOptions.length > 0) {
    return cachedChatModelOptions
  }

  try {
    const response = await fetch(`${getBackendUrl()}/api/ias`)
    if (!response.ok) {
      cachedChatModelOptions = fallbackChatModels()
      return cachedChatModelOptions
    }

    const catalog = (await response.json()) as CatalogResponse
    const source = catalog.byCategory ?? {}
    const chatCategories = ['chat', 'reasoning', 'coding']

    const merged = chatCategories.flatMap((category) => {
      const items = source[category] ?? []
      return items
        .filter((item) => typeof item.model === 'string' && (item.apiPath ?? '/v1/chat/completions') === '/v1/chat/completions')
        .map((item) => ({
          category,
          displayName: item.displayName || item.model,
          model: item.model,
          strengthScore: estimateStrengthScore(item.model, category),
        }))
    })

    const dedup = new Map<string, ChatModelOption>()
    merged.forEach((item) => {
      if (!dedup.has(item.model)) {
        dedup.set(item.model, item)
      }
    })

    const sorted = Array.from(dedup.values()).sort(
      (a, b) => a.strengthScore - b.strengthScore || a.displayName.localeCompare(b.displayName),
    )

    cachedChatModelOptions = sorted.length > 0 ? sorted : fallbackChatModels()
  } catch {
    cachedChatModelOptions = fallbackChatModels()
  }

  return cachedChatModelOptions
}

export async function chatAboutPdfWithOxlo(params: {
  model: string
  question: string
  fileName: string
  extractedText: string
  summary: string
  keyPoints: string[]
}): Promise<string> {
  const contextText = params.extractedText.slice(0, 12000)
  const summaryText = params.summary.slice(0, 2200)
  const keyPointsText = params.keyPoints.slice(0, 10).map((point) => `- ${point}`).join('\n')

  return chatCompletions(
    [
      {
        role: 'system',
        content:
          'Responde en espanol usando el contexto del PDF cargado. Si la pregunta no se puede responder con el contexto, dilo claramente y sugiere que suban otro documento.',
      },
      {
        role: 'user',
        content:
          `Archivo: ${params.fileName}\n\nResumen del PDF:\n${summaryText}\n\nPuntos clave:\n${keyPointsText || '- Sin puntos clave.'}` +
          `\n\nTexto del PDF (recortado):\n${contextText}\n\nPregunta del usuario:\n${params.question}`,
      },
    ],
    900,
    params.model,
  )
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

export async function generateDiagramWithOxlo(fileName: string, text: string, summary: string): Promise<DiagramArtifact> {
  const clippedSummary = summary.slice(0, 2200)
  const clippedText = text.slice(0, 6500)

  const content = await chatCompletions(
    [
      {
        role: 'system',
        content: 'Responde solo JSON valido sin markdown. Debes elegir el tipo de diagrama mas adecuado segun el contexto.',
      },
      {
        role: 'user',
        content:
          `Genera un diagrama contextual para este documento. ` +
          `NO uses ER si el documento no trata de datos/entidades relacionales (por ejemplo biologia, historia, derecho). ` +
          `Responde JSON exacto: ` +
          `{"kind":"uml_class|uml_sequence|er|flowchart","title":"string","rationale":"string","mermaid":"string"}. ` +
          `El campo mermaid debe ser codigo Mermaid valido del tipo elegido.\n\n` +
          `Archivo: ${fileName}\n\nResumen:\n${clippedSummary}\n\nTexto:\n${clippedText}`,
      },
    ],
    1000,
  )

  const clean = content
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```/, '')
    .replace(/```$/, '')

  const parsed = JSON.parse(clean) as DiagramArtifact
  const allowedKinds: DiagramKind[] = ['uml_class', 'uml_sequence', 'er', 'flowchart']

  if (!parsed.kind || !allowedKinds.includes(parsed.kind) || !parsed.mermaid || !parsed.title) {
    throw new Error('JSON de diagrama invalido.')
  }

  const normalizedMermaid = normalizeMermaidScript(parsed.mermaid, parsed.kind)

  return {
    kind: parsed.kind,
    title: parsed.title,
    rationale: parsed.rationale || 'Seleccionado por contexto del documento.',
    mermaid: normalizedMermaid,
  }
}

type SkillResponse = {
  files: Array<{
    fileName: string
    description: string
    content: string
  }>
}

export async function generateSkillFilesWithOxlo(
  fileName: string,
  summary: string,
  keyPoints: string[],
  markdown: string,
): Promise<SkillFile[]> {
  const clippedSummary = summary.slice(0, 2000)
  const clippedMarkdown = markdown.slice(0, 6500)
  const points = keyPoints.slice(0, 8).map((point) => `- ${point}`).join('\n') || '- Sin puntos clave suficientes.'

  const content = await chatCompletions(
    [
      {
        role: 'system',
        content: 'Responde solo JSON valido sin markdown.',
      },
      {
        role: 'user',
        content:
          `Crea archivos de skills reutilizables para asistentes IA sobre este PDF. ` +
          `Responde JSON exacto: {"files":[{"fileName":"string","description":"string","content":"string"}]}. ` +
          `Genera exactamente 2 o 3 archivos Markdown, incluyendo un prompt operativo y una base de conocimiento.\n\n` +
          `Archivo: ${fileName}\n\nResumen:\n${clippedSummary}\n\nPuntos clave:\n${points}\n\nMarkdown:\n${clippedMarkdown}`,
      },
    ],
    1200,
  )

  const clean = content
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```/, '')
    .replace(/```$/, '')

  const parsed = JSON.parse(clean) as SkillResponse

  if (!Array.isArray(parsed.files) || parsed.files.length === 0) {
    throw new Error('JSON de skills invalido.')
  }

  return parsed.files
    .filter((file) => file && typeof file.fileName === 'string' && typeof file.content === 'string')
    .map((file) => ({
      fileName: file.fileName,
      description: typeof file.description === 'string' ? file.description : 'Skill generado por IA.',
      content: file.content,
    }))
    .slice(0, 4)
}
