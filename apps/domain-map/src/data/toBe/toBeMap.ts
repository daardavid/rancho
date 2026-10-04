import { MarkerType, type Edge, type Node } from '@xyflow/react'
import { targetProcessById } from './lookups.ts'
import { toBeCardCopy } from './toBePresentation.ts'
import { assertToBeData } from './validateToBe.ts'
import type { EdgeRelation, SectionNodeData } from '../../types/map.ts'
import type { ToBeProcessNodeData } from '../../types/toBe.ts'

export type ToBeProcessFlowNode = Node<ToBeProcessNodeData, 'toBeProcess'>
export type ToBeSectionFlowNode = Node<SectionNodeData, 'section'>
export type ToBeFlowNode = ToBeProcessFlowNode | ToBeSectionFlowNode
export type ToBeEdgeData = { relation: EdgeRelation }
export type ToBeEdge = Edge<ToBeEdgeData>

interface SectionLayout {
  id: string
  title: string
  summary: string
  canvasNote?: string
  variant?: 'conditional'
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
    id: 'GRP-REPRO',
    title: 'Reproducción',
    summary:
      'El nacimiento crea la ficha en un solo evento. La línea continua es una corrección posterior de la filiación, no un segundo alta. Un toro único no confirma la paternidad.',
    canvasNote: 'La corrección es posterior. No es otro alta.',
    position: { x: 0, y: 0 },
    width: 264,
    height: 404,
    processIds: ['TGT-BIRTH-001', 'TGT-REPRO-001'],
  },
  {
    id: 'GRP-IDENTITY',
    title: 'Alta / identidad',
    summary:
      'La ficha, la compra y la salida. La compra puede entrar como lote antes de la ficha de cada cabeza. La venta produce la salida en el mismo evento. A la parte no se traduce a un porcentaje.',
    canvasNote: 'Tenencia y «a la parte» pueden quedar desconocidos.',
    position: { x: 288, y: 0 },
    width: 768,
    height: 224,
    processIds: ['TGT-ANIMAL-001', 'TGT-PUR-001', 'TGT-ANIMAL-EXIT-001'],
  },
  {
    id: 'GRP-ENGORDA',
    title: 'Operación ganadera / engorda',
    summary:
      'El pesaje, la nota sanitaria y el lugar esperado. El pesaje no verifica al hato. El lugar puede quedar desconocido. No hay GPS.',
    canvasNote: 'Lugar desconocido es válido. No es GPS.',
    position: { x: 288, y: 248 },
    width: 768,
    height: 224,
    processIds: ['TGT-WEIGH-001', 'TGT-HEALTH-001', 'TGT-MOVE-001'],
  },
  {
    id: 'GRP-FEED',
    title: 'Bodega / alimentación',
    summary:
      'La compra de alimento es también la entrada de bodega. La línea punteada es el mismo evento, no un segundo trámite. La entrega declarada no es entrega medida.',
    canvasNote: 'Declarado no es medido.',
    position: { x: 0, y: 496 },
    width: 508,
    height: 224,
    processIds: ['TGT-FEED-001', 'TGT-INV-001'],
  },
  {
    id: 'GRP-FIN',
    title: 'Finanzas',
    summary:
      'El ingreso y los gastos se registran sin calcular la parte del ranchero. La lectura provisional usa esos hechos y no es utilidad fiscal. No hace falta una flecha por cada costo.',
    canvasNote: 'Lectura provisional. No es utilidad fiscal.',
    position: { x: 532, y: 496 },
    width: 768,
    height: 224,
    processIds: ['TGT-EXPENSE-001', 'TGT-SALE-001', 'TGT-PROFIT-001'],
  },
  {
    id: 'GRP-SEC',
    title: 'Presencia / seguridad',
    summary:
      'Ver un animal en la manga es la última observación, no la verificación del hato. Esa verificación sigue con método y cadencia pendientes. La intrusión es otro problema y no está atendida.',
    canvasNote: 'Última vez visto no es el hato. Intrusión: no atendida.',
    position: { x: 0, y: 744 },
    width: 768,
    height: 224,
    processIds: ['TGT-SEC-001', 'TGT-HERD-VERIFY-001', 'TGT-SEC-002'],
  },
  {
    id: 'GRP-GOV',
    title: 'Gestión',
    summary:
      'El aviso crítico entra al mínimo. El resumen semanal es deseable. La evidencia de campo es el canal por el que llegan los otros eventos, no un paso junto al pesaje.',
    canvasNote: 'El canal no es un paso de la engorda.',
    position: { x: 792, y: 744 },
    width: 508,
    height: 224,
    processIds: ['TGT-GOV-001', 'TGT-COMM-001'],
  },
  {
    id: 'GRP-MILK',
    title: 'Leche',
    summary:
      'No es operación vigente y no entra al paquete mínimo. Existe para preguntar, si la ordeña vuelve, si conviene.',
    canvasNote: 'Condicional. Fuera del flujo inicial.',
    variant: 'conditional',
    position: { x: 1520, y: 24 },
    width: 264,
    height: 224,
    processIds: ['TGT-MILK-001'],
  },
]

const processLayouts: ProcessLayout[] = [
  { processId: 'TGT-BIRTH-001', position: { x: 16, y: 72 } },
  { processId: 'TGT-REPRO-001', position: { x: 16, y: 252 } },
  { processId: 'TGT-ANIMAL-001', position: { x: 16, y: 72 } },
  { processId: 'TGT-PUR-001', position: { x: 260, y: 72 } },
  { processId: 'TGT-ANIMAL-EXIT-001', position: { x: 504, y: 72 } },
  { processId: 'TGT-WEIGH-001', position: { x: 16, y: 72 } },
  { processId: 'TGT-HEALTH-001', position: { x: 260, y: 72 } },
  { processId: 'TGT-MOVE-001', position: { x: 504, y: 72 } },
  { processId: 'TGT-FEED-001', position: { x: 16, y: 72 } },
  { processId: 'TGT-INV-001', position: { x: 260, y: 72 } },
  { processId: 'TGT-EXPENSE-001', position: { x: 16, y: 72 } },
  { processId: 'TGT-SALE-001', position: { x: 260, y: 72 } },
  { processId: 'TGT-PROFIT-001', position: { x: 504, y: 72 } },
  { processId: 'TGT-SEC-001', position: { x: 16, y: 72 } },
  { processId: 'TGT-HERD-VERIFY-001', position: { x: 260, y: 72 } },
  { processId: 'TGT-SEC-002', position: { x: 504, y: 72 } },
  { processId: 'TGT-GOV-001', position: { x: 16, y: 72 } },
  { processId: 'TGT-COMM-001', position: { x: 260, y: 72 } },
  { processId: 'TGT-MILK-001', position: { x: 16, y: 72 } },
]

const parentByProcess = new Map<string, string>()
for (const section of sections) {
  for (const processId of section.processIds) parentByProcess.set(processId, section.id)
}

function sectionNode(section: SectionLayout): ToBeSectionFlowNode {
  return {
    id: section.id,
    type: 'section',
    position: section.position,
    data: {
      title: section.title,
      summary: section.summary,
      canvasNote: section.canvasNote,
      variant: section.variant,
      processIds: section.processIds,
    },
    style: { width: section.width, height: section.height, zIndex: 0 },
    selectable: true,
    draggable: true,
    connectable: false,
  }
}

function processNode(layout: ProcessLayout): ToBeProcessFlowNode {
  const process = targetProcessById[layout.processId]
  const card = toBeCardCopy[layout.processId]
  if (!card) throw new Error(`Missing map card copy for ${layout.processId}`)
  return {
    id: layout.processId,
    type: 'toBeProcess',
    position: layout.position,
    parentId: parentByProcess.get(layout.processId),
    extent: 'parent',
    zIndex: 1,
    draggable: true,
    connectable: false,
    data: {
      processId: process.id,
      title: process.title,
      cardTitle: card.cardTitle,
      cardLine: card.cardLine,
      horizon: process.horizon,
      visualRole: process.visualRole,
      painPointIds: process.painPointIds,
    },
  }
}

export const toBeNodes: ToBeFlowNode[] = [
  ...sections.map(sectionNode),
  ...processLayouts.map(processNode),
]

const sequenceStyle = { stroke: '#5c6778', strokeWidth: 1.5 }
const associationStyle = { stroke: '#7b8794', strokeWidth: 1.25, strokeDasharray: '6 5' }
const sequenceMarker = { type: MarkerType.ArrowClosed, width: 16, height: 16, color: '#5c6778' }

export const toBeEdges: ToBeEdge[] = [
  {
    id: 'seq-birth-repro',
    source: 'TGT-BIRTH-001',
    target: 'TGT-REPRO-001',
    sourceHandle: 'bottom',
    targetHandle: 'top',
    type: 'smoothstep',
    className: 'edge-sequence',
    data: { relation: 'sequence' },
    style: sequenceStyle,
    markerEnd: sequenceMarker,
    zIndex: 2,
  },
  {
    id: 'assoc-feed-inv',
    source: 'TGT-FEED-001',
    target: 'TGT-INV-001',
    sourceHandle: 'out',
    targetHandle: 'in',
    type: 'smoothstep',
    className: 'edge-association',
    data: { relation: 'association' },
    style: associationStyle,
    zIndex: 1,
  },
]

assertToBeData(processLayouts.map((layout) => layout.processId))
