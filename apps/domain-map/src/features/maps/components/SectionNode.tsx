import type { Node, NodeProps } from '@xyflow/react'
import type { SectionNodeData } from '../../../types/map.ts'

type SectionNodeType = Node<SectionNodeData, 'section'>

export function SectionNode({ data }: NodeProps<SectionNodeType>) {
  return (
    <div className="section-node">
      <p className="section-node__title">{data.title}</p>
    </div>
  )
}
