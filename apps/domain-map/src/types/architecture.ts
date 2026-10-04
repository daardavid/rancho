export type ArchView = 'context' | 'deployment' | 'modules' | 'flows'

export type ArchNodeKind =
  | 'actor'
  | 'channel'
  | 'system'
  | 'future'
  | 'runtime'
  | 'store'
  | 'layer'
  | 'module'
  | 'readmodel'
  | 'transversal'
  | 'step'
  | 'note'

export type ArchEdgeKind = 'call' | 'read' | 'technical'

export type ArchDirection = 'down' | 'up' | 'right' | 'left'

export type ModuleClass = 'core' | 'supporting'

export interface ArchNodeData extends Record<string, unknown> {
  kind: ArchNodeKind
  kicker: string
  title: string
  line: string
  detailId: string
  classification?: ModuleClass
  points?: string[]
  pointsLabel?: string
  aside?: string[]
  asideLabel?: string
}

export interface ArchSection {
  heading: string
  text?: string
  items?: string[]
}

export interface ArchDetail {
  id: string
  kicker: string
  title: string
  summary: string
  sections: ArchSection[]
  adrIds?: string[]
  targetIds?: string[]
}

export interface DomainModuleRecord {
  id: string
  classification: ModuleClass
  schema: string
  readModelIds: string[]
  workflowIds: string[]
}

export interface WorkflowRecord {
  id: string
  title: string
  moduleIds: string[]
  readModelIds: string[]
}

export const archViewLabels: { id: ArchView; label: string }[] = [
  { id: 'context', label: 'Contexto' },
  { id: 'deployment', label: 'Despliegue' },
  { id: 'modules', label: 'Módulos' },
  { id: 'flows', label: 'Flujos' },
]
