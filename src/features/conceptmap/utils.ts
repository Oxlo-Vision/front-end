import { MarkerType, type Edge, type Node } from '@xyflow/react'
import type { ConceptMapData } from './types'

export function fallbackConceptMap(fileName: string, summary: string, keyPoints: string[]): ConceptMapData {
  const title = fileName || 'Documento'
  const basePoints = keyPoints.length > 0
    ? keyPoints
    : summary
      .split(/(?<=[.!?])\s+/)
      .map((line) => line.trim())
      .filter((line) => line.length > 30)
      .slice(0, 6)

  const nodes = [
    { id: 'core', label: title, kind: 'core' as const },
    ...basePoints.slice(0, 8).map((point, index) => ({
      id: `concept-${index + 1}`,
      label: point.length > 120 ? `${point.slice(0, 117)}...` : point,
      kind: 'concept' as const,
    })),
  ]

  const relations = nodes
    .filter((node) => node.id !== 'core')
    .map((node) => ({
      source: 'core',
      target: node.id,
      label: 'relaciona',
    }))

  return { title, nodes, relations }
}

export function conceptMapToFlow(data: ConceptMapData): { nodes: Node[]; edges: Edge[] } {
  const layoutNodes: Node[] = []
  const layoutEdges: Edge[] = []

  const coreNode = data.nodes.find((node) => node.id === 'core') ?? data.nodes[0]
  const otherNodes = data.nodes.filter((node) => node.id !== coreNode.id)

  layoutNodes.push({
    id: coreNode.id,
    position: { x: 380, y: 60 },
    data: { label: coreNode.label },
    style: {
      background: 'rgba(31,255,180,0.2)',
      border: '2px solid rgba(31,255,180,0.65)',
      borderRadius: 14,
      color: '#d5fff0',
      width: 260,
      textAlign: 'center',
      fontWeight: 700,
      padding: 12,
    },
  })

  const cols = 3
  otherNodes.forEach((node, index) => {
    const row = Math.floor(index / cols)
    const col = index % cols
    const x = 60 + col * 300
    const y = 220 + row * 170

    layoutNodes.push({
      id: node.id,
      position: { x, y },
      data: { label: node.label },
      style: {
        background: 'rgba(17,20,24,0.95)',
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: 12,
        color: '#e8edf5',
        width: 250,
        lineHeight: 1.35,
        padding: 10,
        fontSize: 12,
      },
    })
  })

  data.relations.forEach((relation, index) => {
    layoutEdges.push({
      id: `concept-edge-${index + 1}`,
      source: relation.source,
      target: relation.target,
      label: relation.label,
      labelStyle: { fill: '#9ca3af', fontSize: 11 },
      labelBgStyle: { fill: 'rgba(5,7,10,0.95)', fillOpacity: 0.95 },
      markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(255,255,255,0.3)' },
      style: { stroke: 'rgba(255,255,255,0.25)', strokeWidth: 1.25 },
      type: 'smoothstep',
    })
  })

  return { nodes: layoutNodes, edges: layoutEdges }
}
