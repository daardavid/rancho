import { capabilityById, targetProcessById } from '../toBe/lookups.ts'
import { adrCatalog } from './architectureDecisions.ts'
import { contextEdges, contextNodes } from './systemContext.ts'
import { deploymentEdges, deploymentNodes } from './deployment.ts'
import { domainModules, moduleEdges, moduleNodes } from './modules.ts'
import { readModelNodes, readModels } from './readModels.ts'
import { workflowGraphs, workflows } from './workflows.ts'
import type { ArchDetail } from '../../types/architecture.ts'

function duplicates(ids: string[]): string[] {
  const seen = new Set<string>()
  const repeated = new Set<string>()
  for (const id of ids) {
    if (seen.has(id)) repeated.add(id)
    seen.add(id)
  }
  return [...repeated]
}

export function validateArchitectureData(details: ArchDetail[]): string[] {
  const errors: string[] = []
  const adrIds = new Set(adrCatalog.map((item) => item.id))
  const moduleIds = new Set(domainModules.map((item) => item.id))
  const readModelIds = new Set(readModels.map((item) => item.id))
  const workflowIds = new Set(workflows.map((item) => item.id))
  const detailIds = new Set(details.map((item) => item.id))

  const nodeGroups = [
    contextNodes,
    deploymentNodes,
    [...moduleNodes, ...readModelNodes],
    ...workflowGraphs.map((graph) => graph.nodes),
  ]
  const allNodeIds = nodeGroups.flatMap((nodes) => nodes.map((node) => node.id))
  for (const id of duplicates(allNodeIds)) errors.push(`Identificador de nodo repetido: ${id}`)
  for (const id of duplicates(details.map((item) => item.id))) errors.push(`Detalle repetido: ${id}`)
  for (const id of duplicates(domainModules.map((item) => item.id))) errors.push(`Módulo repetido: ${id}`)
  for (const id of duplicates(readModels.map((item) => item.id))) errors.push(`Lectura repetida: ${id}`)

  const moduleNodesOnly = moduleNodes.filter((node) => node.data.kind === 'module')
  if (moduleNodesOnly.length !== 5) errors.push('El mapa debe mostrar exactamente cinco módulos de dominio')
  for (const record of domainModules) {
    if (!moduleIds.has(record.id)) errors.push(`Módulo desconocido: ${record.id}`)
    const node = moduleNodes.find((item) => item.id === record.id)
    if (!node || node.data.classification !== record.classification) {
      errors.push(`${record.id} no coincide con su clasificación en el diagrama`)
    }
    for (const id of record.readModelIds) {
      if (!readModelIds.has(id)) errors.push(`${record.id} cita una lectura que no existe: ${id}`)
    }
    for (const id of record.workflowIds) {
      if (!workflowIds.has(id)) errors.push(`${record.id} cita un flujo que no existe: ${id}`)
    }
  }

  const core = domainModules.filter((item) => item.classification === 'core').map((item) => item.id)
  const supporting = domainModules.filter((item) => item.classification === 'supporting').map((item) => item.id)
  if (core.join() !== ['mod-herd', 'mod-feeding'].join()) errors.push('El núcleo debe ser Hato y Alimentación')
  if (supporting.join() !== ['mod-growth', 'mod-inventory', 'mod-finance'].join()) {
    errors.push('El apoyo debe ser Crecimiento, Inventario y Finanzas')
  }

  for (const workflow of workflows) {
    for (const id of workflow.moduleIds) {
      if (!moduleIds.has(id)) errors.push(`${workflow.id} cita un módulo que no existe: ${id}`)
    }
    for (const id of workflow.readModelIds) {
      if (!readModelIds.has(id)) errors.push(`${workflow.id} cita una lectura que no existe: ${id}`)
    }
    if (!workflowGraphs.some((graph) => graph.id === workflow.id)) errors.push(`${workflow.id} no tiene diagrama`)
  }

  const graphs = [
    { name: 'Contexto', nodes: contextNodes, edges: contextEdges },
    { name: 'Despliegue', nodes: deploymentNodes, edges: deploymentEdges },
    { name: 'Módulos', nodes: [...moduleNodes, ...readModelNodes], edges: moduleEdges },
    ...workflowGraphs.map((graph) => ({ name: graph.id, nodes: graph.nodes, edges: graph.edges })),
  ]
  for (const graph of graphs) {
    const ids = new Set(graph.nodes.map((node) => node.id))
    for (const node of graph.nodes) {
      if (!detailIds.has(node.data.detailId)) errors.push(`${graph.name} no tiene detalle para ${node.id}`)
    }
    for (const edge of graph.edges) {
      if (!ids.has(edge.source) || !ids.has(edge.target)) {
        errors.push(`${graph.name} tiene una arista suelta: ${edge.id}`)
      }
    }
  }

  for (const detail of details) {
    for (const id of detail.adrIds ?? []) {
      if (!adrIds.has(id)) errors.push(`${detail.id} cita un ADR que no existe: ${id}`)
    }
    for (const id of detail.targetIds ?? []) {
      const known = id.startsWith('CAP-') ? capabilityById[id] : targetProcessById[id]
      if (!known) errors.push(`${detail.id} cita un objetivo que no existe: ${id}`)
    }
  }

  return errors
}

export function assertArchitectureData(details: ArchDetail[]): void {
  const errors = validateArchitectureData(details)
  if (errors.length > 0) {
    throw new Error(`Datos de arquitectura inconsistentes:\n${errors.join('\n')}`)
  }
}
