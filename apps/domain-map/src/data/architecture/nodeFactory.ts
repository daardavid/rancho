import { MarkerType, type Edge, type Node } from '@xyflow/react'
import type { ArchDirection, ArchEdgeKind, ArchNodeData, ArchNodeKind } from '../../types/architecture.ts'

const stroke: Record<ArchEdgeKind, string> = {
  call: '#1c2430',
  read: '#5c6778',
  technical: '#1f4b6e',
}

const handles: Record<ArchDirection, { source: string; target: string }> = {
  down: { source: 'bottom-out', target: 'top-in' },
  up: { source: 'top-out', target: 'bottom-in' },
  right: { source: 'right-out', target: 'left-in' },
  left: { source: 'left-out', target: 'right-in' },
}

export function archNode(
  id: string,
  x: number,
  y: number,
  kind: ArchNodeKind,
  kicker: string,
  title: string,
  line: string,
  options?: {
    classification?: ArchNodeData['classification']
    points?: string[]
    pointsLabel?: string
    aside?: string[]
    asideLabel?: string
  },
): Node<ArchNodeData, 'archNode'> {
  return {
    id,
    type: 'archNode',
    position: { x, y },
    data: {
      kind,
      kicker,
      title,
      line,
      detailId: id,
      classification: options?.classification,
      points: options?.points,
      pointsLabel: options?.pointsLabel,
      aside: options?.aside,
      asideLabel: options?.asideLabel,
    },
    draggable: false,
    selectable: true,
    connectable: false,
  }
}

export function archEdge(
  id: string,
  source: string,
  target: string,
  kind: ArchEdgeKind,
  direction: ArchDirection = 'down',
  label?: string,
  sourceHandle?: string,
): Edge<{ kind: ArchEdgeKind }> {
  const color = stroke[kind]
  const handle = handles[direction]
  return {
    id,
    source,
    target,
    sourceHandle: sourceHandle ?? handle.source,
    targetHandle: handle.target,
    label,
    type: 'smoothstep',
    data: { kind },
    style: {
      stroke: color,
      strokeWidth: kind === 'technical' ? 1.75 : 1.5,
      strokeDasharray: kind === 'read' ? '6 4' : undefined,
    },
    labelStyle: { fill: '#3e4856', fontSize: 11, fontWeight: 650 },
    labelBgStyle: { fill: '#f7f8fa', fillOpacity: 0.92 },
    labelBgPadding: [4, 2],
    labelBgBorderRadius: 2,
    markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color },
  }
}
