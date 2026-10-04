import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { painPointById } from '../../../data/painPoints.ts'
import { horizonLabels, roleLabels, type ToBeProcessNodeData } from '../../../types/toBe.ts'

type ToBeProcessNodeType = Node<ToBeProcessNodeData, 'toBeProcess'>

export function ToBeProcessNode({ data, selected }: NodeProps<ToBeProcessNodeType>) {
  const visiblePains = data.painPointIds.slice(0, 2)
  const hiddenPains = data.painPointIds.length - visiblePains.length
  const showRole = data.visualRole === 'derived' || data.visualRole === 'supporting'

  return (
    <article
      className={`tobe-process is-${data.visualRole} is-${data.horizon}${selected ? ' is-selected' : ''}`}
    >
      <Handle type="target" position={Position.Left} id="in" isConnectable={false} />
      <Handle type="source" position={Position.Right} id="out" isConnectable={false} />
      <Handle type="target" position={Position.Top} id="top" isConnectable={false} />
      <Handle type="source" position={Position.Bottom} id="bottom" isConnectable={false} />
      <p className="tobe-process__horizon">{horizonLabels[data.horizon]}</p>
      {showRole ? <p className="tobe-process__role">{roleLabels[data.visualRole]}</p> : null}
      <h3 className="tobe-process__title">{data.title}</h3>
      {visiblePains.length > 0 ? (
        <ul className="tobe-process__pains">
          {visiblePains.map((id) => (
            <li key={id}>{painPointById[id]?.title ?? id}</li>
          ))}
        </ul>
      ) : null}
      {hiddenPains > 0 ? (
        <p className="tobe-process__more">
          +{hiddenPains} {hiddenPains === 1 ? 'dolor' : 'dolores'}
        </p>
      ) : null}
    </article>
  )
}
