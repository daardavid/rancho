import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import type { ArchNodeData } from '../../../types/architecture.ts'

type ArchNodeType = Node<ArchNodeData, 'archNode'>

const hidden = { opacity: 0, pointerEvents: 'none' as const }

export function ArchitectureNode({ data, selected }: NodeProps<ArchNodeType>) {
  const className = [
    'arch-card',
    `is-${data.kind}`,
    data.classification ? `is-${data.classification}` : '',
    data.points?.length ? 'has-points' : '',
    selected ? 'is-selected' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <article className={className}>
      <Handle type="source" position={Position.Top} id="top-out" isConnectable={false} style={hidden} />
      <Handle type="target" position={Position.Top} id="top-in" isConnectable={false} style={hidden} />
      <Handle type="source" position={Position.Bottom} id="bottom-out" isConnectable={false} style={hidden} />
      <Handle type="target" position={Position.Bottom} id="bottom-in" isConnectable={false} style={hidden} />
      {data.kind === 'layer' ? (
        <>
          <Handle type="source" position={Position.Bottom} id="bottom-herd" isConnectable={false} style={{ ...hidden, left: '9.3%' }} />
          <Handle type="source" position={Position.Bottom} id="bottom-feeding" isConnectable={false} style={{ ...hidden, left: '29.7%' }} />
          <Handle type="source" position={Position.Bottom} id="bottom-growth" isConnectable={false} style={{ ...hidden, left: '50%' }} />
          <Handle type="source" position={Position.Bottom} id="bottom-inventory" isConnectable={false} style={{ ...hidden, left: '70.3%' }} />
          <Handle type="source" position={Position.Bottom} id="bottom-finance" isConnectable={false} style={{ ...hidden, left: '90.7%' }} />
        </>
      ) : null}
      {data.kind === 'runtime' && data.points?.length ? (
        <>
          <Handle type="source" position={Position.Bottom} id="bottom-data" isConnectable={false} style={{ ...hidden, left: '8%' }} />
          <Handle type="source" position={Position.Bottom} id="bottom-files" isConnectable={false} style={{ ...hidden, left: '92%' }} />
        </>
      ) : null}
      <Handle type="source" position={Position.Left} id="left-out" isConnectable={false} style={hidden} />
      <Handle type="target" position={Position.Left} id="left-in" isConnectable={false} style={hidden} />
      <Handle type="source" position={Position.Right} id="right-out" isConnectable={false} style={hidden} />
      <Handle type="target" position={Position.Right} id="right-in" isConnectable={false} style={hidden} />
      <p className="arch-card__kicker">{data.kicker}</p>
      <h3 className="arch-card__title">{data.title}</h3>
      <p className="arch-card__line">{data.line}</p>
      {data.points?.length ? (
        <div className="arch-card__lists">
          <PointList label={data.pointsLabel} items={data.points} />
          {data.aside?.length ? <PointList label={data.asideLabel} items={data.aside} /> : null}
        </div>
      ) : null}
    </article>
  )
}

function PointList({ label, items }: { label?: string; items: string[] }) {
  return (
    <div>
      {label ? <p className="arch-card__list-label">{label}</p> : null}
      <ul className="arch-card__points">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}
