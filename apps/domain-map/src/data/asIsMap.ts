import type { Edge, Node } from '@xyflow/react'
import { asIsProcessById } from './asIsProcesses.ts'
import type { ProcessNodeData, SectionNodeData } from '../types/map.ts'

export type ProcessFlowNode = Node<ProcessNodeData, 'process'>
export type SectionFlowNode = Node<SectionNodeData, 'section'>
export type AsIsFlowNode = ProcessFlowNode | SectionFlowNode

interface SectionLayout {
  id: string
  title: string
  summary: string
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
      'Actividad principal actual: comprar o criar becerros, mantenerlos y venderlos por kilogramo. Alimentación, pesaje y salud ocurren durante la engorda; no son un trámite en fila.',
    position: { x: 24, y: 16 },
    width: 880,
    height: 500,
    processIds: [
      'PROC-PUR-001',
      'PROC-TRANS-001',
      'PROC-REC-001',
      'PROC-ID-001',
      'PROC-FEED-001',
      'PROC-GROW-001',
      'PROC-HEALTH-001',
      'PROC-SALE-001',
    ],
  },
  {
    id: 'GRP-REPRO',
    title: 'Reproducción',
    summary:
      'Monta natural con un solo toro. El parto ocurre y no se registra. El becerro pasa después por la identificación, que tampoco es una ficha.',
    position: { x: 924, y: 16 },
    width: 430,
    height: 200,
    processIds: ['PROC-REP-001', 'PROC-BIRTH-001'],
  },
  {
    id: 'GRP-LAND',
    title: 'Terreno / potreros',
    summary:
      'El ganado pasta libre en potreros cercados. Los potreros identificados no explican toda la propiedad.',
    position: { x: 924, y: 232 },
    width: 430,
    height: 196,
    processIds: ['PROC-LAND-001'],
  },
  {
    id: 'GRP-INV',
    title: 'Inventario / insumos',
    summary: 'Hay bodega cerrada. No hay un inventario formal ni una conciliación de existencias.',
    position: { x: 924, y: 444 },
    width: 430,
    height: 196,
    processIds: ['PROC-INV-001'],
  },
  {
    id: 'GRP-FIN',
    title: 'Finanzas',
    summary:
      'El dinero se mueve y la mayoría de los tickets se guardan. No hay rentabilidad ni separación entre gasto e inversión.',
    position: { x: 24, y: 536 },
    width: 280,
    height: 210,
    processIds: ['PROC-FIN-001'],
  },
  {
    id: 'GRP-SEC',
    title: 'Seguridad',
    summary:
      'Hay cerco y no hay cámaras. Un faltante puede descubrirse días o semanas después. Las cámaras no están instaladas.',
    position: { x: 320, y: 536 },
    width: 280,
    height: 210,
    processIds: ['PROC-SEC-001'],
  },
  {
    id: 'GRP-COMM',
    title: 'Información / comunicación',
    summary:
      'Lo que el propietario sabe llega de los trabajadores por teléfono, WhatsApp, fotos, audios y cuadernos. Ellos no son usuarios de una aplicación.',
    position: { x: 616, y: 536 },
    width: 288,
    height: 210,
    processIds: ['PROC-COMM-001'],
  },
]

const processLayouts: ProcessLayout[] = [
  { processId: 'PROC-PUR-001', position: { x: 16, y: 48 } },
  { processId: 'PROC-TRANS-001', position: { x: 228, y: 48 } },
  { processId: 'PROC-REC-001', position: { x: 440, y: 48 } },
  { processId: 'PROC-ID-001', position: { x: 652, y: 48 } },
  { processId: 'PROC-FEED-001', position: { x: 122, y: 200 } },
  { processId: 'PROC-GROW-001', position: { x: 342, y: 200 } },
  { processId: 'PROC-HEALTH-001', position: { x: 562, y: 200 } },
  { processId: 'PROC-SALE-001', position: { x: 342, y: 360 } },
  { processId: 'PROC-REP-001', position: { x: 16, y: 52 } },
  { processId: 'PROC-BIRTH-001', position: { x: 214, y: 52 } },
  { processId: 'PROC-LAND-001', position: { x: 16, y: 56 } },
  { processId: 'PROC-INV-001', position: { x: 16, y: 56 } },
  { processId: 'PROC-FIN-001', position: { x: 16, y: 64 } },
  { processId: 'PROC-SEC-001', position: { x: 16, y: 64 } },
  { processId: 'PROC-COMM-001', position: { x: 16, y: 64 } },
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
      processIds: section.processIds,
    },
    style: { width: section.width, height: section.height },
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
    draggable: true,
    connectable: false,
  }
}

export const asIsNodes: AsIsFlowNode[] = [
  ...sections.map(sectionNode),
  ...processLayouts.map(processNode),
]

export const asIsEdges: Edge[] = [
  edge('pur-trans', 'PROC-PUR-001', 'PROC-TRANS-001', 'out', 'in'),
  edge('trans-rec', 'PROC-TRANS-001', 'PROC-REC-001', 'out', 'in'),
  edge('rec-id', 'PROC-REC-001', 'PROC-ID-001', 'out', 'in'),
  edge('id-feed', 'PROC-ID-001', 'PROC-FEED-001', 'bottom', 'top'),
  edge('id-grow', 'PROC-ID-001', 'PROC-GROW-001', 'bottom', 'top'),
  edge('id-health', 'PROC-ID-001', 'PROC-HEALTH-001', 'bottom', 'top'),
  edge('feed-sale', 'PROC-FEED-001', 'PROC-SALE-001', 'bottom', 'top'),
  edge('grow-sale', 'PROC-GROW-001', 'PROC-SALE-001', 'bottom', 'top'),
  edge('health-sale', 'PROC-HEALTH-001', 'PROC-SALE-001', 'bottom', 'top'),
  edge('mate-birth', 'PROC-REP-001', 'PROC-BIRTH-001', 'out', 'in'),
  edge('birth-id', 'PROC-BIRTH-001', 'PROC-ID-001', 'out-left', 'in-right'),
]

function edge(
  id: string,
  source: string,
  target: string,
  sourceHandle: string,
  targetHandle: string,
): Edge {
  return { id, source, target, sourceHandle, targetHandle }
}
