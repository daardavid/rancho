import type { SolutionFamilyData } from '../../types/toBe.ts'

const emptyShelves = {
  recommendedNow: [],
  investigate: [],
  scale: [],
  notRecommendedNow: [],
}

/** Presentation layer from docs/maps/to-be/solution-families.md v0.2. */
export const solutionFamilies: SolutionFamilyData[] = [
  {
    id: 'FAM-ID-001',
    title: 'Identidad',
    intro: 'La ficha del rancho es el camino principal. La foto ayuda y no es la identidad. La marca física sigue en investigación.',
    primarySolutionIds: ['SOL-ID-001'],
    visibleAlternativeIds: ['SOL-ID-002'],
    shelves: {
      ...emptyShelves,
      investigate: ['SOL-ID-003'],
      scale: ['SOL-ID-005'],
      notRecommendedNow: ['SOL-ID-004'],
    },
  },
  {
    id: 'FAM-OWN-001',
    title: 'Tenencia y participación',
    intro:
      'No tiene una opción aparte. Vive en SOL-ID-001 y en la ficha, la compra y el nacimiento. La tenencia puede ser del rancho, a la parte, de un tercero o desconocida. La participación económica puede ser conocida, parcial o desconocida. El relato verbal se guarda como nota. No se traduce a un porcentaje.',
    primarySolutionIds: [],
    visibleAlternativeIds: [],
    shelves: { ...emptyShelves },
  },
  {
    id: 'FAM-LIFE-001',
    title: 'Salida del activo',
    intro:
      'El animal deja de estar activo y la ficha permanece. La venta no es una segunda captura: el mismo evento de venta produce la salida.',
    primarySolutionIds: ['SOL-LIFE-001'],
    visibleAlternativeIds: [],
    shelves: { ...emptyShelves },
  },
  {
    id: 'FAM-LAND-001',
    title: 'Lugar esperado',
    intro:
      'Deseable, no exigido para empezar. Desconocido es un estado válido. No hay alternativa de GPS en esta familia.',
    primarySolutionIds: ['SOL-LAND-001'],
    visibleAlternativeIds: [],
    shelves: { ...emptyShelves },
    honestyLines: [
      'Aproximadamente 8 potreros conocidos o identificados.',
      'No se afirma que hoy tengan nombres formales ni que cubran las aproximadamente 530 hectáreas.',
    ],
  },
  {
    id: 'FAM-WEIGH-001',
    title: 'Pesaje de becerros',
    intro: 'Una sola fila por becerro: peso, identidad y última observación. La foto del indicador es deseable, no otro trámite.',
    primarySolutionIds: ['SOL-GROW-001', 'SOL-GROW-004'],
    visibleAlternativeIds: ['SOL-GROW-002'],
    shelves: {
      ...emptyShelves,
      investigate: ['SOL-GROW-003'],
    },
  },
  {
    id: 'FAM-FEED-001',
    title: 'Alimento',
    intro:
      'El mínimo registra la compra, con su calidad, junto con la entrada de bodega. Preparar y declarar una entrega no comprueba la entrega.',
    primarySolutionIds: ['SOL-FEED-001', 'SOL-FEED-002'],
    visibleAlternativeIds: ['SOL-FEED-003'],
    shelves: {
      ...emptyShelves,
      scale: ['SOL-FEED-004', 'SOL-FEED-005'],
      notRecommendedNow: ['SOL-FEED-006'],
    },
    honestyLines: ['Declaración estructurada + evidencia', 'Entrega física medida: investigar'],
  },
  {
    id: 'FAM-INV-001',
    title: 'Bodega',
    intro:
      'El conteo físico de ingredientes entra al mínimo. El saldo teórico es deseable y hereda la calidad de las salidas. No es un almacén industrial.',
    primarySolutionIds: ['SOL-INV-001'],
    visibleAlternativeIds: [],
    shelves: {
      ...emptyShelves,
      notRecommendedNow: ['SOL-INV-002'],
    },
  },
  {
    id: 'FAM-FIN-001',
    title: 'Gastos',
    intro: 'El ticket clasificado es el camino principal. El efectivo sin ticket se anota igual. No se integra con cuentas.',
    primarySolutionIds: ['SOL-FIN-002', 'SOL-FIN-001'],
    visibleAlternativeIds: [],
    shelves: {
      ...emptyShelves,
      notRecommendedNow: ['SOL-FIN-004'],
    },
  },
  {
    id: 'FAM-PUR-001',
    title: 'Compra de ganado',
    intro: 'Se registra costo, flete y forma de compra. Por bulto no se traduce a precio por cabeza. Pesar al llegar sigue en investigación.',
    primarySolutionIds: ['SOL-PUR-001'],
    visibleAlternativeIds: [],
    shelves: {
      ...emptyShelves,
      investigate: ['SOL-PUR-002'],
    },
  },
  {
    id: 'FAM-SALE-001',
    title: 'Ingreso de venta',
    intro: 'El ingreso conocido entra al mínimo. Esta familia no calcula margen ni la parte del socio.',
    primarySolutionIds: ['SOL-SALE-001'],
    visibleAlternativeIds: [],
    shelves: { ...emptyShelves },
  },
  {
    id: 'FAM-PROFIT-001',
    title: 'Lectura provisional',
    intro:
      'Deseable ahora, fuera del mínimo. Lee lo ya registrado. No es utilidad fiscal ni finiquito del socio.',
    primarySolutionIds: ['SOL-FIN-003'],
    visibleAlternativeIds: [],
    shelves: { ...emptyShelves },
    honestyLines: [
      'Lectura económica provisional.',
      'La parte del ranchero queda desconocida.',
      'No calcula costo por kilo mientras el alimento no sea confiable.',
    ],
  },
  {
    id: 'FAM-SEC-001',
    title: 'Presencia',
    intro:
      'La última observación sale de un manejo y no es un segundo registro. La verificación del hato sigue sin método ni cadencia.',
    primarySolutionIds: ['SOL-SEC-002'],
    visibleAlternativeIds: ['SOL-SEC-001'],
    shelves: {
      ...emptyShelves,
      scale: ['SOL-SEC-003'],
      notRecommendedNow: ['SOL-SEC-004'],
    },
    honestyLines: [
      'Última vez observado: puede salir del pesaje o de otro manejo.',
      'Verificación completa del hato: método pendiente y cadencia pendiente.',
    ],
  },
  {
    id: 'FAM-SEC-002',
    title: 'Intrusión',
    intro:
      'El control deseado existe. La implementación no está elegida. Ninguna opción es principal. PP-SEC-003 sigue sin abordar. No se promueve cámara, luz, sensor, RFID ni GPS.',
    primarySolutionIds: [],
    visibleAlternativeIds: [],
    shelves: {
      ...emptyShelves,
      investigate: ['SOL-SEC-005', 'SOL-SEC-006', 'SOL-SEC-007', 'SOL-SEC-009'],
      notRecommendedNow: ['SOL-SEC-008'],
    },
    honestyLines: ['Efectividad: no atendido, hasta que se elija una opción.'],
  },
  {
    id: 'FAM-HEALTH-001',
    title: 'Sanidad',
    intro: 'Una nota en la ficha es deseable. No hay calendario documentado y no se impone un recordatorio.',
    primarySolutionIds: ['SOL-HEALTH-001'],
    visibleAlternativeIds: [],
    shelves: {
      ...emptyShelves,
      notRecommendedNow: ['SOL-HEALTH-002'],
    },
  },
  {
    id: 'FAM-REPRO-001',
    title: 'Nacimiento y filiación',
    intro:
      'El nacimiento crea al animal en el mismo evento. Inferir al padre por el único toro es deseable y no es paternidad confirmada.',
    primarySolutionIds: ['SOL-REPRO-001'],
    visibleAlternativeIds: ['SOL-REPRO-002'],
    shelves: {
      ...emptyShelves,
      notRecommendedNow: ['SOL-REPRO-003'],
    },
  },
  {
    id: 'FAM-DATA-001',
    title: 'Calidad del dato',
    intro: 'Transversal. Cada número importante dice si es declarado, observado o medido. No es una operación del mapa.',
    primarySolutionIds: ['SOL-DATA-001'],
    visibleAlternativeIds: ['SOL-DATA-002'],
    shelves: { ...emptyShelves },
    transversal: true,
  },
  {
    id: 'FAM-COMM-001',
    title: 'Canal',
    intro:
      'Transversal. El propietario asienta lo que ya recibe por teléfono, WhatsApp, foto o audio. El trabajador no es usuario de una aplicación en esta etapa.',
    primarySolutionIds: ['SOL-COMM-001'],
    visibleAlternativeIds: [],
    shelves: {
      ...emptyShelves,
      notRecommendedNow: ['SOL-COMM-002', 'SOL-COMM-003'],
    },
    transversal: true,
  },
  {
    id: 'FAM-CONN-001',
    title: 'Tolerancia a la señal',
    intro:
      'Transversal. El propietario puede asentar después, donde sí tiene conexión. Eso no diseña una captura de campo sin conexión ni una sincronización.',
    primarySolutionIds: ['SOL-CONN-001'],
    visibleAlternativeIds: [],
    shelves: {
      ...emptyShelves,
      investigate: ['SOL-CONN-002'],
      notRecommendedNow: ['SOL-CONN-003'],
    },
    transversal: true,
    honestyLines: ['Puede asentarse después. No implica una arquitectura de sincronización.'],
  },
  {
    id: 'FAM-GOV-001',
    title: 'Gestión',
    intro: 'El aviso de un faltante confirmado o de un problema grave entra al mínimo. El resumen semanal es deseable.',
    primarySolutionIds: ['SOL-GOV-002'],
    visibleAlternativeIds: ['SOL-GOV-001'],
    shelves: { ...emptyShelves },
  },
  {
    id: 'FAM-MILK-001',
    title: 'Leche',
    intro:
      'Condicional y fuera del paquete inicial. No es operación vigente. Sirve para preguntar, si la ordeña vuelve, si conviene en términos económicos.',
    primarySolutionIds: [],
    visibleAlternativeIds: [],
    shelves: {
      ...emptyShelves,
      notRecommendedNow: ['SOL-MILK-001', 'SOL-MILK-002'],
    },
    honestyLines: ['Condicional. No forma parte del modelo operativo inicial.'],
  },
]
