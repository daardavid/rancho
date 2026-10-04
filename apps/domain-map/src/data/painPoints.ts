import type { PainPoint } from '../types/map.ts'

/**
 * Text copied from docs/domain/pain-points.md.
 * Severity is an initial project assessment, not a measured fact.
 */
export const painPoints: PainPoint[] = [
  {
    id: 'PP-ID-001',
    title: 'Identificación física frágil',
    currentSituation:
      'Arete SINIIGA, nombre o memoria del trabajador. Algunos becerros están un tiempo sin arete y sin nombre. El arete puede caerse o retirarse. No hay arete secundario del rancho.',
    impact:
      'Se puede perder el hilo de un animal justamente al inicio de su vida, que es cuando empieza el dato de crecimiento.',
    evidence:
      'Práctica descrita en entrevista. Disposición a mejorar la identificación, todavía sin método elegido.',
    initialSeverity: 'alta',
    confidence: 'alta',
    notes: 'La mejora de identificación es disposición, no un método elegido.',
  },
  {
    id: 'PP-DATA-001',
    title: 'Sin historial formal del animal',
    currentSituation:
      'Partos no registrados. Genealogía informal. Sanidad en la memoria. Pesos en cuadernos.',
    impact:
      'No se puede responder con registro a preguntas que el propietario ya hace, ni comparar líneas o lotes.',
    evidence: 'Ausencia explícita de registro formal de partos y de genealogía.',
    initialSeverity: 'alta',
    confidence: 'alta',
    notes: '',
  },
  {
    id: 'PP-DATA-002',
    title: 'Datos declarados sin rastro comprobable',
    currentSituation:
      'La información llega por teléfono, WhatsApp, fotos, audios y memoria. No hay una distinción operativa entre lo que alguien afirma y lo que se midió.',
    impact:
      'Un error o un dato falso puede quedar como si fuera medición. Afecta confianza y cualquier costo calculado encima.',
    evidence:
      'Principio explícito: no depender a ciegas de valores reportados por trabajadores. El principio de evidencia es deseo futuro, no control actual.',
    initialSeverity: 'alta',
    confidence: 'alta',
    notes: 'No se atribuye el riesgo a una persona.',
  },
  {
    id: 'PP-GROW-001',
    title: 'El pesaje no deja un historial utilizable',
    currentSituation:
      'Los becerros se pesan aproximadamente cada 15 días en báscula IBN ARGON. El flujo actual no guarda el dato en el sistema deseado. Históricamente se anota a mano. Las vacas adultas no entran en esa rutina.',
    impact:
      'No hay base confiable para ganancia diaria, curvas, comparación ni detección de animales por debajo de lo esperado. Esas lecturas son objetivo, no un resultado que hoy exista.',
    evidence:
      'Marca de báscula, intervalo aproximado, cuadernos y duración aproximada de una hora por sesión de becerros. Modelo y conexión de la báscula sin confirmar.',
    initialSeverity: 'alta',
    confidence: 'alta',
    notes: 'El intervalo de aproximadamente 15 días es de becerros, no de todo el ganado.',
  },
  {
    id: 'PP-FEED-001',
    title: 'No se puede verificar el alimento',
    currentSituation:
      'La meta relatada es alrededor de 1.5 kg por animal. El ejemplo de riesgo es que se entregue 1.0 kg y la diferencia pueda venderse o sustraerse. El propietario no puede comprobar con fiabilidad cuánto se preparó, cuánto se entregó ni cuánto quedó. No se mide el consumo individual; hay competencia en el comedero.',
    impact:
      'Puede alterar rentabilidad, crecimiento, existencia en bodega y confianza. Es un riesgo de merma o fraude, no una acusación a una persona.',
    evidence:
      'Ejemplo numérico de la entrevista y la afirmación de que hoy no hay verificación. Las cifras de dieta no cuadran entre sí.',
    initialSeverity: 'critica',
    confidence: 'alta',
    notes: 'Las cantidades conocidas de alimentación requieren validación. Véase OQ-FEED-002.',
  },
  {
    id: 'PP-FIN-001',
    title: 'No se conoce la rentabilidad real',
    currentSituation:
      'No hay un cálculo de costo de criar, ingreso de venta, margen, prorrateo ni comparación entre actividades. El reparto «a la parte» complica todavía más la parte del ranchero.',
    impact:
      'No se puede decidir qué actividad conviene. Es uno de los objetivos más importantes del proyecto y hoy no está cubierto.',
    evidence:
      'Objetivo explícito de entender rentabilidad, crecimiento y qué actividades dejan utilidad. Metodologías de prorrateo aún no diseñadas.',
    initialSeverity: 'critica',
    confidence: 'alta',
    notes: 'El prorrateo no está diseñado. «A la parte» no se reinterpreta.',
  },
  {
    id: 'PP-FIN-002',
    title: 'Gasto e inversión no están separados para la gestión',
    currentSituation:
      'Se guardan la mayoría de los tickets. El pago de compras suele ser con tarjeta y la nómina en efectivo. No hay una contabilidad de gestión que separe gasto operativo y activo fijo.',
    impact: 'Una mejora del rancho puede mezclarse con el costo de producir un kilo y deformar el margen.',
    evidence:
      'Intención explícita de separar ambos. Criterio contable exacto sin definir. No reemplaza la contabilidad fiscal.',
    initialSeverity: 'media',
    confidence: 'media',
    notes: 'Visibilidad de gestión. No es contabilidad fiscal.',
  },
  {
    id: 'PP-INV-001',
    title: 'Inventario formal de bodega limitado',
    currentSituation:
      'Hay bodega cerrada. El control formal de alimento, medicamento, insumos, herramientas u otros materiales es limitado. No hay conciliación entre existencia teórica y física.',
    impact: 'La merma de alimento y el costo de medicamentos quedan sin contraste.',
    evidence: 'Existencia de bodega y limitación explícita del seguimiento formal.',
    initialSeverity: 'media',
    confidence: 'alta',
    notes: 'La bodega no implica un control de inventario.',
  },
  {
    id: 'PP-SEC-001',
    title: 'El faltante de ganado se descubre tarde',
    currentSituation:
      'El robo es una preocupación histórica. El cerco se puede cortar, a menudo de noche. El ganado puede faltar aproximadamente 1 o 2 semanas antes de que se note. A veces puede haber participación interna; no es siempre el caso.',
    impact:
      'Pérdida del animal y de la información de cuándo ocurrió. Detección de inventario y detección de intrusión son problemas distintos.',
    evidence: 'Patrón descrito en entrevista. Sin cámaras hoy.',
    initialSeverity: 'critica',
    confidence: 'alta',
    notes: 'La participación interna no se toma como la regla.',
  },
  {
    id: 'PP-SEC-002',
    title: 'No hay verificación frecuente del hato',
    currentSituation:
      'Puede tardarse varios días o más en notar que falta un animal. No hay un conteo o verificación frecuente y confiable.',
    impact: 'Aunque no haya robo, el inventario de cabezas no es oportuno.',
    evidence: 'Práctica actual descrita así. Ninguna política de verificación fue elegida.',
    initialSeverity: 'alta',
    confidence: 'alta',
    notes: '',
  },
  {
    id: 'PP-SEC-003',
    title: 'La intrusión no se detecta',
    currentSituation:
      'No hay cámaras. El perímetro está cercado, con alrededor de 5 accesos. Cortar el cerco o sacar ganado no genera un aviso.',
    impact: 'El software, por sí solo, no impide ni detecta la entrada física.',
    evidence:
      'Ausencia de cámaras y distinción explícita entre inventario e intrusión. Las cámaras solo se están considerando.',
    initialSeverity: 'alta',
    confidence: 'alta',
    notes: 'Las cámaras no son equipo actual.',
  },
  {
    id: 'PP-HEALTH-001',
    title: 'Sanidad apoyada en la memoria',
    currentSituation:
      'Vacunas, medicamentos y tratamientos dependen a menudo de la memoria y del conocimiento informal de los trabajadores. El paso ideal es por la manga; si hace falta, se laza, y eso es más peligroso. El baño puede hacerse con bombas.',
    impact:
      'Se pierde historia sanitaria y se aumenta el riesgo de manejo. No es, según la entrevista, la prioridad más alta frente a rentabilidad, peso, alimento y seguridad.',
    evidence: 'Control limitado descrito de forma explícita, con esa salvedad de prioridad.',
    initialSeverity: 'media',
    confidence: 'alta',
    notes: '',
  },
  {
    id: 'PP-REPRO-001',
    title: 'Partos y genealogía sin registro',
    currentSituation:
      'La filiación se conoce de manera informal. Con un solo toro la paternidad es simple, pero no hay registro. Los nacimientos no se anotan de forma formal.',
    impact:
      'No se puede medir después qué línea produce mejores animales, ni contestar con registro cuántas vacas han parido.',
    evidence: 'Ausencia explícita de registro. El interés genético es de largo plazo.',
    initialSeverity: 'media',
    confidence: 'alta',
    notes: 'Un solo toro simplifica la paternidad de hoy. No crea un registro.',
  },
  {
    id: 'PP-MILK-001',
    title: 'La leche no está en condiciones de evaluarse',
    currentSituation:
      'La infraestructura de ordeña existe y requiere mantenimiento; no está operativa como se desea. El esquema anterior no se consideró lo bastante rentable. No hay producción de leche documentada como vigente.',
    impact:
      'No se puede comparar carne, leche y doble propósito con cifras actuales. Usar el máximo histórico como si fuera producción de hoy sería un error.',
    evidence: 'Cifras históricas aproximadas. Economía detallada abierta.',
    initialSeverity: 'media',
    confidence: 'media',
    notes:
      'Sin proceso en el mapa AS-IS. Dibujarla la haría parecer una operación vigente.',
  },
  {
    id: 'PP-CONN-001',
    title: 'Conectividad limitada y poco confiable',
    currentSituation:
      'No hay Wi-Fi. Los trabajadores tienen teléfonos Android. La cobertura celular se describió de formas que no coinciden del todo.',
    impact:
      'Una aplicación que exija red continua no encaja con el campo. El detalle de la cobertura no se puede dar por sentado.',
    evidence: 'Conclusión permitida: limitada, poco confiable y pendiente de validación.',
    initialSeverity: 'media',
    confidence: 'baja',
    notes: 'Cobertura: limitada/no confiable; pendiente de validación.',
  },
  {
    id: 'PP-GOV-001',
    title: 'Gestión a distancia sin comprobación',
    currentSituation:
      'El propietario no está de tiempo completo. Depende de llamadas, mensajes, fotos y audios. Los trabajadores viven en el rancho y concentran el conocimiento operativo.',
    impact:
      'La decisión semanal puede apoyarse en un relato incompleto o interesado. El riesgo de dato falso, error u omisión está nombrado; no se atribuye a una persona.',
    evidence:
      'Dirección de producto explícita sobre quién informa, y principio de no depender a ciegas del dato reportado.',
    initialSeverity: 'alta',
    confidence: 'alta',
    notes: 'Los trabajadores no son usuarios de una aplicación en esta etapa.',
  },
]

export const painPointById: Record<string, PainPoint> = Object.fromEntries(
  painPoints.map((painPoint) => [painPoint.id, painPoint]),
)
