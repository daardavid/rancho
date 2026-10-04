export type TargetHorizon = 'minimum' | 'desirable' | 'pending_method' | 'scale' | 'conditional'

export type VisualRole = 'operational' | 'supporting' | 'derived' | 'pending_method' | 'conditional'

/** Shelf used to group solution options. Scale is not a promise of later adoption. */
export type SolutionHorizon = 'recommended_now' | 'investigate' | 'scale' | 'not_recommended_now'

export type Effectiveness =
  | 'substantially_controlled'
  | 'partially_controlled'
  | 'visibility_improved_only'
  | 'not_addressed'
  | 'conditional'

export type SolutionType = 'PROCESS' | 'POLICY' | 'SOFTWARE' | 'HARDWARE' | 'AUTOMATION'

export type CostLevel = 'low' | 'medium' | 'high' | 'very_high'

export type BandLevel = 'low' | 'medium' | 'high'

export type DependencyLevel = 'none' | 'low' | 'medium' | 'high'

export type Recommendation = 'yes' | 'no' | 'investigate'

export type ToBeAreaFilter =
  | 'identidad'
  | 'pesaje'
  | 'alimentacion'
  | 'finanzas'
  | 'bodega'
  | 'seguridad'
  | 'salud'
  | 'reproduccion'

export type ToBeHorizonFilter = 'todos' | TargetHorizon

export type ToBeAreaSelection = 'todos' | ToBeAreaFilter

export interface TargetCapabilityData {
  id: string
  title: string
  purpose: string
  desiredOutcome: string
  painPointIds: string[]
  transversal?: boolean
  blocked?: boolean
}

export interface FeedQuantityNote {
  name: string
  meaning: string
}

export interface TargetProcessData {
  id: string
  title: string
  groupId: string
  visualRole: VisualRole
  horizon: TargetHorizon
  objective: string
  trigger: string
  actors: string[]
  steps: string[]
  informationProduced: string[]
  evidenceProduced: string[]
  capabilityIds: string[]
  painPointIds: string[]
  unresolved: string[]
  familyIds: string[]
  openQuestionIds: string[]
  filters: ToBeAreaFilter[]
  captureOnce?: string[]
  tenureOptions?: string[]
  participationOptions?: string[]
  ownershipNote?: string
  parentageCertainties?: string[]
  inferenceReasons?: string[]
  parentageNote?: string
  exitReasons?: string[]
  exitNote?: string
  locationNote?: string
  feedQuantities?: FeedQuantityNote[]
  feedNote?: string
  profitCanInclude?: string[]
  profitCannotClaim?: string[]
  profitNote?: string
  presenceNote?: string
}

export interface SolutionShelves {
  recommendedNow: string[]
  investigate: string[]
  scale: string[]
  notRecommendedNow: string[]
}

export interface SolutionFamilyData {
  id: string
  title: string
  intro: string
  primarySolutionIds: string[]
  visibleAlternativeIds: string[]
  shelves: SolutionShelves
  honestyLines?: string[]
  transversal?: boolean
}

export interface SolutionOptionData {
  id: string
  title: string
  description: string
  types: SolutionType[]
  painPointIds: string[]
  capabilityIds: string[]
  capabilityNote: string
  howItHelps: string
  pros: string
  cons: string
  preconditions: string
  cost: CostLevel
  complexity: BandLevel
  operationalFriction: BandLevel
  dataReliability: BandLevel
  humanDependency: BandLevel
  connectivityDependency: DependencyLevel
  hardwareDependency: DependencyLevel
  scalability: BandLevel
  auditability: BandLevel
  currentFeasibility: BandLevel
  recommendedNow: Recommendation
  recommendedAtScale: Recommendation
  packageNote: string
  rationale: string
  questionsToValidate: string
}

export interface PainEffectiveness {
  painPointId: string
  effectiveness: Effectiveness
  capabilityIds: string[]
  processIds: string[]
  familyIds: string[]
  remainingExposure: string
}

export interface ToBeProcessNodeData extends Record<string, unknown> {
  processId: string
  /** Catalog title. Shown in the detail panel, not as the map headline. */
  title: string
  /** Ranch-language label for the map card. Does not replace the catalog title. */
  cardTitle: string
  /** One outcome or remaining-exposure line for the map card. */
  cardLine: string
  horizon: TargetHorizon
  visualRole: VisualRole
  painPointIds: string[]
}

export const horizonLabels: Record<TargetHorizon, string> = {
  minimum: 'Mínimo útil',
  desirable: 'Deseable ahora',
  pending_method: 'Método pendiente',
  scale: 'A escala',
  conditional: 'Condicional',
}

export const roleLabels: Record<VisualRole, string> = {
  operational: 'Operación deseada',
  supporting: 'Apoyo',
  derived: 'Hecho derivado',
  pending_method: 'Método pendiente',
  conditional: 'Condicional',
}

export const effectivenessLabels: Record<Effectiveness, string> = {
  substantially_controlled: 'Sustancialmente controlado',
  partially_controlled: 'Control parcial',
  visibility_improved_only: 'Solo mejora visibilidad',
  not_addressed: 'No atendido',
  conditional: 'Condicional',
}

export const solutionTypeLabels: Record<SolutionType, string> = {
  PROCESS: 'Proceso',
  POLICY: 'Política',
  SOFTWARE: 'Software',
  HARDWARE: 'Hardware',
  AUTOMATION: 'Automatización',
}

export const shelfLabels: Record<keyof SolutionShelves, string> = {
  recommendedNow: 'Recomendado ahora',
  investigate: 'Investigar',
  scale: 'A escala',
  notRecommendedNow: 'No recomendado ahora',
}

export const costLabels: Record<CostLevel, string> = {
  low: 'Bajo',
  medium: 'Medio',
  high: 'Alto',
  very_high: 'Muy alto',
}

export const bandLabels: Record<BandLevel, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
}

export const dependencyLabels: Record<DependencyLevel, string> = {
  none: 'Ninguna',
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
}

export const recommendationLabels: Record<Recommendation, string> = {
  yes: 'Sí',
  no: 'No',
  investigate: 'Investigar',
}

export const actorLabels: Record<string, string> = {
  'ACT-OWNER': 'Propietario',
  'ACT-WORKER': 'Trabajador',
  'ACT-PARTNER': 'Socio, ganado a la parte',
  'ACT-FEED': 'Proveedor de alimento',
  'ACT-SELLER': 'Vendedor de ganado',
  'ACT-BUYER': 'Comprador de ganado',
  'ACT-VET': 'Veterinario',
  'ACT-DAIRY': 'Destino de leche',
}

export const horizonFilterOptions: { id: ToBeHorizonFilter; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'minimum', label: 'Mínimo útil' },
  { id: 'desirable', label: 'Deseable ahora' },
  { id: 'pending_method', label: 'Método pendiente' },
  { id: 'conditional', label: 'Condicional' },
]

export const areaFilterOptions: { id: ToBeAreaSelection; label: string }[] = [
  { id: 'todos', label: 'Todas las áreas' },
  { id: 'identidad', label: 'Identidad' },
  { id: 'pesaje', label: 'Pesaje' },
  { id: 'alimentacion', label: 'Alimentación' },
  { id: 'finanzas', label: 'Finanzas' },
  { id: 'bodega', label: 'Bodega' },
  { id: 'seguridad', label: 'Seguridad' },
  { id: 'salud', label: 'Salud' },
  { id: 'reproduccion', label: 'Reproducción' },
]
