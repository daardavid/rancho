import type { TargetCapabilityData } from '../../types/toBe.ts'

/** Short readings of docs/maps/to-be/target-capabilities.md v0.2. IDs are unchanged. */
export const targetCapabilities: TargetCapabilityData[] = [
  {
    id: 'CAP-ID-001',
    title: 'Reconocer cada animal gestionado por una identidad estable',
    purpose:
      'El arete, el nombre o la memoria no sostienen el hilo de un animal, sobre todo al nacer.',
    desiredOutcome:
      'Cada animal que el rancho gestiona se puede seguir aunque no tenga arete, aunque el arete se caiga y aunque el SINIIGA llegue después.',
    painPointIds: ['PP-ID-001'],
  },
  {
    id: 'CAP-OWN-001',
    title: 'Decir cómo se tiene un animal sin cerrar el contrato',
    purpose:
      'Parte del hato es del propietario y parte está a la parte. Puede haber ganado de terceros. Tenencia y participación no son el mismo dato.',
    desiredOutcome:
      'De cada animal se puede decir la tenencia y, por separado, qué se sabe de la participación económica. Las dos pueden quedar desconocidas. El relato verbal no se convierte en una regla de mitades.',
    painPointIds: ['PP-FIN-001', 'PP-DATA-001'],
  },
  {
    id: 'CAP-DATA-001',
    title: 'Conservar un historial trazable de los eventos que importan',
    purpose: 'Partos, pesos, sanidad y filiación viven en cuadernos o en la memoria.',
    desiredOutcome:
      'Un evento importante queda ligado a un animal, con quién lo registró, cuándo, de dónde salió y qué evidencia lo acompaña, si la hay.',
    painPointIds: ['PP-DATA-001'],
  },
  {
    id: 'CAP-DATA-002',
    title: 'Distinguir un dato declarado de uno observado, y guardar su evidencia',
    purpose: 'Teléfono, WhatsApp, foto, audio y memoria llegan mezclados.',
    desiredOutcome:
      'Al usar un dato se sabe si alguien lo afirmó, si salió de una observación o de una medición, y qué respaldo tiene.',
    painPointIds: ['PP-DATA-002'],
    transversal: true,
  },
  {
    id: 'CAP-GROW-001',
    title: 'Tener un historial de peso de becerros y leer el crecimiento',
    purpose: 'Los becerros se pesan y el dato no queda utilizable.',
    desiredOutcome:
      'Cada pesaje de becerro entra a una serie. Se puede ver la ganancia entre fechas y el hueco de quien no pasó. Las vacas adultas no entran a esa rutina.',
    painPointIds: ['PP-GROW-001'],
  },
  {
    id: 'CAP-FEED-001',
    title: 'Conocer el alimento comprado, preparado, declarado, medido y remanente',
    purpose:
      'Hoy no se puede comprobar con fiabilidad cuánto se compró, se preparó, se dijo que se entregó, se midió al entregar ni cuánto quedó.',
    desiredOutcome:
      'Cada cantidad dice de qué cantidad se trata y de qué calidad es. Una declaración no se presenta como entrega medida.',
    painPointIds: ['PP-FEED-001'],
  },
  {
    id: 'CAP-FEED-002',
    title: 'Relacionar la estrategia de alimento con el crecimiento y el costo',
    purpose: 'Saber si una dieta conviene depende de cantidad, grupo, tiempo y crecimiento. Esas piezas hoy no se unen con fiabilidad.',
    desiredOutcome:
      'Comparar estrategias solo cuando cantidad, grupo, periodo y ganancia existan. Si falta una pieza, la comparación no se muestra.',
    painPointIds: ['PP-FEED-001', 'PP-FIN-001'],
    blocked: true,
  },
  {
    id: 'CAP-FIN-001',
    title: 'Ver una rentabilidad administrativa provisional, con lo que falta a la vista',
    purpose: 'No se puede decidir qué actividad conviene. Una cifra cerrada, con las reglas aún abiertas, sería peor que un hueco.',
    desiredOutcome:
      'Una lectura provisional de gestión, no utilidad fiscal. Muestra ingreso conocido, costos conocidos, lo asignado, la bolsa no asignada, completitud y calidad.',
    painPointIds: ['PP-FIN-001'],
  },
  {
    id: 'CAP-FIN-002',
    title: 'Separar gasto operativo e inversión, con comprobante',
    purpose: 'Una mejora del rancho puede mezclarse con el costo de producir un kilo.',
    desiredOutcome:
      'Un egreso queda como gasto de operación o como inversión, con ticket o nota de efectivo. El criterio contable exacto sigue abierto.',
    painPointIds: ['PP-FIN-002'],
  },
  {
    id: 'CAP-INV-001',
    title: 'Contrastar lo que debería haber en bodega con lo que hay',
    purpose: 'Hay bodega cerrada y no hay conciliación.',
    desiredOutcome:
      'De los insumos que se decida llevar, se sabe qué entró, qué salió, qué debería quedar y qué diferencia hubo en un conteo físico.',
    painPointIds: ['PP-INV-001'],
  },
  {
    id: 'CAP-SEC-001',
    title: 'Saber qué animales deberían estar y notar antes un faltante',
    purpose:
      'Un faltante puede tardar días, y en un robo alrededor de una o dos semanas. Saber que falta un animal no es saber que alguien entró.',
    desiredOutcome:
      'Distinguir la última observación en un evento de una verificación del hato. El método y la cadencia de esa verificación siguen sin elegir. Este dolor no se da por controlado.',
    painPointIds: ['PP-SEC-001', 'PP-SEC-002'],
  },
  {
    id: 'CAP-SEC-002',
    title: 'Dejar evidencia de una entrada o una salida no autorizada',
    purpose: 'Cortar el cerco o sacar ganado no genera aviso. No hay cámaras. Las cámaras solo se están considerando.',
    desiredOutcome:
      'El control deseado existe como problema distinto del faltante. La implementación no está elegida. Hasta que una opción se adopte, el dolor no está abordado.',
    painPointIds: ['PP-SEC-003'],
  },
  {
    id: 'CAP-HEALTH-001',
    title: 'Conservar una historia sanitaria básica',
    purpose:
      'Vacunas, medicamentos y tratamientos dependen de la memoria. La entrevista no pone este tema por encima de rentabilidad, peso, alimento y seguridad.',
    desiredOutcome:
      'Un tratamiento, un baño o un problema observado deja una nota. No se convierte en un programa sanitario ni en un calendario.',
    painPointIds: ['PP-HEALTH-001'],
  },
  {
    id: 'CAP-REPRO-001',
    title: 'Registrar el nacimiento, la filiación y una genealogía usable más adelante',
    purpose: 'Los partos no se anotan y la filiación es informal. Con un solo toro la paternidad es simple y aun así no hay registro.',
    desiredOutcome:
      'Un nacimiento queda anotado. Madre y padre tienen certeza observada, inferida o desconocida. Si es inferida, queda el motivo. El único toro no es paternidad confirmada.',
    painPointIds: ['PP-REPRO-001'],
  },
  {
    id: 'CAP-COMM-001',
    title: 'Recibir evidencia sin volver usuarios de una aplicación a los trabajadores al inicio',
    purpose: 'El propietario no está de tiempo completo. La captura inicial la hace él con lo que los trabajadores le mandan.',
    desiredOutcome:
      'Una foto, un audio o un mensaje puede quedar ligado a un evento, sin aplicación para el trabajador y sin integración con WhatsApp.',
    painPointIds: ['PP-GOV-001', 'PP-DATA-002'],
    transversal: true,
  },
  {
    id: 'CAP-CONN-001',
    title: 'Completar los flujos críticos aunque la conectividad falle',
    purpose: 'No hay Wi-Fi y la cobertura celular no se puede dar por buena.',
    desiredOutcome:
      'Un pesaje, una entrega, un gasto o un nacimiento pueden quedar registrados aunque en el momento no hubiera señal. No se diseña aquí la sincronización.',
    painPointIds: ['PP-CONN-001'],
    transversal: true,
  },
  {
    id: 'CAP-GOV-001',
    title: 'Ver la operación cada semana y recibir aviso solo de lo crítico',
    purpose: 'La decisión semanal puede apoyarse en un relato incompleto. Un aviso por cada mensaje saturaría.',
    desiredOutcome:
      'Hay una revisión de periodo. El aviso inmediato queda para un faltante confirmado, un problema grave de un animal u otra situación que el propietario marque como crítica.',
    painPointIds: ['PP-GOV-001'],
  },
  {
    id: 'CAP-LIFE-001',
    title: 'Estado operativo del animal y motivo de salida',
    purpose: 'Si un animal sale por un motivo distinto de la venta, no puede seguir contando como activo. Borrar la ficha borraría el historial.',
    desiredOutcome:
      'Se sabe si sigue activo. Si no, queda el motivo y la historia. Notar que falta y darlo de baja no son el mismo hecho.',
    painPointIds: ['PP-SEC-001', 'PP-DATA-001', 'PP-FIN-001'],
  },
  {
    id: 'CAP-LAND-001',
    title: 'Ubicación esperada por potrero o grupo',
    purpose:
      'El alimento se ofrece a un grupo y la última vez visto no dice dónde debía estar el animal. No hace falta un mapa completo ni un aparato por cabeza.',
    desiredOutcome:
      'Un animal o un grupo tiene potrero o lugar esperado, con fecha, o consta como desconocido. Sirven cerca de ocho potreros conocidos o identificados. No se afirma que cubran las aproximadamente 530 hectáreas ni que ya tengan nombres formales.',
    painPointIds: ['PP-FEED-001', 'PP-SEC-001', 'PP-SEC-002', 'PP-GOV-001'],
  },
  {
    id: 'CAP-MILK-001',
    title: 'Si la leche vuelve, medir su economía lo bastante para decidir si conviene',
    purpose:
      'La infraestructura existe y requiere mantenimiento. No hay producción vigente. Usar el máximo histórico como producción de hoy sería un error.',
    desiredOutcome:
      'Solo si se retoma la ordeña: ver volumen del periodo, costo e ingreso, sin confundirlos con el recuerdo de aproximadamente 150 litros o de 22 vacas.',
    painPointIds: ['PP-MILK-001'],
  },
]
