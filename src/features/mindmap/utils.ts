import { MarkerType, type Edge, type Node } from '@xyflow/react'
import type { MindMapData } from './types'

export function simpleKeyPoints(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 55)
    .slice(0, 6)
}

export function buildMarkdown(fileName: string, summary: string, points: string[]): string {
  const pointsMd = points.map((point) => `- ${point}`).join('\n')
  return `# Summary - ${fileName}\n\n## Key points\n${pointsMd || '- Not enough key points.'}\n\n## Executive summary\n${summary}`
}

export function fallbackMindMap(fileName: string, summary: string, points: string[]): MindMapData {
  const source = points.length > 0 ? points : simpleKeyPoints(summary)

  const branches = source.slice(0, 6).map((point, index) => {
    const sentenceParts = point
      .split(/,|;| y | pero /i)
      .map((part) => part.trim())
      .filter((part) => part.length > 12)
      .slice(0, 3)

    return {
      title: `Idea ${index + 1}`,
      children: sentenceParts.length > 0 ? sentenceParts : [point],
    }
  })

  return {
    centralTopic: fileName || 'Document',
    branches: branches.length > 0 ? branches : [{ title: 'Summary', children: [summary.slice(0, 160)] }],
  }
}

export function mindMapToFlow(data: MindMapData): { nodes: Node[]; edges: Edge[] } {
  const centerX = 420
  const centerY = 260

  const rootNode: Node = {
    id: 'root',
    position: { x: centerX, y: centerY },
    data: { label: data.centralTopic },
    style: {
      background: 'rgba(31,255,180,0.18)',
      border: '2px solid rgba(31,255,180,0.65)',
      borderRadius: 16,
      color: '#d5fff0',
      fontWeight: 700,
      width: 220,
      padding: 12,
      textAlign: 'center',
    },
  }

  const nodes: Node[] = [rootNode]
  const edges: Edge[] = []
  const branchCount = Math.max(data.branches.length, 1)

  data.branches.forEach((branch, branchIndex) => {
    const angle = (Math.PI * 2 * branchIndex) / branchCount
    const branchX = centerX + Math.cos(angle) * 280
    const branchY = centerY + Math.sin(angle) * 210
    const branchNodeId = `branch-${branchIndex}`

    nodes.push({
      id: branchNodeId,
      position: { x: branchX, y: branchY },
      data: { label: branch.title },
      style: {
        background: 'rgba(5,7,10,0.95)',
        border: '1px solid rgba(31,255,180,0.45)',
        borderRadius: 12,
        color: '#ffffff',
        width: 180,
        padding: 10,
        fontWeight: 600,
      },
    })

    edges.push({
      id: `edge-root-${branchNodeId}`,
      source: 'root',
      target: branchNodeId,
      type: 'smoothstep',
      markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(31,255,180,0.45)' },
      style: { stroke: 'rgba(31,255,180,0.45)', strokeWidth: 1.6 },
    })

    const children = branch.children.slice(0, 3)
    children.forEach((child, childIndex) => {
      const offset = (childIndex - (children.length - 1) / 2) * 95
      const childX = branchX + Math.cos(angle) * 170 - Math.sin(angle) * offset
      const childY = branchY + Math.sin(angle) * 170 + Math.cos(angle) * offset
      const childNodeId = `branch-${branchIndex}-child-${childIndex}`

      nodes.push({
        id: childNodeId,
        position: { x: childX, y: childY },
        data: { label: child },
        style: {
          background: 'rgba(17,20,24,0.95)',
          border: '1px solid rgba(255,255,255,0.18)',
          borderRadius: 10,
          color: '#d8dde6',
          width: 230,
          padding: 8,
          fontSize: 12,
          lineHeight: 1.35,
        },
      })

      edges.push({
        id: `edge-${branchNodeId}-${childNodeId}`,
        source: branchNodeId,
        target: childNodeId,
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(255,255,255,0.2)' },
        style: { stroke: 'rgba(255,255,255,0.22)', strokeWidth: 1.2 },
      })
    })
  })

  return { nodes, edges }
}
