import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import type { SectionNodeData } from '../../../types/map.ts'

type SectionNodeType = Node<SectionNodeData, 'section'>

export function SectionNode({ data }: NodeProps<SectionNodeType>) {
  return (
    <div className="section-node">
      <p className="section-node__title">{data.title}</p>
      {data.canvasNote ? <p className="section-node__note">{data.canvasNote}</p> : null}
      {data.associationTarget ? (
        <Handle
          type="target"
          position={Position.Bottom}
          id="group-in"
          isConnectable={false}
          style={{ left: '78%' }}
        />
      ) : null}
    </div>
  )
}
