import type { ProcessFlowNode } from '../../../data/asIsMap.ts'

interface DetailPanelProps {
  node: ProcessFlowNode | null
}

export function DetailPanel({ node }: DetailPanelProps) {
  return (
    <aside className="detail-panel" aria-label="Process details">
      {node ? (
        <div className="detail-panel__content">
          <p className="detail-panel__kicker">Process</p>
          <h2>{node.data.title}</h2>
          <dl>
            <div>
              <dt>Category</dt>
              <dd>{node.data.category}</dd>
            </div>
            <div>
              <dt>Description</dt>
              <dd>{node.data.description}</dd>
            </div>
            <div>
              <dt>Severity</dt>
              <dd className={`severity-label severity-${node.data.severity}`}>{node.data.severity}</dd>
            </div>
            <div>
              <dt>Pain point count</dt>
              <dd>{node.data.painPointCount}</dd>
            </div>
          </dl>
        </div>
      ) : (
        <div className="detail-panel__empty">
          <h2>No process selected</h2>
          <p>Select a node on the map to inspect its title, category, description, severity, and pain point count.</p>
        </div>
      )}
    </aside>
  )
}
