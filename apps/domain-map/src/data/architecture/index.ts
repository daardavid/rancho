import type { Edge, Node } from '@xyflow/react'
import type { ArchDetail, ArchNodeData, ArchView } from '../../types/architecture.ts'
import { contextDetails, contextEdges, contextNodes } from './systemContext.ts'
import { deploymentDetails, deploymentEdges, deploymentNodes } from './deployment.ts'
import { moduleDetails, moduleEdges, moduleNodes } from './modules.ts'
import { readModelDetails, readModelNodes } from './readModels.ts'
import { workflowDetails, workflowGraphs, workflows } from './workflows.ts'
import { assertArchitectureData } from './validateArchitecture.ts'

export const architectureDetails: ArchDetail[] = [
  ...contextDetails,
  ...deploymentDetails,
  ...moduleDetails,
  ...readModelDetails,
  ...workflowDetails,
]

assertArchitectureData(architectureDetails)

const detailById = new Map(architectureDetails.map((detail) => [detail.id, detail]))

export function architectureDetail(id: string): ArchDetail | undefined {
  return detailById.get(id)
}

export function architectureGraph(
  view: ArchView,
  workflowId: string,
): { nodes: Node<ArchNodeData, 'archNode'>[]; edges: Edge<{ kind: 'call' | 'read' | 'technical' }>[] } {
  if (view === 'context') return { nodes: contextNodes, edges: contextEdges }
  if (view === 'deployment') return { nodes: deploymentNodes, edges: deploymentEdges }
  if (view === 'modules') return { nodes: [...moduleNodes, ...readModelNodes], edges: moduleEdges }
  const graph = workflowGraphs.find((item) => item.id === workflowId) ?? workflowGraphs[0]
  return { nodes: graph.nodes, edges: graph.edges }
}

export { workflows }
