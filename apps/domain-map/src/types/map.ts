export type Severity = 'none' | 'low' | 'medium' | 'high' | 'critical'

/**
 * Temporary category used by scaffolding nodes.
 * The ranch process taxonomy has not been designed yet.
 */
export type ProcessCategory = 'scaffolding'

export interface ProcessNodeData extends Record<string, unknown> {
  title: string
  category: ProcessCategory
  description: string
  severity: Severity
  painPointCount: number
}

export type MapView = 'as-is' | 'to-be' | 'architecture'
