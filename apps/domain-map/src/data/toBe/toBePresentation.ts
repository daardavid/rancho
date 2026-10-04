/**
 * Map-card wording only. Catalog titles stay on each target process.
 * These lines do not add facts or change effectiveness.
 */
export const toBeCardCopy: Record<string, { cardTitle: string; cardLine: string }> = {
  'TGT-ANIMAL-001': {
    cardTitle: 'Registrar la ficha del animal',
    cardLine: 'Tenencia y «a la parte» pueden quedar desconocidos.',
  },
  'TGT-PUR-001': {
    cardTitle: 'Registrar compra, costo y flete',
    cardLine: 'El lote puede entrar antes que cada ficha.',
  },
  'TGT-ANIMAL-EXIT-001': {
    cardTitle: 'Registrar salida del ganado',
    cardLine: 'La historia permanece. No es solo una venta.',
  },
  'TGT-WEIGH-001': {
    cardTitle: 'Pesar becerros',
    cardLine: 'Una fila: peso, identidad y última vez visto.',
  },
  'TGT-HEALTH-001': {
    cardTitle: 'Anotar la salud',
    cardLine: 'Nota deseable. Sin calendario.',
  },
  'TGT-MOVE-001': {
    cardTitle: 'Anotar dónde está el ganado',
    cardLine: 'Desconocido es válido. No es GPS.',
  },
  'TGT-BIRTH-001': {
    cardTitle: 'Registrar un nacimiento',
    cardLine: 'Una captura crea la ficha.',
  },
  'TGT-REPRO-001': {
    cardTitle: 'Anotar madre y padre',
    cardLine: 'Inferido no es paternidad confirmada.',
  },
  'TGT-FEED-001': {
    cardTitle: 'Registrar compra y entrega',
    cardLine: 'Declarado no es medido.',
  },
  'TGT-INV-001': {
    cardTitle: 'Contar la bodega',
    cardLine: 'La compra de alimento también es la entrada.',
  },
  'TGT-EXPENSE-001': {
    cardTitle: 'Registrar gasto y ticket',
    cardLine: 'Se clasifica cuando se puede.',
  },
  'TGT-SALE-001': {
    cardTitle: 'Registrar la venta',
    cardLine: 'Ingreso conocido. No es la utilidad.',
  },
  'TGT-PROFIT-001': {
    cardTitle: 'Lectura económica provisional',
    cardLine: 'No es utilidad contable ni la parte del ranchero.',
  },
  'TGT-SEC-001': {
    cardTitle: 'Anotar la última vez visto',
    cardLine: 'No verifica a todo el hato.',
  },
  'TGT-HERD-VERIFY-001': {
    cardTitle: 'Verificar el hato',
    cardLine: 'Método y cadencia pendientes.',
  },
  'TGT-SEC-002': {
    cardTitle: 'Registrar intrusión o cerco',
    cardLine: 'No atendido hasta elegir un método.',
  },
  'TGT-GOV-001': {
    cardTitle: 'Avisar faltante o problema grave',
    cardLine: 'El resumen semanal es deseable.',
  },
  'TGT-COMM-001': {
    cardTitle: 'Enviar evidencia al dueño',
    cardLine: 'Es el canal, no un paso de la engorda.',
  },
  'TGT-MILK-001': {
    cardTitle: 'Registrar leche, si vuelve',
    cardLine: 'Condicional. Fuera del flujo inicial.',
  },
}
