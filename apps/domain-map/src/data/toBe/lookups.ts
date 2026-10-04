import { painEffectiveness } from './painEffectiveness.ts'
import { solutionFamilies } from './solutionFamilies.ts'
import { solutionOptions } from './solutionOptions.ts'
import { targetCapabilities } from './targetCapabilities.ts'
import { targetProcesses } from './targetProcesses.ts'
import type {
  PainEffectiveness,
  SolutionFamilyData,
  SolutionOptionData,
  TargetCapabilityData,
  TargetProcessData,
} from '../../types/toBe.ts'

function indexBy<T extends { id: string }>(items: T[]): Record<string, T> {
  return Object.fromEntries(items.map((item) => [item.id, item]))
}

export const targetProcessById: Record<string, TargetProcessData> = indexBy(targetProcesses)
export const capabilityById: Record<string, TargetCapabilityData> = indexBy(targetCapabilities)
export const solutionFamilyById: Record<string, SolutionFamilyData> = indexBy(solutionFamilies)
export const solutionOptionById: Record<string, SolutionOptionData> = indexBy(solutionOptions)

export const effectivenessByPainId: Record<string, PainEffectiveness> = Object.fromEntries(
  painEffectiveness.map((item) => [item.painPointId, item]),
)

export const transversalFamilies = solutionFamilies.filter((family) => family.transversal)
