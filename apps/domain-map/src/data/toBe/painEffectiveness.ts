import type { PainEffectiveness } from '../../types/toBe.ts'

/**
 * Initial project assessment from docs/maps/to-be/README.md v0.2.
 * This is not a project-completion status.
 */
export const painEffectiveness: PainEffectiveness[] = [
  {
    painPointId: 'PP-FEED-001',
    effectiveness: 'visibility_improved_only',
    capabilityIds: ['CAP-FEED-001'],
    processIds: ['TGT-FEED-001'],
    familyIds: ['FAM-FEED-001'],
    remainingExposure:
      'Queda la compra y el dicho. La entrega medida no está. El ejemplo de 1.0 kg frente a 1.5 kg no se prueba. OQ-FEED-002 sigue abierto. CAP-FEED-002 permanece bloqueada.',
  },
  {
    painPointId: 'PP-FIN-001',
    effectiveness: 'partially_controlled',
    capabilityIds: ['CAP-FIN-001', 'CAP-OWN-001'],
    processIds: ['TGT-SALE-001', 'TGT-EXPENSE-001', 'TGT-PUR-001', 'TGT-PROFIT-001'],
    familyIds: ['FAM-SALE-001', 'FAM-FIN-001', 'FAM-PROFIT-001'],
    remainingExposure:
      'Hay ingreso y costos conocidos. La parte del ranchero no se calcula. El costo por kilo espera alimento confiable. La lectura provisional es deseable, no el arranque.',
  },
  {
    painPointId: 'PP-SEC-001',
    effectiveness: 'visibility_improved_only',
    capabilityIds: ['CAP-SEC-001', 'CAP-LIFE-001', 'CAP-LAND-001'],
    processIds: ['TGT-HERD-VERIFY-001', 'TGT-SEC-001', 'TGT-ANIMAL-EXIT-001'],
    familyIds: ['FAM-SEC-001', 'FAM-LIFE-001'],
    remainingExposure:
      'Queda la última observación en la manga. El método y la cadencia de la verificación del hato siguen pendientes. El plazo de 1–2 semanas no se da por bajado.',
  },
  {
    painPointId: 'PP-ID-001',
    effectiveness: 'partially_controlled',
    capabilityIds: ['CAP-ID-001'],
    processIds: ['TGT-ANIMAL-001', 'TGT-BIRTH-001'],
    familyIds: ['FAM-ID-001'],
    remainingExposure: 'La ficha sobrevive al arete. La marca física sigue sin elegir.',
  },
  {
    painPointId: 'PP-DATA-001',
    effectiveness: 'partially_controlled',
    capabilityIds: ['CAP-DATA-001', 'CAP-LIFE-001'],
    processIds: ['TGT-BIRTH-001', 'TGT-WEIGH-001', 'TGT-ANIMAL-EXIT-001', 'TGT-HEALTH-001'],
    familyIds: ['FAM-ID-001', 'FAM-WEIGH-001', 'FAM-LIFE-001'],
    remainingExposure: 'Esos eventos pueden quedar. No todo hecho del campo está en el mínimo.',
  },
  {
    painPointId: 'PP-DATA-002',
    effectiveness: 'partially_controlled',
    capabilityIds: ['CAP-DATA-002'],
    processIds: ['TGT-COMM-001'],
    familyIds: ['FAM-DATA-001'],
    remainingExposure: 'Declarado, observado y medido se distinguen. Un dicho puede seguir siendo falso.',
  },
  {
    painPointId: 'PP-GROW-001',
    effectiveness: 'substantially_controlled',
    capabilityIds: ['CAP-GROW-001'],
    processIds: ['TGT-WEIGH-001'],
    familyIds: ['FAM-WEIGH-001'],
    remainingExposure: 'Serie y hueco de becerros. Quién entra a la rutina sigue en OQ-OWN-003.',
  },
  {
    painPointId: 'PP-FIN-002',
    effectiveness: 'partially_controlled',
    capabilityIds: ['CAP-FIN-002'],
    processIds: ['TGT-EXPENSE-001'],
    familyIds: ['FAM-FIN-001'],
    remainingExposure: 'El ticket se clasifica cuando se puede. OQ-FIN-001 sigue abierto.',
  },
  {
    painPointId: 'PP-INV-001',
    effectiveness: 'partially_controlled',
    capabilityIds: ['CAP-INV-001'],
    processIds: ['TGT-INV-001'],
    familyIds: ['FAM-INV-001'],
    remainingExposure:
      'El conteo físico de ingredientes entra al mínimo. El saldo teórico hereda salidas declaradas.',
  },
  {
    painPointId: 'PP-SEC-002',
    effectiveness: 'visibility_improved_only',
    capabilityIds: ['CAP-SEC-001'],
    processIds: ['TGT-SEC-001', 'TGT-HERD-VERIFY-001'],
    familyIds: ['FAM-SEC-001'],
    remainingExposure: 'Ver a un becerro en la manga no es verificar el hato.',
  },
  {
    painPointId: 'PP-SEC-003',
    effectiveness: 'not_addressed',
    capabilityIds: ['CAP-SEC-002'],
    processIds: ['TGT-SEC-002'],
    familyIds: ['FAM-SEC-002'],
    remainingExposure: 'El control deseado existe. La implementación no está elegida.',
  },
  {
    painPointId: 'PP-HEALTH-001',
    effectiveness: 'partially_controlled',
    capabilityIds: ['CAP-HEALTH-001'],
    processIds: ['TGT-HEALTH-001'],
    familyIds: ['FAM-HEALTH-001'],
    remainingExposure: 'La nota existe como deseable. No hay calendario.',
  },
  {
    painPointId: 'PP-REPRO-001',
    effectiveness: 'partially_controlled',
    capabilityIds: ['CAP-REPRO-001'],
    processIds: ['TGT-BIRTH-001', 'TGT-REPRO-001'],
    familyIds: ['FAM-REPRO-001'],
    remainingExposure: 'El nacimiento crea la ficha. El padre inferido no es paternidad confirmada.',
  },
  {
    painPointId: 'PP-MILK-001',
    effectiveness: 'conditional',
    capabilityIds: ['CAP-MILK-001'],
    processIds: ['TGT-MILK-001'],
    familyIds: ['FAM-MILK-001'],
    remainingExposure: 'Fuera del flujo inicial. La ordeña no es operación vigente.',
  },
  {
    painPointId: 'PP-CONN-001',
    effectiveness: 'partially_controlled',
    capabilityIds: ['CAP-CONN-001'],
    processIds: ['TGT-COMM-001'],
    familyIds: ['FAM-CONN-001'],
    remainingExposure: 'Se asienta después. Un aviso urgente sigue necesitando señal. No hay diseño de sincronización.',
  },
  {
    painPointId: 'PP-GOV-001',
    effectiveness: 'partially_controlled',
    capabilityIds: ['CAP-GOV-001', 'CAP-COMM-001'],
    processIds: ['TGT-GOV-001'],
    familyIds: ['FAM-GOV-001'],
    remainingExposure:
      'El aviso crítico entra al mínimo. El resumen semanal es deseable. Su verdad depende de los otros registros.',
  },
]

export const criticalPainIds = ['PP-FEED-001', 'PP-FIN-001', 'PP-SEC-001'] as const
