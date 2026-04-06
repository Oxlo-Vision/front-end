import { Background, Controls, ReactFlow, ReactFlowProvider, type Edge, type Node } from '@xyflow/react'
import type { ConceptMapData } from '../types'

type ConceptMapPanelProps = {
  conceptMap: ConceptMapData | null
  flow: { nodes: Node[]; edges: Edge[] }
  onCopyJson: () => void
}

const FLOW_CONTAINER_STYLE: React.CSSProperties = {
  width: '100%',
  height: '560px',
}

export function ConceptMapPanel({ conceptMap, flow, onCopyJson }: ConceptMapPanelProps) {
  return (
    <div className="result-panel mindmap-panel">
      <div className="rp-header">
        <h3>Mapa conceptual</h3>
        <button className="rp-copy" onClick={onCopyJson}>Copiar JSON</button>
      </div>
      <p className="rp-meta">Generado por IA y visualizado con React Flow</p>
      <div className="mindmap-canvas">
        {!conceptMap && (
          <div className="mindmap-empty">No hay datos suficientes para construir el mapa conceptual.</div>
        )}
        {conceptMap && (
          <ReactFlowProvider>
            <div style={FLOW_CONTAINER_STYLE}>
              <ReactFlow
                nodes={flow.nodes}
                edges={flow.edges}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                nodesDraggable
                nodesConnectable={false}
                elementsSelectable
                proOptions={{ hideAttribution: true }}
              >
                <Background gap={20} color="rgba(255,255,255,0.06)" />
                <Controls showInteractive={false} />
              </ReactFlow>
            </div>
          </ReactFlowProvider>
        )}
      </div>
    </div>
  )
}
