export type MapView = 'as-is' | 'to-be' | 'architecture'

export type ProcessStatus = 'current' | 'current_informal' | 'historical_inactive'

export type ProcessCategory =
  | 'engorda'
  | 'reproduccion'
  | 'inventario'
  | 'finanzas'
  | 'seguridad'
  | 'terreno'
  | 'informacion'

export type ProcessFilter =
  | 'datos'
  | 'pesaje'
  | 'alimentacion'
  | 'finanzas'
  | 'inventario'
  | 'seguridad'
  | 'salud'
  | 'reproduccion'

export type MapFilter = 'todos' | ProcessFilter

export type InitialSeverity = 'baja' | 'media' | 'alta' | 'critica'

export type Confidence = 'baja' | 'media' | 'alta'

export interface ProcessNodeData extends Record<string, unknown> {
  processId: string
  title: string
  shortDescription: string
  category: ProcessCategory
  categoryLabel: string
  status: ProcessStatus
  actors: string[]
  currentProcess: string
  inputs: string[]
  outputs: string[]
  dataSources: string[]
  painPointIds: string[]
  openQuestionIds: string[]
  warnings: string[]
  notes: string[]
  filters: ProcessFilter[]
  /** Short job label for a card that is not a step in a sequence. */
  roleLabel?: string
}

export interface SectionNodeData extends Record<string, unknown> {
  title: string
  summary: string
  canvasNote?: string
  /** Dashed association may end on this section rather than on every process. */
  associationTarget?: boolean
  /** Visual frame only. Omitted on the AS-IS map. */
  variant?: 'conditional'
  processIds: string[]
}

export type EdgeRelation = 'sequence' | 'association'

export interface PainPoint {
  id: string
  title: string
  currentSituation: string
  impact: string
  evidence: string
  initialSeverity: InitialSeverity
  confidence: Confidence
  notes: string
}

export const statusLabels: Record<ProcessStatus, string> = {
  current: 'Se hace',
  current_informal: 'Se hace, sin registro',
  historical_inactive: 'Histórico, inactivo',
}

export const severityLabels: Record<InitialSeverity, string> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  critica: 'Crítica',
}

export const confidenceLabels: Record<Confidence, string> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
}

export const filterLabels: { id: MapFilter; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'datos', label: 'Datos' },
  { id: 'pesaje', label: 'Pesaje' },
  { id: 'alimentacion', label: 'Alimentación' },
  { id: 'finanzas', label: 'Finanzas' },
  { id: 'inventario', label: 'Bodega' },
  { id: 'seguridad', label: 'Seguridad' },
  { id: 'salud', label: 'Salud' },
  { id: 'reproduccion', label: 'Reproducción' },
]
