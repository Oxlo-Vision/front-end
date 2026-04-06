import { Background, Controls, ReactFlow, ReactFlowProvider, type Edge, type Node } from '@xyflow/react'
import type { MindMapData } from '../types'

type MindMapPanelProps = {
  mindMap: MindMapData | null
  flow: { nodes: Node[]; edges: Edge[] }
  onCopyJson: () => void
}

const FLOW_CONTAINER_STYLE: React.CSSProperties = {
  width: '100%',
  height: '540px',
}

export function MindMapPanel({ mindMap, flow, onCopyJson }: MindMapPanelProps) {
  return (
    <div className="result-panel mindmap-panel">
      <div className="rp-header">
        <h3>Mapa mental</h3>
        <button className="rp-copy" onClick={onCopyJson}>Copiar JSON</button>
      </div>
      <p className="rp-meta">Visualizado con React Flow usando resumen y texto extraido</p>
      <div className="mindmap-canvas">
        {!mindMap && (
          <div className="mindmap-empty">
            No hay datos suficientes para construir el mapa mental.
          </div>
        )}
        {mindMap && (
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
