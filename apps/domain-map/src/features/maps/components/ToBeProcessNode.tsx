import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { horizonLabels, type ToBeProcessNodeData } from '../../../types/toBe.ts'

type ToBeProcessNodeType = Node<ToBeProcessNodeData, 'toBeProcess'>

export function ToBeProcessNode({ data, selected }: NodeProps<ToBeProcessNodeType>) {
  return (
    <article className={`tobe-process is-${data.visualRole} is-${data.horizon}${selected ? ' is-selected' : ''}`}>
      <Handle type="target" position={Position.Left} id="in" isConnectable={false} />
      <Handle type="source" position={Position.Right} id="out" isConnectable={false} />
      <Handle type="target" position={Position.Top} id="top" isConnectable={false} />
      <Handle type="source" position={Position.Bottom} id="bottom" isConnectable={false} />
      <p className="tobe-process__horizon">{horizonLabels[data.horizon]}</p>
      <h3 className="tobe-process__title">{data.cardTitle}</h3>
      <p className="tobe-process__line">{data.cardLine}</p>
    </article>
  )
}
