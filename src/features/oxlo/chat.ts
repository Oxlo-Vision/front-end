import type { MindMapData } from '../mindmap/types'
import type { ConceptMapData } from '../conceptmap/types'
import type { DiagramArtifact, DiagramKind } from '../diagram/types'
import { normalizeMermaidScript } from '../diagram/utils'
import type { SkillFile } from '../skills/types'

function getBackendUrl(): string {
  return (import.meta.env.VITE_BACKEND_URL ?? '').replace(/\/$/, '')
}

function getCatalogUrl(): string {
  const base = getBackendUrl()

  if (!base || base === '/api') {
    return '/api/ias'
  }

  return `${base}/api/ias`
}

function getChatCompletionsUrl(): string {
  const base = getBackendUrl()

  if (!base || base === '/api') {
    return '/api/v1/chat/completions'
  }

  return `${base}/v1/chat/completions`
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

async function readErrorDetail(response: Response): Promise<string> {
  try {
    const text = await response.text()
    if (!text) return ''

    try {
      const parsed = JSON.parse(text) as { error?: unknown; message?: unknown; details?: unknown }
      const candidates = [parsed.error, parsed.message, parsed.details]
      const picked = candidates.find((value) => typeof value === 'string' && value.trim().length > 0)
      return typeof picked === 'string' ? picked.trim() : text.slice(0, 260)
    } catch {
      return text.slice(0, 260)
    }
  } catch {
    return ''
  }
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
    const response = await fetch(getCatalogUrl())
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
  let activeModel = modelOverride ?? await resolveReasoningModel()
  let usedFallbackModel = false

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 45000)

    try {
      const response = await fetch(getChatCompletionsUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: activeModel,
          max_tokens: maxTokens,
          messages,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const transient = response.status === 502 || response.status === 503 || response.status === 504
        const detail = await readErrorDetail(response)

        if (transient && attempt === 0) {
          await delay(700)
          continue
        }

        if (response.status === 500 && !usedFallbackModel && activeModel !== 'deepseek-v3.2') {
          activeModel = 'deepseek-v3.2'
          usedFallbackModel = true
          await delay(450)
          continue
        }

        if (response.status === 504) {
          throw new Error('oxlo.ai is currently under high demand and did not respond in time (504). Please try again in a few seconds or use a lighter model.')
        }

        const suffix = detail ? `: ${detail}` : ''
        throw new Error(`Error Oxlo completions HTTP ${response.status} (${activeModel})${suffix}`)
      }

      const data = await response.json()
      const content = data?.choices?.[0]?.message?.content

      if (!content || typeof content !== 'string') {
        throw new Error('Oxlo response did not contain usable content.')
      }

      return content.trim()
    } catch (error) {
      const isAbort = error instanceof DOMException && error.name === 'AbortError'

      if ((isAbort || error instanceof TypeError) && attempt === 0) {
        await delay(700)
        continue
      }

      if (isAbort) {
        throw new Error('Request to Oxlo timed out. Try a shorter question or a lighter model.')
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
    const response = await fetch(getCatalogUrl())
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
          'Answer in English using the uploaded PDF context. If the question cannot be answered from the context, say so clearly and suggest uploading another document.',
      },
      {
        role: 'user',
        content:
          `File: ${params.fileName}\n\nPDF summary:\n${summaryText}\n\nKey points:\n${keyPointsText || '- No key points available.'}` +
          `\n\nPDF text (trimmed):\n${contextText}\n\nUser question:\n${params.question}`,
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
        content: 'You are an assistant that summarizes technical documents in English. Respond clearly and precisely.',
      },
      {
        role: 'user',
        content: `Summarize this text in English and add 5 key points at the end:\n\n${clippedText}`,
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
        content: 'Return only valid JSON for a mind map. Do not use markdown.',
      },
      {
        role: 'user',
        content: `Create a mind map in JSON with this exact shape: {"centralTopic":"string","branches":[{"title":"string","children":["string"]}]}.\n\nFile name: ${fileName}\n\nSummary:\n${clippedSummary}\n\nText:\n${clippedText}`,
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
    throw new Error('Invalid mind map JSON.')
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
        content: 'Return only valid JSON for a concept map. Do not use markdown.',
      },
      {
        role: 'user',
        content:
          `Generate a concept map from the document and return JSON with this exact schema: ` +
          `{"title":"string","nodes":[{"id":"string","label":"string","kind":"core|concept|detail"}],"relations":[{"source":"string","target":"string","label":"string"}]}. ` +
          `Use short unique IDs, at least 5 nodes and 4 relations.\n\n` +
          `File: ${fileName}\n\nSummary:\n${clippedSummary}\n\nText:\n${clippedText}`,
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
    throw new Error('Invalid concept map JSON.')
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
        label: typeof relation.label === 'string' ? relation.label : 'relates to',
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
        content: 'Return only valid JSON without markdown. You must choose the most suitable diagram type based on context.',
      },
      {
        role: 'user',
        content:
          `Generate a contextual diagram for this document. ` +
          `DO NOT use ER if the document is not about relational data/entities (for example biology, history, or law). ` +
          `Return exact JSON: ` +
          `{"kind":"uml_class|uml_sequence|er|flowchart","title":"string","rationale":"string","mermaid":"string"}. ` +
          `The mermaid field must be valid Mermaid code for the selected type.\n\n` +
          `File: ${fileName}\n\nSummary:\n${clippedSummary}\n\nText:\n${clippedText}`,
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
    throw new Error('Invalid diagram JSON.')
  }

  const normalizedMermaid = normalizeMermaidScript(parsed.mermaid, parsed.kind)

  return {
    kind: parsed.kind,
    title: parsed.title,
    rationale: parsed.rationale || 'Selected based on document context.',
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
  const points = keyPoints.slice(0, 8).map((point) => `- ${point}`).join('\n') || '- Not enough key points.'

  const content = await chatCompletions(
    [
      {
        role: 'system',
        content: 'Return only valid JSON without markdown.',
      },
      {
        role: 'user',
        content:
          `Create reusable skill files for AI assistants based on this PDF. ` +
          `Return exact JSON: {"files":[{"fileName":"string","description":"string","content":"string"}]}. ` +
          `Generate exactly 2 or 3 Markdown files, including an operational prompt and a knowledge base.\n\n` +
          `File: ${fileName}\n\nSummary:\n${clippedSummary}\n\nKey points:\n${points}\n\nMarkdown:\n${clippedMarkdown}`,
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
    throw new Error('Invalid skills JSON.')
  }

  return parsed.files
    .filter((file) => file && typeof file.fileName === 'string' && typeof file.content === 'string')
    .map((file) => ({
      fileName: file.fileName,
      description: typeof file.description === 'string' ? file.description : 'AI-generated skill file.',
      content: file.content,
    }))
    .slice(0, 4)
}
