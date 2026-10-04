import type { Edge, Node } from '@xyflow/react'
import type { ArchDetail, ArchNodeData, DomainModuleRecord } from '../../types/architecture.ts'
import { archEdge, archNode } from './nodeFactory.ts'

const section = (heading: string, items?: string[], text?: string) => ({ heading, items, text })

export const domainModules: DomainModuleRecord[] = [
  {
    id: 'mod-herd',
    classification: 'core',
    schema: 'herd',
    readModelIds: ['rm-weekly', 'rm-risk'],
    workflowIds: ['wf-sale', 'wf-purchase', 'wf-birth'],
  },
  {
    id: 'mod-feeding',
    classification: 'core',
    schema: 'feeding',
    readModelIds: ['rm-weekly'],
    workflowIds: ['wf-batch'],
  },
  {
    id: 'mod-growth',
    classification: 'supporting',
    schema: 'growth',
    readModelIds: ['rm-weekly', 'rm-growth', 'rm-last'],
    workflowIds: ['wf-weigh'],
  },
  {
    id: 'mod-inventory',
    classification: 'supporting',
    schema: 'inventory',
    readModelIds: ['rm-weekly', 'rm-variance'],
    workflowIds: ['wf-feed-purchase', 'wf-batch'],
  },
  {
    id: 'mod-finance',
    classification: 'supporting',
    schema: 'finance',
    readModelIds: ['rm-weekly', 'rm-profit'],
    workflowIds: ['wf-sale', 'wf-purchase', 'wf-feed-purchase'],
  },
]

export const moduleNodes: Node<ArchNodeData, 'archNode'>[] = [
  archNode(
    'mod-app',
    220,
    0,
    'layer',
    'Capa de aplicación',
    'Orquesta la captura',
    'Llama la interfaz pública de cada módulo. Una transacción local. Los módulos no se escriben entre sí.',
  ),
  archNode('mod-herd', 220, 116, 'module', 'Núcleo · Herd', 'Hato', 'Identidad, tenencia, lugar y ciclo de vida.', {
    classification: 'core',
  }),
  archNode('mod-feeding', 408, 116, 'module', 'Núcleo · Feeding', 'Alimentación', 'Lote preparado y entrega. No guarda los kilos comprados.', {
    classification: 'core',
  }),
  archNode('mod-growth', 596, 116, 'module', 'Apoyo · Growth', 'Crecimiento', 'Sesión de pesaje y pesos.', { classification: 'supporting' }),
  archNode('mod-inventory', 784, 116, 'module', 'Apoyo · Inventory', 'Inventario', 'Existencias, movimientos y conteos.', {
    classification: 'supporting',
  }),
  archNode('mod-finance', 972, 116, 'module', 'Apoyo · Finance', 'Finanzas', 'Gastos, compras, ventas y atribuciones explícitas.', {
    classification: 'supporting',
  }),
  archNode('mod-kernel', 0, 0, 'transversal', 'Vocabulario', 'Núcleo compartido', 'Ids y calidad. No es un módulo ni la interfaz.'),
  archNode('mod-evidence', 0, 116, 'transversal', 'Transversal', 'Evidencia y auditoría', 'La ficha guarda la referencia. El puerto guarda los bytes.'),
  archNode('mod-identity', 0, 232, 'transversal', 'Transversal', 'Identidad y sesiones', 'Cookie y filas en PostgreSQL. La biblioteca no está elegida.'),
  archNode('mod-persistence', 0, 348, 'transversal', 'Transversal', 'Persistencia', 'Drizzle vive aquí. El dominio no lo importa.'),
  archNode('mod-adapters', 0, 464, 'transversal', 'Transversal', 'Adaptadores externos', 'Báscula y mensajes siguen sin elegirse.'),
]

export const moduleEdges: Edge<{ kind: 'call' | 'read' | 'technical' }>[] = [
  archEdge('mod-e-herd', 'mod-app', 'mod-herd', 'call', 'down', undefined, 'bottom-herd'),
  archEdge('mod-e-feeding', 'mod-app', 'mod-feeding', 'call', 'down', undefined, 'bottom-feeding'),
  archEdge('mod-e-growth', 'mod-app', 'mod-growth', 'call', 'down', undefined, 'bottom-growth'),
  archEdge('mod-e-inventory', 'mod-app', 'mod-inventory', 'call', 'down', undefined, 'bottom-inventory'),
  archEdge('mod-e-finance', 'mod-app', 'mod-finance', 'call', 'down', undefined, 'bottom-finance'),
]

export const moduleDetails: ArchDetail[] = [
  {
    id: 'mod-app',
    kicker: 'Aplicación',
    title: 'Capa de aplicación',
    summary: 'Coordina una captura que escribe en más de un módulo. No es un sexto módulo de negocio.',
    sections: [
      section('Cómo escribe', [
        'Abre una transacción de la base.',
        'La persistencia crea los repositorios de cada módulo sobre esa transacción.',
        'Llama la interfaz pública de cada módulo.',
        'Confirma o revierte todo junto.',
      ]),
      section('Qué no hace', [
        'No pasa el objeto de Drizzle al servicio del módulo.',
        'No deja que Finanzas escriba el hato, ni que Alimentación escriba inventario.',
        'No publica un evento para completar la venta o la compra de alimento.',
      ]),
    ],
    adrIds: ['ADR-003', 'ADR-004', 'ADR-008'],
  },
  {
    id: 'mod-herd',
    kicker: 'Núcleo · esquema herd',
    title: 'Hato',
    summary: 'Guarda quién es el animal, de quién es, dónde se espera verlo y si sigue en el rancho.',
    sections: [
      section('Datos que posee', [
        'Animal',
        'ParentageRecord',
        'HealthEvent',
        'LocationAssignment',
        'HerdVerification',
        'ConfirmedMissingAssertion',
        'PaddockReference',
      ]),
      section('Reglas', [
        'La tenencia desconocida sigue desconocida. No se calcula una parte.',
        'El parentesco inferido no se guarda como confirmado. Desconocido es válido.',
        'La salida conserva el expediente.',
        'Asignar un potrero no significa que el animal fue visto.',
        'La ausencia confirmada deja el animal activo hasta que exista una salida.',
        'Una nota de salud no es un calendario, un retiro ni una dosis.',
      ]),
      section('Presencia, sin módulo nuevo', [
        'Lugar esperado: historia del hato.',
        'Última observación: lectura derivada, no una columna del animal.',
        'Ausencia sospechada: la vista de riesgo. No se guarda como afirmación.',
        'Ausencia confirmada: afirmación del hato. El animal sigue activo.',
        'Salida: otra transición del ciclo de vida.',
      ]),
      section('No posee', [
        'Pesos de la manga, alimento, existencias, dinero.',
        'Hectáreas, leche, cuentas de usuario.',
        'RanchId no es una ficha del hato.',
      ]),
      section('Lecturas permitidas', [
        'Crecimiento puede consultar qué animales están activos.',
        'Alimentación puede consultar la referencia de potrero.',
        'Ningún otro módulo modifica estas filas. Una clave foránea hacia herd.animal no da ese permiso.',
      ]),
      section('Flujos', ['Venta de ganado, si hay animales identificados.', 'Compra de ganado, si hay cabezas conocidas.', 'Nacimiento.']),
      section('Vistas de lectura', [
        'Resumen semanal.',
        'Riesgo de ausencia. No es la ausencia confirmada ni la salida.',
      ]),
      section('Cuándo se volvería a mirar el corte', [
        'Reproducción, solo si aparecen reglas propias de empadre.',
        'Salud, solo si aparecen calendario, retiro o dosis.',
        'Tierra, solo si aparecen reglas de renta. El potrero de referencia no es ese módulo.',
      ]),
    ],
    adrIds: ['ADR-002', 'ADR-003', 'ADR-007', 'ADR-013'],
    targetIds: [
      'TGT-ANIMAL-001',
      'TGT-BIRTH-001',
      'TGT-REPRO-001',
      'TGT-HERD-VERIFY-001',
      'TGT-HEALTH-001',
      'TGT-ANIMAL-EXIT-001',
      'TGT-MOVE-001',
      'CAP-ID-001',
      'CAP-OWN-001',
      'CAP-LIFE-001',
      'CAP-LAND-001',
      'CAP-REPRO-001',
      'CAP-HEALTH-001',
      'CAP-SEC-001',
    ],
  },
  {
    id: 'mod-feeding',
    kicker: 'Núcleo · esquema feeding',
    title: 'Alimentación',
    summary: 'Empieza en la preparación y la entrega. Los kilos del ticket no se copian aquí.',
    sections: [
      section('Datos que posee', ['FeedBatch', 'FeedDelivery']),
      section('Reglas', [
        'Una declaración no es una medición.',
        'La entrega por defecto es declarada. Medida exige una medida real.',
        'Registrar una entrega no descuenta inventario.',
        'La compra de alimento no escribe este módulo.',
      ]),
      section('No posee', [
        'El gasto y el precio.',
        'Los kilos comprados: viven en el recibo de inventario.',
        'El remanente físico del estante.',
        'Una estrategia de alimentación o una ración por animal.',
      ]),
      section('Lecturas permitidas', ['Puede consultar el potrero del hato cuando el lugar se conoce. No lo modifica.']),
      section('Flujos', [
        'Preparar lote de alimento.',
        'Si el mismo comando reclama una salida de stock, Inventario escribe con él.',
        'La entrega declarada queda solo aquí.',
      ]),
      section('Vistas de lectura', ['Resumen semanal.']),
      section('Cuándo se volvería a mirar el corte', [
        'Una entrega medida sigue siendo un FeedDelivery.',
        'No se abre un módulo de medición para eso.',
      ]),
    ],
    adrIds: ['ADR-002', 'ADR-003', 'ADR-004'],
    targetIds: ['TGT-FEED-001', 'CAP-FEED-001', 'CAP-LAND-001'],
  },
  {
    id: 'mod-growth',
    kicker: 'Apoyo · esquema growth',
    title: 'Crecimiento',
    summary: 'Guarda la sesión de pesaje y cada peso. No actualiza la ficha del animal.',
    sections: [
      section('Datos que posee', ['WeighingSession', 'Registros de peso']),
      section('Reglas', [
        'Un segundo pesaje es otro peso, no una corrección del primero.',
        'Corregir 315 kg a 351 kg en el mismo pesaje sí conserva el valor anterior.',
        'El peso comercial de una compra o una venta es de Finanzas.',
        'Guardar el peso no depende de calcular la última observación.',
      ]),
      section('No posee', ['La proyección de última observación.', 'Una sesión no es una verificación del hato.']),
      section('Lecturas permitidas', ['Puede consultar en el hato qué animales están activos. No escribe esas filas.']),
      section('Flujos', ['Pesaje de ganado.']),
      section('Vistas de lectura', [
        'Resumen semanal.',
        'Crecimiento del animal.',
        'Última observación. Se deriva después. No es una columna del animal.',
      ]),
      section('Cuándo se volvería a mirar el corte', ['La báscula, si algún día se conecta, llega como adaptador hacia esta operación.']),
    ],
    adrIds: ['ADR-002', 'ADR-003', 'ADR-004'],
    targetIds: ['TGT-WEIGH-001', 'CAP-GROW-001', 'CAP-ID-001', 'CAP-SEC-001'],
  },
  {
    id: 'mod-inventory',
    kicker: 'Apoyo · esquema inventory',
    title: 'Inventario',
    summary: 'Movimientos, recibos, salidas y conteos. El saldo se deriva. No se edita como celda.',
    sections: [
      section('Datos que posee', ['StockItem', 'Movimientos', 'Conteos físicos']),
      section('Reglas', [
        'El recibo de una compra de alimento guarda los kilos y su calidad.',
        'Ese recibo no guarda el precio como autoridad del dinero.',
        'Un conteo no reescribe los movimientos. La variación se calcula.',
        'La variación no asigna culpa.',
      ]),
      section('No posee', ['El gasto.', 'La calidad de la entrega de alimento.', 'El remanente no es una copia de los kilos comprados.']),
      section('Lecturas permitidas', ['Consulta sus propios movimientos para el saldo. No escribe finanzas ni alimentación.']),
      section('Flujos', ['Compra de alimento.', 'Preparar lote, cuando el comando reclama la salida de stock.']),
      section('Vistas de lectura', [
        'Resumen semanal.',
        'Variación de inventario. Calcula contra el saldo y no reescribe movimientos.',
      ]),
      section('Cuándo se volvería a mirar el corte', ['Un medicamento puede ser otro artículo más adelante. Eso no fusiona inventario con la nota de salud.']),
    ],
    adrIds: ['ADR-002', 'ADR-003', 'ADR-007'],
    targetIds: ['TGT-INV-001', 'TGT-FEED-001', 'CAP-INV-001', 'CAP-FEED-001'],
  },
  {
    id: 'mod-finance',
    kicker: 'Apoyo · esquema finance',
    title: 'Finanzas',
    summary: 'Dinero de gestión: gastos, compras, ventas y la atribución que alguien escribió. No es contabilidad fiscal.',
    sections: [
      section('Datos que posee', ['Expense', 'CattlePurchase', 'Sale', 'Atribuciones explícitas']),
      section('Reglas', [
        'Sin atribución, el gasto queda en el pool no asignado. No hay reparto automático.',
        'Una venta no guarda el margen.',
        'Una venta sin animales identificados no inventa salidas.',
        '«Bulto» se guarda como forma y no se traduce a cabezas.',
        'El precio por kilo derivado pertenece a una lectura, salvo que ese precio se haya registrado como hecho comercial.',
      ]),
      section('No posee', [
        'La rentabilidad provisional.',
        'La parte del socio.',
        'Los kilos del alimento.',
        'El peso de la manga.',
      ]),
      section('Lecturas permitidas', ['No escribe el hato ni el inventario. La aplicación llama la interfaz de cada uno.']),
      section('Flujos', ['Venta de ganado.', 'Compra de ganado.', 'Compra de alimento.']),
      section('Vistas de lectura', ['Resumen semanal.', 'Rentabilidad provisional. No es el libro de finanzas.']),
    ],
    adrIds: ['ADR-002', 'ADR-003', 'ADR-007'],
    targetIds: ['TGT-SALE-001', 'TGT-PUR-001', 'TGT-EXPENSE-001', 'TGT-FEED-001', 'CAP-FIN-001', 'CAP-FIN-002'],
  },
  {
    id: 'mod-kernel',
    kicker: 'Dentro de la API',
    title: 'Núcleo compartido',
    summary: 'Vocabulario estable del backend. No es un paquete de la interfaz ni un cajón de entidades.',
    sections: [
      section('Cabe', [
        'RanchId',
        'AnimalId',
        'PaddockId',
        'Referencia de evidencia',
        'Calidad: declarado, observado, medido',
        'RecordedBy y ReportedBy',
        'Versión y tiempos',
      ]),
      section('RanchId', [
        'Es el alcance de los datos, desde la primera versión de persistencia.',
        'El primer sistema siembra un rancho.',
        'La sesión trae el RanchId. El cliente no elige otro.',
        'No es una ficha del hato, ni una organización de autenticación, ni un producto para muchos ranchos.',
      ]),
      section('No cabe', ['Animal, Expense, FeedBatch ni ningún otro registro de negocio.', 'Orquestadores ni fórmulas de rentabilidad.']),
    ],
    adrIds: ['ADR-012', 'ADR-013'],
    targetIds: ['CAP-DATA-002', 'TGT-COMM-001'],
  },
  {
    id: 'mod-evidence',
    kicker: 'Transversal',
    title: 'Evidencia y auditoría',
    summary: 'El archivo apoya un hecho. No es el peso, el gasto ni el conteo. Una foto no sube la calidad por sí sola.',
    sections: [
      section('Evidencia', [
        'El registro de negocio guarda la referencia.',
        'El puerto guarda los bytes y el metadato técnico.',
        'Desarrollo: sistema de archivos. Despliegue: almacén compatible con S3. Sin proveedor.',
        'La clave es {ranchId}/{evidenceId}. El nombre original es solo metadato.',
        'Corregir o desprender el hecho no borra los bytes.',
      ]),
      section('Historia', [
        'Un error se corrige y el valor anterior queda en la misma transacción, con quién, cuándo y por qué.',
        'Un hecho nuevo —otro peso, otro potrero, otro movimiento— se inserta. No reescribe el anterior.',
        'Esto no es event sourcing.',
      ]),
      section('Dos personas distintas', [
        'RecordedBy es la cuenta que capturó.',
        'ReportedBy es quien contó la historia en el mundo real, por ejemplo el trabajador. No es un usuario.',
      ]),
    ],
    adrIds: ['ADR-011', 'ADR-013'],
    targetIds: ['CAP-DATA-001', 'CAP-DATA-002', 'TGT-COMM-001'],
  },
  {
    id: 'mod-identity',
    kicker: 'Transversal · esquema identity',
    title: 'Identidad y sesiones',
    summary: 'La sesión vive en una fila de PostgreSQL y viaja en una cookie. La biblioteca de contraseñas se elige al construir, no aquí.',
    sections: [
      section('Aceptado', [
        'Cookie HttpOnly. En producción, Secure y SameSite=Lax.',
        'Roles iniciales: owner y support.',
        'worker, veterinarian y partner-readonly son nombres reservados.',
        'La sesión trae el RanchId. El cliente no manda otro.',
        'El dominio recibe quién registró. No lee la cookie ni importa la biblioteca.',
      ]),
      section('Abierta', [
        'La biblioteca de autenticación es decisión de implementación.',
        'Better Auth es la primera candidata a probar. No está seleccionada.',
        'Si su modelo de organización se volviera el rancho, no sirve para esta base.',
      ]),
      section('No es', ['Una organización de autenticación no es RanchId.', 'El trabajador no tiene cuenta por ser trabajador.']),
    ],
    adrIds: ['ADR-010', 'ADR-013'],
    targetIds: ['TGT-COMM-001'],
  },
  {
    id: 'mod-persistence',
    kicker: 'Transversal',
    title: 'Persistencia',
    summary: 'Drizzle está en los repositorios y en las fábricas que los atan a una transacción. No entra al dominio.',
    sections: [
      section('Transacción', [
        'El orquestador pide abrir la transacción.',
        'La fábrica crea los repositorios de cada módulo sobre esa transacción.',
        'Los servicios reciben esas interfaces y no el objeto de Drizzle.',
        'Al final se confirma o se revierte.',
      ]),
      section('No se agrega', [
        'Un framework de unidad de trabajo.',
        'Una transacción escondida en el contexto asíncrono.',
        'Un repositorio que escriba dos módulos.',
      ]),
    ],
    adrIds: ['ADR-007', 'ADR-008', 'ADR-012'],
  },
  {
    id: 'mod-adapters',
    kicker: 'Transversal',
    title: 'Adaptadores externos',
    summary: 'Un puerto recibe un hecho ya normalizado. Hoy ninguno de estos aparatos está elegido.',
    sections: [
      section('Puertos nombrados y vacíos', [
        'Báscula: una medición hacia Crecimiento. El protocolo sigue abierto.',
        'Mensajes: aviso o borrador. No es el bus entre módulos.',
        'Seguridad física: sin consumidor y sin módulo.',
      ]),
      section('Sincronización', ['El comando ya lleva ids y versión. La cola offline no está diseñada.']),
    ],
    adrIds: ['ADR-004', 'ADR-005'],
    targetIds: ['TGT-WEIGH-001', 'TGT-SEC-002', 'CAP-CONN-001'],
  },
]
