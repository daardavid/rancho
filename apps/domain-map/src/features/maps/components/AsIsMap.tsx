import { useCallback, useMemo, useState } from 'react'
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type EdgeChange,
  type NodeChange,
  type NodeTypes,
} from '@xyflow/react'
import { asIsEdges, asIsNodes, type AsIsEdge, type AsIsFlowNode } from '../../../data/asIsMap.ts'
import type { MapFilter } from '../../../types/map.ts'
import { DetailPanel } from './DetailPanel.tsx'
import { MapFilters } from './MapFilters.tsx'
import { ProcessNode } from './ProcessNode.tsx'
import { SectionNode } from './SectionNode.tsx'

const nodeTypes: NodeTypes = {
  process: ProcessNode,
  section: SectionNode,
}

function withoutRemovals<T extends { type: string }>(changes: T[]): T[] {
  return changes.filter((change) => change.type !== 'remove')
}

export function AsIsMap() {
  const [nodes, , onNodesChange] = useNodesState(asIsNodes)
  const [edges, , onEdgesChange] = useEdgesState(asIsEdges)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<MapFilter>('todos')

  const handleNodesChange = useCallback(
    (changes: NodeChange<AsIsFlowNode>[]) => {
      onNodesChange(withoutRemovals(changes))
    },
    [onNodesChange],
  )

  const handleEdgesChange = useCallback(
    (changes: EdgeChange<AsIsEdge>[]) => {
      onEdgesChange(withoutRemovals(changes))
    },
    [onEdgesChange],
  )

  const visibleNodes = useMemo(
    () =>
      nodes.map((node) => {
        if (node.type !== 'process' || filter === 'todos' || node.data.filters.includes(filter)) {
          return { ...node, className: undefined }
        }
        return { ...node, className: 'is-dimmed' }
      }),
    [nodes, filter],
  )

  const selectedNode = nodes.find((node) => node.id === selectedId) ?? null

  return (
    <div className="as-is">
      <div className="map-column">
        <MapFilters active={filter} onChange={setFilter} />
        <EdgeLegend />
        <div className="map-canvas">
          <ReactFlow
            nodes={visibleNodes}
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
            fitViewOptions={{ padding: 0.12 }}
            minZoom={0.35}
            proOptions={{ hideAttribution: false }}
            defaultEdgeOptions={{
              type: 'smoothstep',
            }}
          >
            <Background gap={20} color="#e1e5ec" />
            <Controls showInteractive={false} />
            <MiniMap pannable zoomable nodeStrokeWidth={2} />
          </ReactFlow>
        </div>
      </div>
      <DetailPanel node={selectedNode} />
    </div>
  )
}

function EdgeLegend() {
  return (
    <div className="edge-legend" aria-label="Significado de las líneas">
      <span className="edge-legend__item">
        <span className="edge-legend__swatch is-sequence" />
        Línea continua: una cosa ocurre después, según las entrevistas
      </span>
      <span className="edge-legend__item">
        <span className="edge-legend__swatch is-association" />
        Línea punteada: están relacionadas, sin orden ni causa
      </span>
    </div>
  )
}
