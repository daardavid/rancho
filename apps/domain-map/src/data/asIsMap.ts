import type { Edge, Node } from '@xyflow/react'
import type { ProcessNodeData } from '../types/map.ts'

export type ProcessFlowNode = Node<ProcessNodeData, 'process'>
export type ProcessFlowEdge = Edge

const scaffolding = {
  category: 'scaffolding',
  severity: 'none',
  painPointCount: 0,
} as const

function placeholder(title: string): ProcessNodeData {
  return {
    title,
    category: scaffolding.category,
    severity: scaffolding.severity,
    painPointCount: scaffolding.painPointCount,
    description: `Temporary placeholder for ${title}. This is not a ranch process definition.`,
  }
}

/**
 * Temporary scaffolding only. These five steps are not the ranch process model.
 */
export const asIsNodes: ProcessFlowNode[] = [
  {
    id: 'compra',
    type: 'process',
    position: { x: 0, y: 0 },
    data: placeholder('Compra'),
  },
  {
    id: 'entrada',
    type: 'process',
    position: { x: 0, y: 140 },
    data: placeholder('Entrada'),
  },
  {
    id: 'alimentacion',
    type: 'process',
    position: { x: 0, y: 280 },
    data: placeholder('Alimentación'),
  },
  {
    id: 'pesaje',
    type: 'process',
    position: { x: 0, y: 420 },
    data: placeholder('Pesaje'),
  },
  {
    id: 'venta',
    type: 'process',
    position: { x: 0, y: 560 },
    data: placeholder('Venta'),
  },
]

export const asIsEdges: ProcessFlowEdge[] = [
  { id: 'compra-entrada', source: 'compra', target: 'entrada' },
  { id: 'entrada-alimentacion', source: 'entrada', target: 'alimentacion' },
  { id: 'alimentacion-pesaje', source: 'alimentacion', target: 'pesaje' },
  { id: 'pesaje-venta', source: 'pesaje', target: 'venta' },
]
