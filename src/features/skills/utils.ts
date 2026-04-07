import type { SkillFile } from './types'

function sanitizeBaseName(fileName: string): string {
  return (fileName || 'document')
    .replace(/\.pdf$/i, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
}

export function fallbackSkillFiles(fileName: string, summary: string, keyPoints: string[], markdown: string): SkillFile[] {
  const base = sanitizeBaseName(fileName)
  const keyPointText = keyPoints.map((point) => `- ${point}`).join('\n') || '- No key points available.'

  const promptContent = [
    `# ${base}.prompt.md`,
    '',
    '## Role',
    'Act as an expert assistant in the topic covered by this document.',
    '',
    '## Goal',
    'Answer questions precisely using only the provided context.',
    '',
    '## Base context',
    summary,
    '',
    '## Key points',
    keyPointText,
  ].join('\n')

  const knowledgeContent = [
    `# ${base}.knowledge.md`,
    '',
    '## Summary',
    summary,
    '',
    '## Reference markdown',
    markdown,
  ].join('\n')

  return [
    {
      fileName: `${base}.prompt.md`,
      description: 'Operational prompt for AI assistants (Copilot, ChatGPT, etc).',
      content: promptContent,
    },
    {
      fileName: `${base}.knowledge.md`,
      description: 'Knowledge document for reusable context.',
      content: knowledgeContent,
    },
  ]
}
