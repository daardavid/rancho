import { useCallback, useEffect, useState } from 'react'
import { Background, Controls, MiniMap, ReactFlow, useReactFlow, type NodeTypes } from '@xyflow/react'
import { frozenBaseline, openImplementation } from '../../../data/architecture/architectureDecisions.ts'
import { architectureGraph } from '../../../data/architecture/index.ts'
import { workflows } from '../../../data/architecture/workflows.ts'
import { archViewLabels, type ArchView } from '../../../types/architecture.ts'
import { ArchitectureDetailPanel } from './ArchitectureDetailPanel.tsx'
import { ArchitectureNode } from './ArchitectureNode.tsx'

const nodeTypes: NodeTypes = {
  archNode: ArchitectureNode,
}

export function ArchitectureMap() {
  const { fitView, getViewport } = useReactFlow()
  const [view, setView] = useState<ArchView>('modules')
  const [workflowId, setWorkflowId] = useState(workflows[0].id)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [helpOpen, setHelpOpen] = useState(false)
  const [legendOpen, setLegendOpen] = useState(false)

  const graph = architectureGraph(view, workflowId)
  const nodes = graph.nodes.map((node) => ({ ...node, selected: node.id === selectedId }))

  const onInit = useCallback(() => {
    void fitView({ padding: 0.14, duration: 0, minZoom: 0.5, maxZoom: 1 })
  }, [fitView])

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void fitView({ padding: 0.14, duration: 0, minZoom: 0.5, maxZoom: 1 })
    })
    return () => cancelAnimationFrame(frame)
  }, [view, workflowId, fitView])

  useEffect(() => {
    if (!selectedId) return
    const frame = requestAnimationFrame(() => {
      const canvas = document.querySelector('.arch .map-canvas')
      const card = document.querySelector(`.arch .react-flow__node[data-id="${selectedId}"]`)
      if (canvas && card) {
        const box = canvas.getBoundingClientRect()
        const bounds = card.getBoundingClientRect()
        const inView =
          bounds.top >= box.top &&
          bounds.left >= box.left &&
          bounds.bottom <= box.bottom &&
          bounds.right <= box.right - 8
        if (inView) return
      }
      const zoom = getViewport().zoom
      void fitView({
        nodes: [{ id: selectedId }],
        padding: 0.4,
        duration: 140,
        minZoom: zoom,
        maxZoom: zoom,
      })
    })
    return () => cancelAnimationFrame(frame)
  }, [selectedId, fitView, getViewport])

  function changeView(next: ArchView) {
    setView(next)
    setSelectedId(null)
    setHelpOpen(false)
    setLegendOpen(false)
  }

  function changeWorkflow(next: string) {
    setWorkflowId(next)
    setSelectedId(null)
    setHelpOpen(false)
  }

  const showPanel = Boolean(selectedId) || helpOpen

  return (
    <div className="arch">
      <div className="map-column">
        <div className="arch-status">
          <p className="arch-status__label">Base congelada</p>
          <ul className="arch-chips">
            {frozenBaseline.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="arch-status__open">
            <span>Abierto al implementar:</span> {openImplementation.join(' · ')}
          </p>
        </div>
        <div className="tobe-toolbar">
          <div className="tobe-toolbar__group" role="tablist" aria-label="Vistas de arquitectura">
            {archViewLabels.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={view === item.id}
                className={view === item.id ? 'map-filter is-active' : 'map-filter'}
                onClick={() => changeView(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="tobe-toolbar__actions">
            <button
              type="button"
              className={legendOpen ? 'map-filter is-active' : 'map-filter'}
              aria-expanded={legendOpen}
              onClick={() => setLegendOpen((open) => !open)}
            >
              Leyenda
            </button>
            <button
              type="button"
              className={helpOpen && !selectedId ? 'map-filter is-active' : 'map-filter'}
              onClick={() => {
                setSelectedId(null)
                setHelpOpen(true)
                setLegendOpen(false)
              }}
            >
              Cómo leer
            </button>
          </div>
          {legendOpen ? (
            <div className="tobe-legend" role="note">
              <p>
                <span className="arch-swatch is-call" /> Llamada de la aplicación, en el momento
              </p>
              <p>
                <span className="arch-swatch is-read" /> Lectura, canal humano, o futuro no integrado
              </p>
              <p>
                <span className="arch-swatch is-technical" /> Base de datos o almacén de archivos
              </p>
              <p>Núcleo y apoyo son los cinco módulos. Una tarjeta «solo lectura» no escribe hechos.</p>
            </div>
          ) : null}
        </div>
        {view === 'flows' ? (
          <div className="tobe-toolbar" aria-label="Flujos">
            <div className="tobe-toolbar__group">
              {workflows.map((workflow) => (
                <button
                  key={workflow.id}
                  type="button"
                  className={workflowId === workflow.id ? 'map-filter is-active' : 'map-filter'}
                  onClick={() => changeWorkflow(workflow.id)}
                >
                  {workflow.title}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <div className="map-canvas">
          <ReactFlow
            key={`${view}:${workflowId}`}
            nodes={nodes}
            edges={graph.edges}
            nodeTypes={nodeTypes}
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
            nodesDraggable={false}
            nodesConnectable={false}
            edgesReconnectable={false}
            deleteKeyCode={null}
            minZoom={0.45}
            maxZoom={1.5}
            proOptions={{ hideAttribution: true }}
            defaultEdgeOptions={{ type: 'smoothstep' }}
          >
            <Background gap={20} color="#e1e5ec" />
            <Controls showInteractive={false} />
            {view === 'modules' ? (
              <MiniMap
                position="top-right"
                pannable
                zoomable
                nodeStrokeWidth={2}
                bgColor="#f7f8fa"
                maskColor="rgb(247 248 250 / 72%)"
                nodeColor={(node) => {
                  const kind = (node.data as { kind?: string }).kind
                  if (kind === 'module') return '#1f4b6e'
                  if (kind === 'readmodel') return '#3d5c4a'
                  if (kind === 'transversal') return '#8a7340'
                  if (kind === 'layer') return '#3e4a5c'
                  return '#9aa3b2'
                }}
                style={{ width: 168, height: 104 }}
              />
            ) : null}
          </ReactFlow>
        </div>
      </div>
      {showPanel ? (
        <ArchitectureDetailPanel
          detailId={selectedId}
          helpOpen={helpOpen && !selectedId}
          onClose={() => {
            setSelectedId(null)
            setHelpOpen(false)
          }}
        />
      ) : null}
    </div>
  )
}
