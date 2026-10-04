import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { painPointById } from '../../../data/painPoints.ts'
import {
  severityLabels,
  statusLabels,
  type InitialSeverity,
  type ProcessNodeData,
} from '../../../types/map.ts'

type ProcessNodeType = Node<ProcessNodeData, 'process'>

const severityRank: Record<InitialSeverity, number> = {
  baja: 1,
  media: 2,
  alta: 3,
  critica: 4,
}

function highestSeverity(ids: string[]): InitialSeverity | null {
  let best: InitialSeverity | null = null
  for (const id of ids) {
    const severity = painPointById[id]?.initialSeverity
    if (!severity) continue
    if (!best || severityRank[severity] > severityRank[best]) best = severity
  }
  return best
}

export function ProcessNode({ data, selected }: NodeProps<ProcessNodeType>) {
  const severity = highestSeverity(data.painPointIds)
  const painCount = data.painPointIds.length

  return (
    <article className={`process-node category-${data.category}${selected ? ' is-selected' : ''}`}>
      <Handle type="target" position={Position.Left} id="in" isConnectable={false} />
      <Handle type="source" position={Position.Left} id="out-left" isConnectable={false} />
      <Handle type="target" position={Position.Top} id="top" isConnectable={false} />
      <Handle type="source" position={Position.Top} id="up" isConnectable={false} />
      {data.roleLabel ? <p className="process-node__role">{data.roleLabel}</p> : null}
      <h3 className="process-node__title">{data.title}</h3>
      <p className="process-node__meta">
        <span>{statusLabels[data.status]}</span>
        {severity ? (
          <span className={`process-node__severity severity-text-${severity}`}>
            Evaluación inicial: {severityLabels[severity]}
          </span>
        ) : null}
      </p>
      {painCount > 1 ? (
        <p className="process-node__count">{painCount} dolores ligados</p>
      ) : null}
      <Handle type="target" position={Position.Right} id="in-right" isConnectable={false} />
      <Handle type="source" position={Position.Right} id="out" isConnectable={false} />
      <Handle type="source" position={Position.Bottom} id="bottom" isConnectable={false} />
      <Handle type="target" position={Position.Bottom} id="bottom-in" isConnectable={false} />
    </article>
  )
}
