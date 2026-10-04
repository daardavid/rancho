import { painPoints } from '../painPoints.ts'
import { painEffectiveness } from './painEffectiveness.ts'
import { solutionFamilies } from './solutionFamilies.ts'
import { solutionOptions } from './solutionOptions.ts'
import { targetCapabilities } from './targetCapabilities.ts'
import { targetProcesses } from './targetProcesses.ts'

function duplicates(ids: string[]): string[] {
  const seen = new Set<string>()
  const repeated = new Set<string>()
  for (const id of ids) {
    if (seen.has(id)) repeated.add(id)
    seen.add(id)
  }
  return [...repeated]
}

export function validateToBeData(renderedProcessIds: string[]): string[] {
  const errors: string[] = []
  const painIds = new Set(painPoints.map((pain) => pain.id))
  const capabilityIds = new Set(targetCapabilities.map((item) => item.id))
  const processIds = new Set(targetProcesses.map((item) => item.id))
  const familyIds = new Set(solutionFamilies.map((item) => item.id))
  const optionIds = new Set(solutionOptions.map((item) => item.id))

  const repeated = [
    ...duplicates(targetCapabilities.map((item) => item.id)),
    ...duplicates(targetProcesses.map((item) => item.id)),
    ...duplicates(solutionFamilies.map((item) => item.id)),
    ...duplicates(solutionOptions.map((item) => item.id)),
    ...duplicates(painEffectiveness.map((item) => item.painPointId)),
    ...duplicates(renderedProcessIds),
  ]
  for (const id of repeated) errors.push(`Identificador repetido: ${id}`)

  const requirePain = (id: string, where: string) => {
    if (!painIds.has(id)) errors.push(`${where} cita un dolor que no existe: ${id}`)
  }
  const requireCapability = (id: string, where: string) => {
    if (!capabilityIds.has(id)) errors.push(`${where} cita una capacidad que no existe: ${id}`)
  }
  const requireProcess = (id: string, where: string) => {
    if (!processIds.has(id)) errors.push(`${where} cita un proceso que no existe: ${id}`)
  }
  const requireFamily = (id: string, where: string) => {
    if (!familyIds.has(id)) errors.push(`${where} cita una familia que no existe: ${id}`)
  }
  const requireOption = (id: string, where: string) => {
    if (!optionIds.has(id)) errors.push(`${where} cita una opción que no existe: ${id}`)
  }

  for (const process of targetProcesses) {
    for (const id of process.painPointIds) requirePain(id, process.id)
    for (const id of process.capabilityIds) requireCapability(id, process.id)
    for (const id of process.familyIds) requireFamily(id, process.id)
  }

  for (const capability of targetCapabilities) {
    for (const id of capability.painPointIds) requirePain(id, capability.id)
  }

  for (const option of solutionOptions) {
    for (const id of option.painPointIds) requirePain(id, option.id)
    for (const id of option.capabilityIds) requireCapability(id, option.id)
  }

  const citedOptions = new Set<string>()
  for (const family of solutionFamilies) {
    const cited = [
      ...family.primarySolutionIds,
      ...family.visibleAlternativeIds,
      ...family.shelves.recommendedNow,
      ...family.shelves.investigate,
      ...family.shelves.scale,
      ...family.shelves.notRecommendedNow,
    ]
    if (family.visibleAlternativeIds.length > 2) {
      errors.push(`${family.id} muestra más de dos alternativas visibles`)
    }
    for (const id of cited) {
      requireOption(id, family.id)
      if (citedOptions.has(id)) errors.push(`${id} aparece en más de una familia`)
      citedOptions.add(id)
    }
  }

  for (const id of optionIds) {
    if (!citedOptions.has(id)) errors.push(`${id} no es accesible desde ninguna familia`)
  }

  for (const item of painEffectiveness) {
    requirePain(item.painPointId, 'Efectividad')
    for (const id of item.capabilityIds) requireCapability(id, item.painPointId)
    for (const id of item.processIds) requireProcess(id, item.painPointId)
    for (const id of item.familyIds) requireFamily(id, item.painPointId)
  }

  const rendered = new Set(renderedProcessIds)
  for (const id of rendered) requireProcess(id, 'Mapa')
  for (const id of processIds) {
    if (!rendered.has(id)) errors.push(`${id} no está dibujado en el mapa`)
  }

  return errors
}

export function assertToBeData(renderedProcessIds: string[]): void {
  const errors = validateToBeData(renderedProcessIds)
  if (errors.length > 0) {
    throw new Error(`Datos TO-BE inconsistentes:\n${errors.join('\n')}`)
  }
}
