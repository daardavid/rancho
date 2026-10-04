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
import { effectivenessByPainId, targetProcessById } from '../../../data/toBe/lookups.ts'
import { toBeEdges, toBeNodes, type ToBeEdge, type ToBeFlowNode } from '../../../data/toBe/toBeMap.ts'
import type { ToBeAreaSelection, ToBeHorizonFilter } from '../../../types/toBe.ts'
import { SectionNode } from './SectionNode.tsx'
import { CriticalPainStrip } from './CriticalPainStrip.tsx'
import { ToBeDetailPanel } from './ToBeDetailPanel.tsx'
import { ToBeFilters } from './ToBeFilters.tsx'
import { ToBeProcessNode } from './ToBeProcessNode.tsx'
import { TransversalBand } from './TransversalBand.tsx'

const nodeTypes: NodeTypes = {
  toBeProcess: ToBeProcessNode,
  section: SectionNode,
}

function withoutRemovals<T extends { type: string }>(changes: T[]): T[] {
  return changes.filter((change) => change.type !== 'remove')
}

export function ToBeMap() {
  const [nodes, , onNodesChange] = useNodesState(toBeNodes)
  const [edges, , onEdgesChange] = useEdgesState(toBeEdges)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [horizon, setHorizon] = useState<ToBeHorizonFilter>('todos')
  const [area, setArea] = useState<ToBeAreaSelection>('todos')
  const [activePainId, setActivePainId] = useState<string | null>(null)

  const handleNodesChange = useCallback(
    (changes: NodeChange<ToBeFlowNode>[]) => {
      onNodesChange(withoutRemovals(changes))
    },
    [onNodesChange],
  )

  const handleEdgesChange = useCallback(
    (changes: EdgeChange<ToBeEdge>[]) => {
      onEdgesChange(withoutRemovals(changes))
    },
    [onEdgesChange],
  )

  const visibleNodes = useMemo(() => {
    const painProcesses = activePainId ? new Set(effectivenessByPainId[activePainId]?.processIds ?? []) : null
    return nodes.map((node) => {
      if (node.type !== 'toBeProcess') return { ...node, className: undefined }
      const process = targetProcessById[node.data.processId]
      const horizonOk = horizon === 'todos' || process.horizon === horizon
      const areaOk = area === 'todos' || process.filters.includes(area)
      const painOk = !painProcesses || painProcesses.has(node.id)
      if (!horizonOk || !areaOk || !painOk) return { ...node, className: 'is-dimmed' }
      if (painProcesses?.has(node.id)) return { ...node, className: 'is-pain-focus' }
      return { ...node, className: undefined }
    })
  }, [nodes, horizon, area, activePainId])

  const selectedNode = nodes.find((node) => node.id === selectedId) ?? null

  return (
    <div className="to-be">
      <div className="map-column">
        <CriticalPainStrip
          activePainId={activePainId}
          onToggle={(painId) => setActivePainId((current) => (current === painId ? null : painId))}
        />
        <TransversalBand />
        <ToBeFilters horizon={horizon} area={area} onHorizon={setHorizon} onArea={setArea} />
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
            minZoom={0.3}
            proOptions={{ hideAttribution: false }}
            defaultEdgeOptions={{ type: 'smoothstep' }}
          >
            <Background gap={20} color="#e1e5ec" />
            <Controls showInteractive={false} />
            <MiniMap pannable zoomable nodeStrokeWidth={2} />
          </ReactFlow>
        </div>
      </div>
      <ToBeDetailPanel node={selectedNode} />
    </div>
  )
}

function EdgeLegend() {
  return (
    <div className="edge-legend" aria-label="Significado de las líneas">
      <span className="edge-legend__item">
        <span className="edge-legend__swatch is-sequence" />
        Línea continua: el proceso deseado va después
      </span>
      <span className="edge-legend__item">
        <span className="edge-legend__swatch is-association" />
        Línea punteada: relación o el mismo evento, sin orden
      </span>
    </div>
  )
}
