import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import type { ProcessNodeData } from '../../../types/map.ts'

type ProcessNodeType = Node<ProcessNodeData, 'process'>

export function ProcessNode({ data, selected }: NodeProps<ProcessNodeType>) {
  return (
    <article className={`process-node severity-${data.severity}${selected ? ' is-selected' : ''}`}>
      <Handle type="target" position={Position.Top} isConnectable={false} />
      <p className="process-node__category">{data.category}</p>
      <h3 className="process-node__title">{data.title}</h3>
      <Handle type="source" position={Position.Bottom} isConnectable={false} />
    </article>
  )
}
