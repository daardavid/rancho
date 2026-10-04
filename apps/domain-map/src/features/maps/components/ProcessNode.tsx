import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { statusLabels, type ProcessNodeData } from '../../../types/map.ts'

type ProcessNodeType = Node<ProcessNodeData, 'process'>

export function ProcessNode({ data, selected }: NodeProps<ProcessNodeType>) {
  const painCount = data.painPointIds.length
  const painLabel = painCount === 1 ? '1 dolor' : `${painCount} dolores`

  return (
    <article className={`process-node category-${data.category}${selected ? ' is-selected' : ''}`}>
      <Handle type="target" position={Position.Left} id="in" isConnectable={false} style={{ top: '35%' }} />
      <Handle type="source" position={Position.Left} id="out-left" isConnectable={false} style={{ top: '70%' }} />
      <Handle type="target" position={Position.Top} id="top" isConnectable={false} style={{ left: '35%' }} />
      <p className="process-node__category">{data.categoryLabel}</p>
      <h3 className="process-node__title">{data.title}</h3>
      <p className="process-node__meta">
        <span>{statusLabels[data.status]}</span>
        <span>{painLabel}</span>
      </p>
      <Handle type="target" position={Position.Right} id="in-right" isConnectable={false} style={{ top: '35%' }} />
      <Handle type="source" position={Position.Right} id="out" isConnectable={false} style={{ top: '70%' }} />
      <Handle type="source" position={Position.Bottom} id="bottom" isConnectable={false} style={{ left: '35%' }} />
      <Handle type="target" position={Position.Bottom} id="bottom-in" isConnectable={false} style={{ left: '70%' }} />
      <Handle type="source" position={Position.Top} id="up" isConnectable={false} style={{ left: '70%' }} />
    </article>
  )
}
