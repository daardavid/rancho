import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  useReactFlow,
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

/** Entry and daily operation. The rest of the map is one pan away. */
const ORIENTATION_IDS = ['GRP-REPRO', 'GRP-IDENTITY', 'GRP-ENGORDA']

function withoutRemovals<T extends { type: string }>(changes: T[]): T[] {
  return changes.filter((change) => change.type !== 'remove')
}

export function ToBeMap() {
  const { fitView, getViewport, setViewport } = useReactFlow()
  const [nodes, , onNodesChange] = useNodesState(toBeNodes)
  const [edges, , onEdgesChange] = useEdgesState(toBeEdges)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [horizon, setHorizon] = useState<ToBeHorizonFilter>('todos')
  const [area, setArea] = useState<ToBeAreaSelection>('todos')
  const [activePainId, setActivePainId] = useState<string | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [legendOpen, setLegendOpen] = useState(false)
  const flowReady = useRef(false)
  const lastFocus = useRef<string | null>(null)
  const panelWasOpen = useRef(false)

  const focusIds = useCallback(
    (ids: string[], minZoom: number) => {
      if (ids.length === 0) return
      void fitView({
        nodes: ids.map((id) => ({ id })),
        padding: 0.16,
        duration: 180,
        minZoom,
        maxZoom: 1.05,
      })
    },
    [fitView],
  )

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

  const matchingIds = useMemo(() => {
    const painProcesses = activePainId ? new Set(effectivenessByPainId[activePainId]?.processIds ?? []) : null
    const ids = new Set<string>()
    for (const node of nodes) {
      if (node.type !== 'toBeProcess') continue
      const process = targetProcessById[node.data.processId]
      const horizonOk = horizon === 'todos' || process.horizon === horizon
      const areaOk = area === 'todos' || process.filters.includes(area)
      const painOk = !painProcesses || painProcesses.has(node.id)
      if (horizonOk && areaOk && painOk) ids.add(node.id)
    }
    return ids
  }, [nodes, horizon, area, activePainId])

  const filtering = horizon !== 'todos' || area !== 'todos' || Boolean(activePainId)
  const matchKey = [...matchingIds].sort().join('|')

  const visibleNodes = useMemo(() => {
    return nodes.map((node) => {
      const selected = node.id === selectedId
      if (node.type === 'section') {
        const anyMatch = node.data.processIds.some((id) => matchingIds.has(id))
        const className = filtering && !anyMatch ? 'is-dimmed' : undefined
        return { ...node, selected, className }
      }
      if (!filtering) return { ...node, selected, className: undefined }
      if (!matchingIds.has(node.id)) return { ...node, selected, className: 'is-dimmed' }
      return { ...node, selected, className: 'is-focus' }
    })
  }, [nodes, matchingIds, filtering, selectedId])

  const showGeneral = useCallback(
    (duration: number) => {
      void setViewport({ x: 28, y: 16, zoom: 1 }, { duration })
    },
    [setViewport],
  )

  const applyFocus = useCallback(
    (key: string, ids: string[], minZoom: number) => {
      if (lastFocus.current === key) return
      const first = lastFocus.current === null
      lastFocus.current = key
      if (key === 'general') {
        showGeneral(first ? 0 : 180)
        return
      }
      focusIds(ids, minZoom)
    },
    [focusIds, showGeneral],
  )

  const onInit = useCallback(() => {
    flowReady.current = true
    applyFocus('general', ORIENTATION_IDS, 0.88)
  }, [applyFocus])

  useEffect(() => {
    if (!flowReady.current) return
    if (!filtering) {
      applyFocus('general', ORIENTATION_IDS, 0.88)
      return
    }
    applyFocus(matchKey, matchKey ? matchKey.split('|') : [], 0.72)
  }, [filtering, matchKey, applyFocus])

  useEffect(() => {
    const open = Boolean(selectedId)
    const wasOpen = panelWasOpen.current
    panelWasOpen.current = open
    if (!flowReady.current || !selectedId || wasOpen || !selectedId.startsWith('TGT-')) return
    const frame = requestAnimationFrame(() => {
      const canvas = document.querySelector('.map-canvas')
      const card = document.querySelector('.react-flow__node.selected')
      if (canvas && card) {
        const box = canvas.getBoundingClientRect()
        const node = card.getBoundingClientRect()
        const inView =
          node.top >= box.top && node.left >= box.left && node.bottom <= box.bottom && node.right <= box.right
        if (inView) return
      }
      const zoom = getViewport().zoom
      void fitView({
        nodes: [{ id: selectedId }],
        padding: 0.42,
        duration: 140,
        minZoom: zoom,
        maxZoom: zoom,
      })
    })
    return () => cancelAnimationFrame(frame)
  }, [selectedId, fitView, getViewport])

  const selectedNode = nodes.find((node) => node.id === selectedId) ?? null
  const showPanel = Boolean(selectedNode) || helpOpen

  function resetFilters() {
    const alreadyGeneral = horizon === 'todos' && area === 'todos' && !activePainId
    setHorizon('todos')
    setArea('todos')
    setActivePainId(null)
    setLegendOpen(false)
    if (alreadyGeneral) {
      lastFocus.current = null
      showGeneral(180)
      lastFocus.current = 'general'
    }
  }

  function toggleHelp() {
    if (helpOpen && !selectedId) {
      setHelpOpen(false)
      return
    }
    setSelectedId(null)
    setHelpOpen(true)
    setLegendOpen(false)
  }

  return (
    <div className="to-be">
      <div className="map-column">
        <CriticalPainStrip
          activePainId={activePainId}
          onToggle={(painId) => {
            setActivePainId((current) => (current === painId ? null : painId))
            setLegendOpen(false)
          }}
        />
        <TransversalBand />
        <ToBeFilters
          horizon={horizon}
          area={area}
          helpOpen={helpOpen && !selectedNode}
          legendOpen={legendOpen}
          onHorizon={(value) => {
            setHorizon(value)
            setLegendOpen(false)
          }}
          onArea={(value) => {
            setArea(value)
            setLegendOpen(false)
          }}
          onReset={resetFilters}
          onHelp={toggleHelp}
          onLegend={setLegendOpen}
        />
        <div className="map-canvas">
          <ReactFlow
            nodes={visibleNodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onNodeClick={(_, node) => {
              setSelectedId(node.id)
              setHelpOpen(false)
              setLegendOpen(false)
            }}
            onPaneClick={() => {
              setSelectedId(null)
              setLegendOpen(false)
            }}
            onInit={onInit}
            nodesConnectable={false}
            edgesReconnectable={false}
            deleteKeyCode={null}
            minZoom={0.45}
            maxZoom={1.6}
            fitViewOptions={{ padding: 0.18, minZoom: 0.8, maxZoom: 1.05 }}
            defaultViewport={{ x: 36, y: 24, zoom: 0.95 }}
            proOptions={{ hideAttribution: false }}
            defaultEdgeOptions={{ type: 'smoothstep' }}
          >
            <Background gap={20} color="#e1e5ec" />
            <Controls showInteractive={false} />
            <MiniMap position="top-right" pannable zoomable nodeStrokeWidth={2} style={{ width: 168, height: 104 }} />
          </ReactFlow>
        </div>
      </div>
      {showPanel ? (
        <ToBeDetailPanel
          node={selectedNode}
          helpOpen={helpOpen && !selectedNode}
          onClose={() => {
            setSelectedId(null)
            setHelpOpen(false)
          }}
        />
      ) : null}
    </div>
  )
}
