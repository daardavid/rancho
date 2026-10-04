import { useCallback, useState } from 'react'
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type EdgeChange,
  type NodeChange,
  type NodeTypes,
} from '@xyflow/react'
import { asIsEdges, asIsNodes, type ProcessFlowNode } from '../../../data/asIsMap.ts'
import { DetailPanel } from './DetailPanel.tsx'
import { ProcessNode } from './ProcessNode.tsx'

const nodeTypes: NodeTypes = {
  process: ProcessNode,
}

function withoutRemovals<T extends { type: string }>(changes: T[]): T[] {
  return changes.filter((change) => change.type !== 'remove')
}

export function AsIsMap() {
  const [nodes, , onNodesChange] = useNodesState(asIsNodes)
  const [edges, , onEdgesChange] = useEdgesState(asIsEdges)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const handleNodesChange = useCallback(
    (changes: NodeChange<ProcessFlowNode>[]) => {
      onNodesChange(withoutRemovals(changes))
    },
    [onNodesChange],
  )

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChange(withoutRemovals(changes))
    },
    [onEdgesChange],
  )

  const selectedNode = nodes.find((node) => node.id === selectedId) ?? null

  return (
    <div className="as-is">
      <div className="map-canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onNodeClick={(_, node) => setSelectedId(node.id)}
          onPaneClick={() => setSelectedId(null)}
          nodesConnectable={false}
          edgesReconnectable={false}
          deleteKeyCode={null}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          proOptions={{ hideAttribution: false }}
          defaultEdgeOptions={{
            type: 'smoothstep',
            style: { stroke: '#5c6778' },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#5c6778' },
          }}
        >
          <Background gap={20} color="#e1e5ec" />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable />
        </ReactFlow>
      </div>
      <DetailPanel node={selectedNode} />
    </div>
  )
}
