import { MarkerType, type Edge, type Node } from '@xyflow/react'
import { asIsProcessById } from './asIsProcesses.ts'
import type { EdgeRelation, ProcessNodeData, SectionNodeData } from '../types/map.ts'

export type ProcessFlowNode = Node<ProcessNodeData, 'process'>
export type SectionFlowNode = Node<SectionNodeData, 'section'>
export type AsIsFlowNode = ProcessFlowNode | SectionFlowNode
export type AsIsEdgeData = { relation: EdgeRelation }
export type AsIsEdge = Edge<AsIsEdgeData>

interface SectionLayout {
  id: string
  title: string
  summary: string
  canvasNote?: string
  associationTarget?: boolean
  position: { x: number; y: number }
  width: number
  height: number
  processIds: string[]
}

interface ProcessLayout {
  processId: string
  position: { x: number; y: number }
}

const sections: SectionLayout[] = [
  {
    id: 'GRP-CALF',
    title: 'Ciclo del becerro / engorda',
    summary:
      'La compra, el transporte y la llegada van en ese orden. Identificación, alimentación, pesaje, sanidad y potrero ocurren durante la engorda, a la par. La venta es la salida comercial, no el paso que sigue a esas actividades.',
    canvasNote:
      'Compra, transporte y llegada van en ese orden. Lo demás ocurre a la par. La venta es la salida comercial.',
    associationTarget: true,
    position: { x: 24, y: 16 },
    width: 1146,
    height: 500,
    processIds: [
      'PROC-PUR-001',
      'PROC-TRANS-001',
      'PROC-REC-001',
      'PROC-SALE-001',
      'PROC-FEED-001',
      'PROC-GROW-001',
      'PROC-HEALTH-001',
      'PROC-LAND-001',
      'PROC-ID-001',
    ],
  },
  {
    id: 'GRP-REPRO',
    title: 'Reproducción',
    summary:
      'Monta natural con un solo toro, y después el parto. El parto no se registra. La línea punteada hacia la identificación no crea una ficha.',
    canvasNote: 'La monta va antes del parto. El nacimiento no se anota.',
    position: { x: 1190, y: 50 },
    width: 242,
    height: 458,
    processIds: ['PROC-REP-001', 'PROC-BIRTH-001'],
  },
  {
    id: 'GRP-INV',
    title: 'Bodega / insumos',
    summary: 'Hay bodega cerrada. No hay un control formal de existencias ni una conciliación.',
    position: { x: 24, y: 536 },
    width: 242,
    height: 236,
    processIds: ['PROC-INV-001'],
  },
  {
    id: 'GRP-FIN',
    title: 'Finanzas',
    summary:
      'El dinero se mueve y la mayoría de los tickets se guardan. No hay rentabilidad ni separación entre gasto e inversión. Las líneas punteadas relacionan ese dinero con la compra, el alimento y la venta.',
    position: { x: 282, y: 536 },
    width: 250,
    height: 236,
    processIds: ['PROC-FIN-001'],
  },
  {
    id: 'GRP-SEC',
    title: 'Seguridad',
    summary:
      'Notar que falta un animal y saber que alguien entró son problemas distintos. No hay conteo frecuente. El cerco existe y no avisa si lo cortan.',
    canvasNote: 'Un faltante y una entrada son problemas distintos.',
    position: { x: 548, y: 536 },
    width: 242,
    height: 500,
    processIds: ['PROC-SEC-001', 'PROC-SEC-002'],
  },
  {
    id: 'GRP-COMM',
    title: 'Información / comunicación',
    summary:
      'Lo que el propietario sabe de la operación llega de los trabajadores por teléfono, WhatsApp, fotos, audios y cuadernos. Ellos no son usuarios de una aplicación. La línea punteada une ese relato con el ciclo del becerro, sin convertirlo en un paso.',
    position: { x: 806, y: 536 },
    width: 260,
    height: 236,
    processIds: ['PROC-COMM-001'],
  },
]

const processLayouts: ProcessLayout[] = [
  { processId: 'PROC-PUR-001', position: { x: 16, y: 96 } },
  { processId: 'PROC-TRANS-001', position: { x: 242, y: 96 } },
  { processId: 'PROC-REC-001', position: { x: 468, y: 96 } },
  { processId: 'PROC-SALE-001', position: { x: 920, y: 96 } },
  { processId: 'PROC-FEED-001', position: { x: 16, y: 300 } },
  { processId: 'PROC-GROW-001', position: { x: 242, y: 300 } },
  { processId: 'PROC-HEALTH-001', position: { x: 468, y: 300 } },
  { processId: 'PROC-LAND-001', position: { x: 694, y: 300 } },
  { processId: 'PROC-ID-001', position: { x: 920, y: 300 } },
  { processId: 'PROC-REP-001', position: { x: 16, y: 78 } },
  { processId: 'PROC-BIRTH-001', position: { x: 16, y: 266 } },
  { processId: 'PROC-INV-001', position: { x: 16, y: 44 } },
  { processId: 'PROC-FIN-001', position: { x: 16, y: 44 } },
  { processId: 'PROC-SEC-001', position: { x: 16, y: 104 } },
  { processId: 'PROC-SEC-002', position: { x: 16, y: 300 } },
  { processId: 'PROC-COMM-001', position: { x: 16, y: 44 } },
]

const parentByProcess = new Map<string, string>()
for (const section of sections) {
  for (const processId of section.processIds) parentByProcess.set(processId, section.id)
}

function sectionNode(section: SectionLayout): SectionFlowNode {
  return {
    id: section.id,
    type: 'section',
    position: section.position,
    data: {
      title: section.title,
      summary: section.summary,
      canvasNote: section.canvasNote,
      associationTarget: section.associationTarget,
      processIds: section.processIds,
    },
    style: { width: section.width, height: section.height, zIndex: 0 },
    selectable: true,
    draggable: true,
    connectable: false,
  }
}

function processNode(layout: ProcessLayout): ProcessFlowNode {
  const data = asIsProcessById[layout.processId]
  const parentId = parentByProcess.get(layout.processId)
  return {
    id: layout.processId,
    type: 'process',
    position: layout.position,
    data,
    parentId,
    extent: 'parent',
    zIndex: 1,
    draggable: true,
    connectable: false,
  }
}

export const asIsNodes: AsIsFlowNode[] = [
  ...sections.map(sectionNode),
  ...processLayouts.map(processNode),
]

const sequenceStyle = { stroke: '#5c6778', strokeWidth: 1.5 }
const associationStyle = { stroke: '#7b8794', strokeWidth: 1.25, strokeDasharray: '6 5' }
const sequenceMarker = { type: MarkerType.ArrowClosed, width: 16, height: 16, color: '#5c6778' }

export const asIsEdges: AsIsEdge[] = [
  sequence('seq-pur-trans', 'PROC-PUR-001', 'PROC-TRANS-001', 'out', 'in'),
  sequence('seq-trans-rec', 'PROC-TRANS-001', 'PROC-REC-001', 'out', 'in'),
  sequence('seq-mate-birth', 'PROC-REP-001', 'PROC-BIRTH-001', 'bottom', 'top'),
  association('assoc-birth-id', 'PROC-BIRTH-001', 'PROC-ID-001', 'out-left', 'in-right'),
  association('assoc-inv-feed', 'PROC-INV-001', 'PROC-FEED-001', 'up', 'bottom-in'),
  association('assoc-fin-pur', 'PROC-PUR-001', 'PROC-FIN-001', 'out-left', 'in'),
  association('assoc-fin-feed', 'PROC-FEED-001', 'PROC-FIN-001', 'bottom', 'top'),
  association('assoc-sale-fin', 'PROC-SALE-001', 'PROC-FIN-001', 'out', 'top'),
  association('assoc-comm-calf', 'PROC-COMM-001', 'GRP-CALF', 'up', 'group-in'),
]

function sequence(
  id: string,
  source: string,
  target: string,
  sourceHandle: string,
  targetHandle: string,
): AsIsEdge {
  return {
    id,
    source,
    target,
    sourceHandle,
    targetHandle,
    type: 'smoothstep',
    className: 'edge-sequence',
    data: { relation: 'sequence' },
    style: sequenceStyle,
    markerEnd: sequenceMarker,
    zIndex: 2,
  }
}

function association(
  id: string,
  source: string,
  target: string,
  sourceHandle: string,
  targetHandle: string,
): AsIsEdge {
  return {
    id,
    source,
    target,
    sourceHandle,
    targetHandle,
    type: 'smoothstep',
    className: 'edge-association',
    data: { relation: 'association' },
    style: associationStyle,
    zIndex: 1,
  }
}
