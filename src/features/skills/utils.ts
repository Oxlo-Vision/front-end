import type { SkillFile } from './types'

function sanitizeBaseName(fileName: string): string {
  return (fileName || 'documento')
    .replace(/\.pdf$/i, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

export function fallbackSkillFiles(fileName: string, summary: string, keyPoints: string[], markdown: string): SkillFile[] {
  const base = sanitizeBaseName(fileName)
  const keyPointText = keyPoints.map((point) => `- ${point}`).join('\n') || '- Sin puntos clave.'

  const promptContent = [
    `# ${base}.prompt.md`,
    '',
    '## Rol',
    'Actua como asistente experto en el tema de este documento.',
    '',
    '## Objetivo',
    'Responder preguntas con precision usando solo el contexto proporcionado.',
    '',
    '## Contexto base',
    summary,
    '',
    '## Puntos clave',
    keyPointText,
  ].join('\n')

  const knowledgeContent = [
    `# ${base}.knowledge.md`,
    '',
    '## Resumen',
    summary,
    '',
    '## Markdown de referencia',
    markdown,
  ].join('\n')

  return [
    {
      fileName: `${base}.prompt.md`,
      description: 'Prompt operativo para asistentes IA (Copilot, ChatGPT, etc).',
      content: promptContent,
    },
    {
      fileName: `${base}.knowledge.md`,
      description: 'Documento de conocimiento para alimentar contexto reutilizable.',
      content: knowledgeContent,
    },
  ]
}
