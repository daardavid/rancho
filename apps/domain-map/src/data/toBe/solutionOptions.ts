import type { SolutionOptionData } from '../../types/toBe.ts'

/** Qualitative trade-offs copied from docs/maps/to-be/solution-catalog.md v0.2. */
export const solutionOptions: SolutionOptionData[] = [
  {
    "id": "SOL-ID-001",
    "title": "Identificador interno estable",
    "description": "cada animal gestionado recibe una identidad del rancho, distinta del arete SINIIGA. En la misma ficha caben la tenencia y la participación económica, incluso cuando son desconocidas. El arete, el nombre y la foto se cuelgan de esa identidad.",
    "types": [
      "SOFTWARE",
      "PROCESS"
    ],
    "painPointIds": [
      "PP-ID-001",
      "PP-DATA-001"
    ],
    "capabilityIds": [
      "CAP-ID-001",
      "CAP-DATA-001",
      "CAP-OWN-001",
      "CAP-LIFE-001"
    ],
    "capabilityNote": "",
    "howItHelps": "el historial sobrevive a un becerro sin arete, a un arete caído y a un SINIIGA que llega después.",
    "pros": "no exige hardware nuevo. Sirve de base para peso, cría, gasto y presencia. Escala como dato aunque el hato crezca.",
    "cons": "alguien tiene que abrir la ficha y reconocer al animal. La identidad de papel o de registro no impide que en el campo se confunda una cabeza si no hay marca física.",
    "preconditions": "TGT-ANIMAL-001. Hace falta saber, aunque sea de a poco, qué cabezas se gestionan (OQ-OWN-003).",
    "cost": "low",
    "complexity": "low",
    "operationalFriction": "low",
    "dataReliability": "medium",
    "humanDependency": "high",
    "connectivityDependency": "low",
    "hardwareDependency": "none",
    "scalability": "high",
    "auditability": "medium",
    "currentFeasibility": "high",
    "recommendedNow": "yes",
    "recommendedAtScale": "yes",
    "packageNote": "",
    "rationale": "es la pieza que los demás registros necesitan, a un costo bajo para aproximadamente 21 cabezas, y no cierra la tecnología del arete.",
    "questionsToValidate": "OQ-OWN-003. Si el propietario acepta una ficha antes de la marca física. Esa disposición ya está dicha como objetivo; el método físico no."
  },
  {
    "id": "SOL-ID-002",
    "title": "Foto de apoyo a la identidad",
    "description": "una fotografía ayuda al propietario, que no está en el rancho, a reconocer al animal y a ligar mensajes posteriores con la ficha. La foto no es la identidad.",
    "types": [
      "PROCESS",
      "SOFTWARE"
    ],
    "painPointIds": [
      "PP-ID-001",
      "PP-DATA-002",
      "PP-GOV-001"
    ],
    "capabilityIds": [
      "CAP-ID-001",
      "CAP-COMM-001",
      "CAP-DATA-002"
    ],
    "capabilityNote": "",
    "howItHelps": "una marca visual viaja por el teléfono que ya se usa y reduce la dependencia de la memoria del trabajador cuando el propietario registra.",
    "pros": "usa un teléfono que ya existe. Baja fricción si la foto se toma cuando el animal ya está en la manga.",
    "cons": "el animal cambia, la foto envejece y dos becerros pueden parecerse. No sustituye una marca física ni el identificador interno.",
    "preconditions": "alguien toma la foto y el propietario la recibe. CON-DEV-001 no obliga a que el trabajador use una aplicación.",
    "cost": "low",
    "complexity": "low",
    "operationalFriction": "low",
    "dataReliability": "medium",
    "humanDependency": "high",
    "connectivityDependency": "low",
    "hardwareDependency": "low",
    "scalability": "medium",
    "auditability": "medium",
    "currentFeasibility": "high",
    "recommendedNow": "yes",
    "recommendedAtScale": "yes",
    "packageNote": "",
    "rationale": "como apoyo, junto con SOL-ID-001, aprovecha la comunicación actual. Como única identidad no serviría, y no se recomienda así.",
    "questionsToValidate": "en qué manejo es realista tomar la foto (DQ-HABIT-001)."
  },
  {
    "id": "SOL-ID-003",
    "title": "Marca física secundaria convencional",
    "description": "un arete u otra marca propia del rancho, además del SINIIGA, para reconocer al animal cuando el arete oficial falta. No se especifica el tipo de marca.",
    "types": [
      "HARDWARE",
      "PROCESS",
      "POLICY"
    ],
    "painPointIds": [
      "PP-ID-001"
    ],
    "capabilityIds": [
      "CAP-ID-001"
    ],
    "capabilityNote": "",
    "howItHelps": "da una segunda marca física si la oficial se cae o aún no está.",
    "pros": "es un objeto simple, independiente de la red, y refuerza el identificador interno en el campo.",
    "cons": "el propietario prefiere no aretar a un recién nacido de inmediato porque lo percibe traumático. El plazo de alrededor de un mes no está medido. Una marca más no está elegida.",
    "preconditions": "elegir método, momento y quién lo coloca. Hoy BR-ID-002 dice que no hay arete secundario.",
    "cost": "low",
    "complexity": "medium",
    "operationalFriction": "medium",
    "dataReliability": "medium",
    "humanDependency": "high",
    "connectivityDependency": "none",
    "hardwareDependency": "medium",
    "scalability": "high",
    "auditability": "medium",
    "currentFeasibility": "medium",
    "recommendedNow": "investigate",
    "recommendedAtScale": "investigate",
    "packageNote": "",
    "rationale": "el dolor es real y la disposición a mejorar existe, pero el método no está elegido y choca con la preferencia de no marcar al recién nacido. Recomendar una marca ahora cerraría BR-ID-003 sin evidencia.",
    "questionsToValidate": "OQ-ID-001. Qué marca aceptaría el propietario y a partir de qué momento."
  },
  {
    "id": "SOL-ID-004",
    "title": "Depender solo del SINIIGA",
    "description": "seguir usando el arete oficial, el nombre o la memoria como única identidad lógica. Es la práctica actual, puesta aquí para no olvidar que se consideró.",
    "types": [
      "PROCESS",
      "POLICY"
    ],
    "painPointIds": [
      "PP-ID-001"
    ],
    "capabilityIds": [],
    "capabilityNote": "ninguna de forma suficiente. Deja CAP-ID-001 sin cumplir.",
    "howItHelps": "no añade trabajo.",
    "pros": "no cambia el manejo. El arete oficial sigue siendo necesario para su propio fin.",
    "cons": "el arete puede faltar, caerse o retirarse. El becerro nace sin él. El historial se corta en el momento en que el crecimiento empieza.",
    "preconditions": "ninguna. Ya es el estado actual.",
    "cost": "low",
    "complexity": "low",
    "operationalFriction": "low",
    "dataReliability": "low",
    "humanDependency": "high",
    "connectivityDependency": "none",
    "hardwareDependency": "low",
    "scalability": "low",
    "auditability": "low",
    "currentFeasibility": "high",
    "recommendedNow": "no",
    "recommendedAtScale": "no",
    "packageNote": "",
    "rationale": "es el origen de PP-ID-001. Conservar el SINIIGA como atributo sí; usarlo como única identidad no.",
    "questionsToValidate": "ninguna. El dolor está descrito de forma directa."
  },
  {
    "id": "SOL-ID-005",
    "title": "RFID como identidad",
    "description": "un identificador electrónico leído por un aparato, como opción futura de marca. No se elige frecuencia, lector ni momento de colocación.",
    "types": [
      "HARDWARE",
      "SOFTWARE",
      "AUTOMATION"
    ],
    "painPointIds": [
      "PP-ID-001"
    ],
    "capabilityIds": [
      "CAP-ID-001"
    ],
    "capabilityNote": "",
    "howItHelps": "podría reducir errores al pasar la manga y dejar una lectura repetible.",
    "pros": "si un día el hato y los manejos lo justifican, la lectura puede alimentar el mismo identificador interno sin cambiar la ficha.",
    "cons": "costo y aparatos que el rancho no tiene. No resuelve el lapso previo a cualquier marca si no se coloca al nacer, y colocar al nacer choca con la preferencia actual. Exige energía, lectores y un hábito de paso.",
    "preconditions": "decidir que una marca electrónica vale más que una marca simple. Esa decisión no tiene evidencia de costo en el descubrimiento.",
    "cost": "high",
    "complexity": "high",
    "operationalFriction": "medium",
    "dataReliability": "high",
    "humanDependency": "low",
    "connectivityDependency": "low",
    "hardwareDependency": "high",
    "scalability": "high",
    "auditability": "high",
    "currentFeasibility": "low",
    "recommendedNow": "no",
    "recommendedAtScale": "investigate",
    "packageNote": "",
    "rationale": "aproximadamente 21 cabezas no justifican el aparato. La conectividad se puntúa low porque una lectura se puede guardar y pasar después; un aviso en vivo sería otro uso, no evaluado aquí. El identificador interno de SOL-ID-001 deja el camino abierto.",
    "questionsToValidate": "si en un hato mayor el error de identificación en manga es el problema dominante. Hoy no está medido."
  },
  {
    "id": "SOL-DATA-001",
    "title": "Distinguir dato declarado y dato observado",
    "description": "cada valor importante dice si alguien lo afirmó o si salió de una medición o de una observación directa, y guarda quién, cuándo y origen.",
    "types": [
      "SOFTWARE",
      "PROCESS",
      "POLICY"
    ],
    "painPointIds": [
      "PP-DATA-002",
      "PP-DATA-001"
    ],
    "capabilityIds": [
      "CAP-DATA-002",
      "CAP-DATA-001"
    ],
    "capabilityNote": "",
    "howItHelps": "un peso de mensaje no se usa como peso de báscula. Un cálculo puede mostrar que está incompleto o apoyado en dichos.",
    "pros": "no requiere hardware. Mejora la confianza sin afirmar que el dicho sea falso.",
    "cons": "no vuelve verdadero un dato declarado. Alguien tiene que clasificarlo.",
    "preconditions": "BR-EVID-001, que es principio, no control actual.",
    "cost": "low",
    "complexity": "low",
    "operationalFriction": "low",
    "dataReliability": "medium",
    "humanDependency": "high",
    "connectivityDependency": "low",
    "hardwareDependency": "none",
    "scalability": "high",
    "auditability": "high",
    "currentFeasibility": "high",
    "recommendedNow": "yes",
    "recommendedAtScale": "yes",
    "packageNote": "",
    "rationale": "es la regla que impide construir rentabilidad encima de un relato indistinto. La confiabilidad se queda en medium porque clasificar no corrige el valor.",
    "questionsToValidate": "si el propietario está dispuesto a marcar el origen cada vez que asienta un número (DQ-HABIT-001)."
  },
  {
    "id": "SOL-DATA-002",
    "title": "Adjuntar foto, audio o nota al evento",
    "description": "el archivo que ya circula, o una nota, queda ligado al evento concreto. No ordena por sí solo el chat.",
    "types": [
      "PROCESS",
      "SOFTWARE"
    ],
    "painPointIds": [
      "PP-DATA-002",
      "PP-GOV-001"
    ],
    "capabilityIds": [
      "CAP-DATA-002",
      "CAP-COMM-001"
    ],
    "capabilityNote": "",
    "howItHelps": "el propietario puede volver a ver en qué se apoyó un peso, una mezcla o un ticket.",
    "pros": "coincide con teléfono, WhatsApp, fotos y audios. No exige una integración.",
    "cons": "una foto puede no mostrar la cantidad. Un audio sigue siendo un dicho. Guardar todo satura.",
    "preconditions": "que el archivo llegue al propietario. La señal del rancho puede impedir el envío inmediato (OQ-CONN-001).",
    "cost": "low",
    "complexity": "low",
    "operationalFriction": "low",
    "dataReliability": "medium",
    "humanDependency": "high",
    "connectivityDependency": "low",
    "hardwareDependency": "low",
    "scalability": "high",
    "auditability": "high",
    "currentFeasibility": "high",
    "recommendedNow": "yes",
    "recommendedAtScale": "yes",
    "packageNote": "",
    "rationale": "sube la auditabilidad con fricción baja si se adjunta solo lo que respalda un evento, no la conversación completa.",
    "questionsToValidate": "qué eventos merecen archivo y cuáles bastan con una nota."
  },
  {
    "id": "SOL-GROW-001",
    "title": "Historial por transcripción del peso",
    "description": "el peso de cada becerro de la rutina se anota en su ficha, con fecha. Con dos pesos se ve la ganancia del intervalo.",
    "types": [
      "PROCESS",
      "SOFTWARE"
    ],
    "painPointIds": [
      "PP-GROW-001",
      "PP-DATA-001"
    ],
    "capabilityIds": [
      "CAP-GROW-001",
      "CAP-DATA-001"
    ],
    "capabilityNote": "",
    "howItHelps": "el cuaderno deja de ser el único archivo. Aparecen serie, comparación simple y hueco si se combina con SOL-GROW-004.",
    "pros": "usa la báscula y la manga que ya existen. No depende del modelo del indicador.",
    "cons": "alguien transcribe. Un número mal copiado queda como medición si no hay foto. En un hato mucho mayor, la transcripción de la sesión pesa más.",
    "preconditions": "la rutina actual de becerros, aproximadamente cada 15 días, de alrededor de una hora (BR-WEIGH-003).",
    "cost": "low",
    "complexity": "low",
    "operationalFriction": "medium",
    "dataReliability": "medium",
    "humanDependency": "high",
    "connectivityDependency": "low",
    "hardwareDependency": "none",
    "scalability": "medium",
    "auditability": "medium",
    "currentFeasibility": "high",
    "recommendedNow": "yes",
    "recommendedAtScale": "investigate",
    "packageNote": "",
    "rationale": "para los becerros que hoy se pesan, el salto de cuaderno a serie es grande y el aparato electrónico no está confirmado. A escala, la transcripción puede dejar de ser el mejor mecanismo; el modelo de la serie sí puede permanecer.",
    "questionsToValidate": "OQ-OWN-003, quién anota después de la sesión."
  },
  {
    "id": "SOL-GROW-002",
    "title": "Foto del indicador como evidencia del peso",
    "description": "se fotografía la lectura asociada al animal y esa foto acompaña el peso transcrito. No evita, por sí sola, escribir el número.",
    "types": [
      "PROCESS",
      "SOFTWARE"
    ],
    "painPointIds": [
      "PP-GROW-001",
      "PP-DATA-002"
    ],
    "capabilityIds": [
      "CAP-GROW-001",
      "CAP-DATA-002"
    ],
    "capabilityNote": "",
    "howItHelps": "el propietario puede ver la lectura y no depender solo del número que le dijeron.",
    "pros": "bajo costo. Encaja con las fotos que ya se mandan. Refuerza SOL-GROW-001.",
    "cons": "hay que lograr que la foto muestre el indicador y se sepa de qué animal es. No calcula solo la ganancia.",
    "preconditions": "cámara del teléfono y un momento en la manga. La señal puede ser posterior (SOL-CONN-001).",
    "cost": "low",
    "complexity": "low",
    "operationalFriction": "low",
    "dataReliability": "medium",
    "humanDependency": "high",
    "connectivityDependency": "low",
    "hardwareDependency": "low",
    "scalability": "medium",
    "auditability": "high",
    "currentFeasibility": "high",
    "recommendedNow": "yes",
    "recommendedAtScale": "yes",
    "packageNote": "",
    "rationale": "es evidencia, no un sustituto de la báscula conectada. Conviene ahora y sigue sirviendo como respaldo aunque más adelante exista otra captura.",
    "questionsToValidate": "si en la sesión de una hora es práctico fotografiar cada lectura."
  },
  {
    "id": "SOL-GROW-003",
    "title": "Lectura electrónica de la báscula",
    "description": "el peso pasaría del indicador al historial sin transcribirlo. Solo si el aparato puede hacerlo. El modelo IBN ARGON no está confirmado.",
    "types": [
      "HARDWARE",
      "SOFTWARE",
      "AUTOMATION"
    ],
    "painPointIds": [
      "PP-GROW-001",
      "PP-DATA-002"
    ],
    "capabilityIds": [
      "CAP-GROW-001",
      "CAP-DATA-002"
    ],
    "capabilityNote": "",
    "howItHelps": "reduciría el error de copiado y dejaría un dato de aparato, que es la forma más clara de peso observado.",
    "pros": "menos fricción de transcripción si funciona. El historial de SOL-GROW-001 podría recibir el mismo dato.",
    "cons": "CON-SCALE-001 prohíbe asumir puertos o protocolo. Puede hacer falta otro indicador. No identifica solo al animal.",
    "preconditions": "OQ-SCALE-001. Sin esa respuesta no hay opción que adoptar.",
    "cost": "high",
    "complexity": "high",
    "operationalFriction": "low",
    "dataReliability": "high",
    "humanDependency": "low",
    "connectivityDependency": "medium",
    "hardwareDependency": "high",
    "scalability": "high",
    "auditability": "high",
    "currentFeasibility": "low",
    "recommendedNow": "investigate",
    "recommendedAtScale": "investigate",
    "packageNote": "",
    "rationale": "es el camino de automatización del pesaje, y hoy es una pregunta, no un requisito. El costo high no es una cotización: cubre tanto un enlace simple desconocido como la posibilidad de cambiar el indicador.",
    "questionsToValidate": "OQ-SCALE-001."
  },
  {
    "id": "SOL-GROW-004",
    "title": "Política de pesaje de becerros y hueco visible",
    "description": "se mantiene el intervalo ya practicado, aproximadamente cada 15 días, solo para becerros. No se pesa a diario. Un becerro esperado que no pasa queda visible.",
    "types": [
      "POLICY",
      "PROCESS"
    ],
    "painPointIds": [
      "PP-GROW-001"
    ],
    "capabilityIds": [
      "CAP-GROW-001"
    ],
    "capabilityNote": "",
    "howItHelps": "evita diseñar un pesaje imposible y convierte la ausencia en información.",
    "pros": "respeta BR-WEIGH-002 y CON-WEIGH-001. No añade una sesión nueva.",
    "cons": "no crea el peso. Si no se sabe qué becerros entran a la rutina, el hueco tampoco se puede marcar.",
    "preconditions": "SOL-GROW-001 y una lista de becerros de la rutina.",
    "cost": "low",
    "complexity": "low",
    "operationalFriction": "low",
    "dataReliability": "medium",
    "humanDependency": "medium",
    "connectivityDependency": "none",
    "hardwareDependency": "none",
    "scalability": "high",
    "auditability": "medium",
    "currentFeasibility": "high",
    "recommendedNow": "yes",
    "recommendedAtScale": "yes",
    "packageNote": "",
    "rationale": "la política ya cabe en la práctica actual. Lo nuevo es no perder el hueco. Las vacas adultas siguen fuera de la rutina.",
    "questionsToValidate": "OQ-OWN-003."
  },
  {
    "id": "SOL-FEED-001",
    "title": "Declaración estructurada de compra, preparación y entrega",
    "description": "se anota la materia prima que entra, el lote que se prepara y la cantidad que alguien dice haber ofrecido. Cada cantidad dice si es comprada, preparada o entregada declarada, y si su calidad es declarada, observada o medida. No es una entrega verificada. No se anota lo que comió cada animal.",
    "types": [
      "PROCESS",
      "SOFTWARE"
    ],
    "painPointIds": [
      "PP-FEED-001"
    ],
    "capabilityIds": [
      "CAP-FEED-001"
    ],
    "capabilityNote": "",
    "howItHelps": "separa la compra de lo preparado y de lo declarado como entregado. Una compra, además, puede ser el mismo evento que el gasto y la entrada de bodega.",
    "pros": "no exige báscula de alimento ni red. Deja el hueco a la vista.",
    "cons": "el número de preparación o de entrega puede ser un dicho. No prueba el ejemplo de 1.0 kg frente a 1.5 kg. No cuadra OQ-FEED-002.",
    "preconditions": "OQ-FEED-001 sigue abierta. OQ-FEED-003 impide fijar la fórmula.",
    "cost": "low",
    "complexity": "low",
    "operationalFriction": "medium",
    "dataReliability": "low",
    "humanDependency": "high",
    "connectivityDependency": "low",
    "hardwareDependency": "none",
    "scalability": "medium",
    "auditability": "low",
    "currentFeasibility": "high",
    "recommendedNow": "yes",
    "recommendedAtScale": "investigate",
    "packageNote": "la compra está en el mínimo. La preparación y la entrega declarada son deseables, no necesarias para empezar.",
    "rationale": "archivar el dicho es mejor que no tenerlo, y llamarlo verificación sería una falsa confianza. La cantidad medida sigue en SOL-FEED-003.",
    "questionsToValidate": "OQ-FEED-001, OQ-FEED-002, DQ-FEED-004."
  },
  {
    "id": "SOL-FEED-002",
    "title": "La misma declaración, con evidencia",
    "description": "SOL-FEED-001 más foto o nota del ticket, del tambo o del reparto. La evidencia no convierte una entrega declarada en entrega medida.",
    "types": [
      "PROCESS",
      "SOFTWARE"
    ],
    "painPointIds": [
      "PP-FEED-001",
      "PP-DATA-002"
    ],
    "capabilityIds": [
      "CAP-FEED-001",
      "CAP-DATA-002"
    ],
    "capabilityNote": "",
    "howItHelps": "el propietario puede ver en qué se apoyó el dicho. El ticket de compra sí puede hacer observada la cantidad comprada, cuando el ticket la trae.",
    "pros": "usa el teléfono actual.",
    "cons": "una foto del comedero no prueba 1.5 kg ni 1.0 kg.",
    "preconditions": "las de SOL-FEED-001.",
    "cost": "low",
    "complexity": "low",
    "operationalFriction": "medium",
    "dataReliability": "medium",
    "humanDependency": "high",
    "connectivityDependency": "low",
    "hardwareDependency": "low",
    "scalability": "medium",
    "auditability": "medium",
    "currentFeasibility": "high",
    "recommendedNow": "yes",
    "recommendedAtScale": "yes",
    "packageNote": "deseable. El ticket de la compra, cuando ya se guarda, entra al mínimo junto con el gasto.",
    "rationale": "evidencia de un dicho, no verificación de la ración. No es un segundo proyecto respecto de SOL-FEED-001.",
    "questionsToValidate": "DQ-FEED-004."
  },
  {
    "id": "SOL-FEED-003",
    "title": "Medir el lote con báscula o recipiente no conectado",
    "description": "la preparación o la entrega se pesa o se mide con un aparato simple que no transmite el dato. Alguien anota la lectura.",
    "types": [
      "PROCESS",
      "HARDWARE"
    ],
    "painPointIds": [
      "PP-FEED-001",
      "PP-INV-001"
    ],
    "capabilityIds": [
      "CAP-FEED-001",
      "CAP-INV-001"
    ],
    "capabilityNote": "",
    "howItHelps": "convierte la cantidad ofrecida en medición, que es el salto que el registro manual no da.",
    "pros": "no depende de red ni de un dosificador. Encaja con el seguimiento por grupo.",
    "cons": "no se sabe si hoy existe báscula de alimento, recipiente o solo el ojo (OQ-FEED-001). Recomendar la compra ahora inventaría una necesidad no medida.",
    "preconditions": "respuesta a OQ-FEED-001.",
    "cost": "medium",
    "complexity": "medium",
    "operationalFriction": "medium",
    "dataReliability": "high",
    "humanDependency": "medium",
    "connectivityDependency": "none",
    "hardwareDependency": "medium",
    "scalability": "high",
    "auditability": "high",
    "currentFeasibility": "low",
    "recommendedNow": "investigate",
    "recommendedAtScale": "investigate",
    "packageNote": "",
    "rationale": "es la dirección más creíble si hace falta medir de verdad, y este diseño no establece que ya se pueda ni que haya que comprar el aparato. El costo medium asume un medio simple, no una planta.",
    "questionsToValidate": "OQ-FEED-001. Si un recipiente ya usado en el tambo puede servir de medida."
  },
  {
    "id": "SOL-FEED-004",
    "title": "Báscula de alimento conectada",
    "description": "una báscula de ingredientes o de ración enviaría la cantidad al registro.",
    "types": [
      "HARDWARE",
      "SOFTWARE",
      "AUTOMATION"
    ],
    "painPointIds": [
      "PP-FEED-001"
    ],
    "capabilityIds": [
      "CAP-FEED-001"
    ],
    "capabilityNote": "",
    "howItHelps": "reduciría la transcripción de la cantidad medida.",
    "pros": "dato de aparato y mejor auditabilidad si el resto del proceso existe.",
    "cons": "aparato, instalación y enlace que no están en el descubrimiento. La conectividad del rancho es mala. No identifica merma después del pesaje, por ejemplo en el comedero o fuera de él.",
    "preconditions": "SOL-FEED-003 tendría que tener sentido primero. No hay evidencia de este equipo.",
    "cost": "high",
    "complexity": "high",
    "operationalFriction": "low",
    "dataReliability": "high",
    "humanDependency": "low",
    "connectivityDependency": "high",
    "hardwareDependency": "high",
    "scalability": "high",
    "auditability": "high",
    "currentFeasibility": "low",
    "recommendedNow": "no",
    "recommendedAtScale": "investigate",
    "packageNote": "",
    "rationale": "aproximadamente 21 cabezas y una forma de medir todavía desconocida no justifican el enlace. Medir sin conectar es el peldaño anterior.",
    "questionsToValidate": "OQ-FEED-001, OQ-CONN-001."
  },
  {
    "id": "SOL-FEED-005",
    "title": "Dosificación automatizada",
    "description": "un equipo prepararía o entregaría la ración con poca intervención.",
    "types": [
      "HARDWARE",
      "AUTOMATION"
    ],
    "painPointIds": [
      "PP-FEED-001"
    ],
    "capabilityIds": [
      "CAP-FEED-001"
    ],
    "capabilityNote": "",
    "howItHelps": "podría estabilizar la cantidad ofrecida y dejar registro de dosis.",
    "pros": "menos dependencia del dicho diario.",
    "cons": "cambia el sistema de alimentación, no solo la medición. El rancho describe dieta en tambo, comedero común y competencia. El consumo individual no es el concepto viable. El costo es desproporcionado para el hato actual.",
    "preconditions": "una decisión de cambiar la forma de alimentar, que no está en la entrevista.",
    "cost": "very_high",
    "complexity": "high",
    "operationalFriction": "low",
    "dataReliability": "high",
    "humanDependency": "low",
    "connectivityDependency": "medium",
    "hardwareDependency": "high",
    "scalability": "high",
    "auditability": "high",
    "currentFeasibility": "low",
    "recommendedNow": "no",
    "recommendedAtScale": "investigate",
    "packageNote": "",
    "rationale": "no es el siguiente paso de un tambo y un grupo de aproximadamente 21 animales. A escala solo se investiga si el rancho cambiara de sistema de alimentación. La conectividad se deja en medium porque un equipo local no tiene por qué avisar en vivo; eso no lo hace recomendable.",
    "questionsToValidate": "ninguna que este hato pueda contestar con utilidad ahora. OQ-FEED-003 ni siquiera fija la fórmula."
  },
  {
    "id": "SOL-FEED-006",
    "title": "Comparar estrategia, crecimiento y costo",
    "description": "poner lado a lado periodos de dieta distinta, su costo de alimento y la ganancia de los becerros pesados. Si falta un insumo, la comparación se muestra incompleta.",
    "types": [
      "SOFTWARE",
      "PROCESS"
    ],
    "painPointIds": [
      "PP-FEED-001",
      "PP-FIN-001",
      "PP-GROW-001"
    ],
    "capabilityIds": [
      "CAP-FEED-002",
      "CAP-FIN-001",
      "CAP-GROW-001"
    ],
    "capabilityNote": "",
    "howItHelps": "es el uso posterior de cantidades, costos y pesos. No crea esas cantidades.",
    "pros": "no exige hardware. Responde a una pregunta que el propietario ya tiene, cuando los datos existan.",
    "cons": "con OQ-FEED-002 abierto, una comparación numérica parecería una respuesta falsa.",
    "preconditions": "series de peso, egresos clasificados y cantidades de alimento que el rancho reconozca. Hoy no están.",
    "cost": "low",
    "complexity": "medium",
    "operationalFriction": "low",
    "dataReliability": "low",
    "humanDependency": "low",
    "connectivityDependency": "low",
    "hardwareDependency": "none",
    "scalability": "high",
    "auditability": "medium",
    "currentFeasibility": "low",
    "recommendedNow": "no",
    "recommendedAtScale": "investigate",
    "packageNote": "",
    "rationale": "la capacidad existe. Producir el número ahora no. La dependencia humana es low porque el trabajo estaría en los registros previos, no en esta comparación.",
    "questionsToValidate": "OQ-FEED-002, OQ-FEED-003, OQ-FIN-001."
  },
  {
    "id": "SOL-FIN-001",
    "title": "Anotación del gasto, incluida la nómina en efectivo",
    "description": "el propietario anota el egreso y lo clasifica como gasto operativo o inversión cuando puede. Si no hay ticket, queda la nota. No se inventa el criterio contable.",
    "types": [
      "PROCESS",
      "SOFTWARE"
    ],
    "painPointIds": [
      "PP-FIN-002",
      "PP-FIN-001"
    ],
    "capabilityIds": [
      "CAP-FIN-002",
      "CAP-FIN-001"
    ],
    "capabilityNote": "",
    "howItHelps": "la nómina y otros pagos en efectivo dejan de existir solo en la memoria. La clase de gestión empieza a separarse.",
    "pros": "cubre el caso que la foto del ticket no cubre. Bajo costo.",
    "cons": "la clasificación puede ser débil mientras OQ-FIN-001 siga abierta. No calcula la parte del socio.",
    "preconditions": "BR-PAY-001, BR-FIN-001.",
    "cost": "low",
    "complexity": "low",
    "operationalFriction": "low",
    "dataReliability": "medium",
    "humanDependency": "high",
    "connectivityDependency": "low",
    "hardwareDependency": "none",
    "scalability": "medium",
    "auditability": "medium",
    "currentFeasibility": "high",
    "recommendedNow": "yes",
    "recommendedAtScale": "yes",
    "packageNote": "",
    "rationale": "es el complemento de SOL-FIN-002, no un sistema paralelo. Hace visible el efectivo sin pretender ser contabilidad fiscal.",
    "questionsToValidate": "OQ-FIN-001, OQ-PEOPLE-001."
  },
  {
    "id": "SOL-FIN-002",
    "title": "Foto del ticket y clasificación",
    "description": "el ticket que ya se guarda se fotografía y se clasifica como gasto operativo o inversión, a nivel de gestión.",
    "types": [
      "PROCESS",
      "SOFTWARE"
    ],
    "painPointIds": [
      "PP-FIN-002",
      "PP-FIN-001",
      "PP-DATA-002"
    ],
    "capabilityIds": [
      "CAP-FIN-002",
      "CAP-DATA-002"
    ],
    "capabilityNote": "",
    "howItHelps": "el comprobante deja de estar solo en papel suelto y puede atribuirse después, si el criterio existe.",
    "pros": "la mayoría de los tickets ya se conservan. La fricción añadida es la foto y la clase, no la disciplina de guardar el papel.",
    "cons": "no separa solo lo que el criterio contable aún no define. No lee el estado de cuenta.",
    "preconditions": "OQ-FIN-001 puede dejar egresos sin clase. Esos quedan explícitamente sin clasificar.",
    "cost": "low",
    "complexity": "low",
    "operationalFriction": "low",
    "dataReliability": "medium",
    "humanDependency": "high",
    "connectivityDependency": "low",
    "hardwareDependency": "low",
    "scalability": "high",
    "auditability": "high",
    "currentFeasibility": "high",
    "recommendedNow": "yes",
    "recommendedAtScale": "yes",
    "packageNote": "",
    "rationale": "mucho comprobante ya existe. Ligarlo y clasificarlo es de las ganancias de información más altas por peso de trabajo. La confiabilidad de la clase se queda en medium a propósito.",
    "questionsToValidate": "OQ-FIN-001."
  },
  {
    "id": "SOL-FIN-003",
    "title": "Rentabilidad administrativa provisional",
    "description": "con ingresos y costos ya registrados, se muestra un margen provisional de lo asignado, la bolsa de lo no asignado, la completitud y la calidad de los datos. La parte del ranchero queda desconocida. No es utilidad fiscal, no finiquita al socio y no calcula costo por kilo si el alimento no es confiable.",
    "types": [
      "SOFTWARE",
      "PROCESS"
    ],
    "painPointIds": [
      "PP-FIN-001"
    ],
    "capabilityIds": [
      "CAP-FIN-001"
    ],
    "capabilityNote": "",
    "howItHelps": "el propietario ve el dinero conocido y lo que falta, sin una cifra que parezca cerrada.",
    "pros": "usa los registros que ya se capturaron. No exige reglas de «a la parte».",
    "cons": "un lector apurado puede ignorar la completitud. Por eso la parte del ranchero se muestra como no calculable, no como cero.",
    "preconditions": "que existan algunos ingresos o costos. OQ-OWN-001 y OQ-FEED-002 siguen abiertas y limitan la lectura. No la impiden.",
    "cost": "low",
    "complexity": "medium",
    "operationalFriction": "low",
    "dataReliability": "low",
    "humanDependency": "medium",
    "connectivityDependency": "low",
    "hardwareDependency": "none",
    "scalability": "high",
    "auditability": "medium",
    "currentFeasibility": "medium",
    "recommendedNow": "yes",
    "recommendedAtScale": "yes",
    "packageNote": "deseable. No hace falta para empezar. El ingreso de venta se registra igual, en SOL-SALE-001.",
    "rationale": "aplazar toda lectura dejaba el objetivo principal en una gaveta de tickets. La lectura de ahora es provisional a propósito. La confiabilidad low es la del conjunto, no la de un ticket suelto.",
    "questionsToValidate": "OQ-OWN-001, OQ-TRADE-001, OQ-FEED-002, DQ-FIN-003."
  },
  {
    "id": "SOL-FIN-004",
    "title": "Integración con cuentas financieras",
    "description": "traer movimientos desde una cuenta o un medio de pago, en lugar de capturar cada ticket. No se nombra un proveedor ni un mecanismo.",
    "types": [
      "SOFTWARE",
      "AUTOMATION"
    ],
    "painPointIds": [
      "PP-FIN-001",
      "PP-FIN-002"
    ],
    "capabilityIds": [
      "CAP-FIN-002"
    ],
    "capabilityNote": "",
    "howItHelps": "podría reducir la captura de lo que ya pasó por tarjeta.",
    "pros": "las compras se pagan comúnmente con tarjeta. Un estado de cuenta existe en algún lado, aunque el descubrimiento no lo revisó.",
    "cons": "la nómina en efectivo no estaría ahí. Un movimiento bancario no dice si fue gasto o inversión, ni a qué animal pega. Exige enlace y credenciales que no se han estudiado.",
    "preconditions": "saber qué cuentas hay y qué muestran. Eso no está en la entrevista.",
    "cost": "high",
    "complexity": "high",
    "operationalFriction": "low",
    "dataReliability": "medium",
    "humanDependency": "low",
    "connectivityDependency": "high",
    "hardwareDependency": "none",
    "scalability": "high",
    "auditability": "high",
    "currentFeasibility": "low",
    "recommendedNow": "no",
    "recommendedAtScale": "investigate",
    "packageNote": "",
    "rationale": "el ticket fotografiado cubre el ahora. La cuenta es una investigación posterior, no un requisito, y no sustituye la clasificación ni el efectivo.",
    "questionsToValidate": "OQ-FIN-001. Si el propietario quiere que un tercero vea movimientos de sus cuentas. Eso no se preguntó."
  },
  {
    "id": "SOL-PUR-001",
    "title": "Registrar costo, flete y forma de compra",
    "description": "cada compra guarda precio, flete pagado por el comprador y si fue por kilogramo o por bulto, sin traducir el bulto.",
    "types": [
      "PROCESS",
      "SOFTWARE"
    ],
    "painPointIds": [
      "PP-FIN-001"
    ],
    "capabilityIds": [
      "CAP-FIN-001",
      "CAP-DATA-001"
    ],
    "capabilityNote": "",
    "howItHelps": "el costo de entrada deja de vivir solo en el trato. Es insumo de cualquier lectura posterior.",
    "pros": "el propietario ya participa en la compra. Poca fricción añadida.",
    "cons": "no dice si la compra resultó bien. No define «bulto».",
    "preconditions": "BR-BUY-001, BR-BUY-002. OQ-TRADE-001 permanece.",
    "cost": "low",
    "complexity": "low",
    "operationalFriction": "low",
    "dataReliability": "medium",
    "humanDependency": "high",
    "connectivityDependency": "low",
    "hardwareDependency": "none",
    "scalability": "high",
    "auditability": "medium",
    "currentFeasibility": "high",
    "recommendedNow": "yes",
    "recommendedAtScale": "yes",
    "packageNote": "",
    "rationale": "sin el costo de entrada no hay economía del animal. Registrarlo no exige cerrar el bulto ni «a la parte».",
    "questionsToValidate": "OQ-TRADE-001, OQ-OWN-004."
  },
  {
    "id": "SOL-PUR-002",
    "title": "Peso de llegada distinto del peso de compra",
    "description": "si el ganado se pesa en el rancho después de descansar, ese peso se guarda aparte del peso o del precio de la compra.",
    "types": [
      "PROCESS"
    ],
    "painPointIds": [
      "PP-FIN-001",
      "PP-GROW-001"
    ],
    "capabilityIds": [
      "CAP-FIN-001",
      "CAP-GROW-001"
    ],
    "capabilityNote": "",
    "howItHelps": "permitiría ver merma de viaje o un punto de partida, si la práctica existe.",
    "pros": "usaría la báscula de ganado ya presente. No pide un aparato nuevo.",
    "cons": "la entrevista lo dice como preferencia, no como rutina. No hay plazo de descanso. No se sabe si el peso de compra y el de llegada son el mismo concepto.",
    "preconditions": "BR-WEIGH-004. Confirmar que el pesaje de llegada ocurre.",
    "cost": "low",
    "complexity": "low",
    "operationalFriction": "medium",
    "dataReliability": "medium",
    "humanDependency": "high",
    "connectivityDependency": "none",
    "hardwareDependency": "low",
    "scalability": "high",
    "auditability": "medium",
    "currentFeasibility": "medium",
    "recommendedNow": "investigate",
    "recommendedAtScale": "investigate",
    "packageNote": "",
    "rationale": "es deseable y no está confirmado. Recomendarlo como práctica actual repetiría el error que el AS-IS ya corrigió.",
    "questionsToValidate": "si hoy se pesa al llegar, después de cuánto descanso, y qué se hace con un bulto no pesado cabeza por cabeza."
  },
  {
    "id": "SOL-INV-001",
    "title": "Saldo simple y conteo físico",
    "description": "entradas y salidas de los insumos que se decida llevar, un saldo teórico y un conteo físico con la diferencia anotada. La lectura inicial limita el hábito a ingredientes de la dieta.",
    "types": [
      "PROCESS",
      "SOFTWARE"
    ],
    "painPointIds": [
      "PP-INV-001",
      "PP-FEED-001"
    ],
    "capabilityIds": [
      "CAP-INV-001",
      "CAP-FEED-001"
    ],
    "capabilityNote": "",
    "howItHelps": "la bodega deja de ser solo un cuarto cerrado. Una merma de ingrediente se puede ver como diferencia, no como sospecha tardía.",
    "pros": "proporcional a un rancho chico. Se apoya en compras que el propietario ya hace y en las preparaciones de SOL-FEED-001.",
    "cons": "un conteo abandonado devuelve el problema. Incluir herramientas y medicamentos el primer día sube la fricción sin que la entrevista lo pida como prioridad.",
    "preconditions": "DQ-INV-001. La bodega existe. El control no.",
    "cost": "low",
    "complexity": "low",
    "operationalFriction": "medium",
    "dataReliability": "medium",
    "humanDependency": "high",
    "connectivityDependency": "low",
    "hardwareDependency": "none",
    "scalability": "medium",
    "auditability": "medium",
    "currentFeasibility": "high",
    "recommendedNow": "yes",
    "recommendedAtScale": "yes",
    "packageNote": "",
    "rationale": "el método de teórico contra físico sirve ahora para alimento y sigue siendo el método correcto si el almacén crece. La frecuencia y el catálogo completo no se fijan. yes a escala se refiere al método, no a un inventario industrial.",
    "questionsToValidate": "DQ-INV-001, OQ-FEED-001."
  },
  {
    "id": "SOL-INV-002",
    "title": "Contar solo cuando se sospecha",
    "description": "no se lleva saldo. Se cuenta la bodega cuando alguien duda.",
    "types": [
      "PROCESS"
    ],
    "painPointIds": [
      "PP-INV-001"
    ],
    "capabilityIds": [
      "CAP-INV-001"
    ],
    "capabilityNote": "",
    "howItHelps": "es más fácil que un saldo corrido.",
    "pros": "poca disciplina.",
    "cons": "repite el descubrimiento tardío. Sin entradas y salidas no hay teórico contra qué contrastar.",
    "preconditions": "ninguna.",
    "cost": "low",
    "complexity": "low",
    "operationalFriction": "low",
    "dataReliability": "low",
    "humanDependency": "high",
    "connectivityDependency": "none",
    "hardwareDependency": "none",
    "scalability": "low",
    "auditability": "low",
    "currentFeasibility": "high",
    "recommendedNow": "no",
    "recommendedAtScale": "no",
    "packageNote": "",
    "rationale": "es casi la práctica actual. No responde PP-INV-001.",
    "questionsToValidate": "ninguna."
  },
  {
    "id": "SOL-SEC-001",
    "title": "Conteo periódico de todo el hato",
    "description": "en una cadencia fija se recorre o se reúne el ganado y se contrasta contra la lista de quién debería estar.",
    "types": [
      "PROCESS",
      "POLICY"
    ],
    "painPointIds": [
      "PP-SEC-001",
      "PP-SEC-002"
    ],
    "capabilityIds": [
      "CAP-SEC-001"
    ],
    "capabilityNote": "",
    "howItHelps": "sería la verificación más directa de presencia.",
    "pros": "no exige aparato. Un conteo hecho de verdad sube la confiabilidad.",
    "cons": "el predio es de aproximadamente 530 hectáreas, con potreros grandes. Reunir toma tiempo. OQ-COUNT-001 dice que no se sabe de qué forma realista se podría hacer. Un conteo imposible no se recomienda por ser lógico en abstracto.",
    "preconditions": "OQ-COUNT-001, OQ-LAND-001, OQ-LAND-002.",
    "cost": "low",
    "complexity": "medium",
    "operationalFriction": "high",
    "dataReliability": "medium",
    "humanDependency": "high",
    "connectivityDependency": "none",
    "hardwareDependency": "none",
    "scalability": "low",
    "auditability": "medium",
    "currentFeasibility": "low",
    "recommendedNow": "investigate",
    "recommendedAtScale": "investigate",
    "packageNote": "",
    "rationale": "el dolor es crítico y el método realista no está descrito. La confiabilidad medium vale solo si el conteo ocurre; la factibilidad actual es low.",
    "questionsToValidate": "OQ-COUNT-001."
  },
  {
    "id": "SOL-SEC-002",
    "title": "Última observación en un manejo",
    "description": "la última vez que un animal se vio queda escrita por el evento que ya lo reunió, sobre todo el pesaje. No es un formulario de presencia aparte ni una verificación del hato.",
    "types": [
      "PROCESS"
    ],
    "painPointIds": [
      "PP-SEC-001",
      "PP-SEC-002"
    ],
    "capabilityIds": [
      "CAP-SEC-001"
    ],
    "capabilityNote": "",
    "howItHelps": "aprovecha una hora de manga que ya existe. Un becerro que no llega al pesaje deja de ser solo un hueco de peso.",
    "pros": "fricción baja. No añade una recorrida. Sirve también a CAP-GROW-001.",
    "cons": "no ve a los animales que no se manejan. Las vacas adultas no se pesan de rutina. No acorta por sí solo el plazo de una o dos semanas para el hato completo. No detecta una intrusión.",
    "preconditions": "TGT-WEIGH-001 o un manejo equivalente, y la lista de TGT-ANIMAL-001.",
    "cost": "low",
    "complexity": "low",
    "operationalFriction": "low",
    "dataReliability": "low",
    "humanDependency": "high",
    "connectivityDependency": "low",
    "hardwareDependency": "none",
    "scalability": "medium",
    "auditability": "medium",
    "currentFeasibility": "high",
    "recommendedNow": "yes",
    "recommendedAtScale": "yes",
    "packageNote": "",
    "rationale": "es una última observación de quien ya estaba en la manga, con fricción nula si sale del pesaje. No acorta por sí sola el plazo de una o dos semanas del hato. TGT-HERD-VERIFY-001 sigue con método y cadencia pendientes. La confiabilidad del hato completo se queda en low.",
    "questionsToValidate": "OQ-OWN-003, DQ-SEC-003. Qué fracción del hato no entra a la manga en dos semanas."
  },
  {
    "id": "SOL-SEC-003",
    "title": "Puntos de paso con RFID",
    "description": "un lector en un punto de manejo registraría qué animales pasaron.",
    "types": [
      "HARDWARE",
      "AUTOMATION",
      "SOFTWARE"
    ],
    "painPointIds": [
      "PP-SEC-001",
      "PP-SEC-002",
      "PP-ID-001"
    ],
    "capabilityIds": [
      "CAP-SEC-001",
      "CAP-ID-001"
    ],
    "capabilityNote": "",
    "howItHelps": "la verificación de los que pasan sería una lectura, no una lista dictada.",
    "pros": "combina identidad y presencia en la manga. Escala mejor que el conteo visual si el hato crece.",
    "cons": "el aparato no está justificado con aproximadamente 21 cabezas. Un punto de paso no cubre el potrero. Sigue sin ver a quien no pasa.",
    "preconditions": "SOL-ID-005, que tampoco se recomienda ahora.",
    "cost": "high",
    "complexity": "high",
    "operationalFriction": "medium",
    "dataReliability": "high",
    "humanDependency": "low",
    "connectivityDependency": "medium",
    "hardwareDependency": "high",
    "scalability": "high",
    "auditability": "high",
    "currentFeasibility": "low",
    "recommendedNow": "no",
    "recommendedAtScale": "investigate",
    "packageNote": "",
    "rationale": "opción de escala, no de este hato. El mismo identificador interno puede recibir esas lecturas más adelante.",
    "questionsToValidate": "OQ-COUNT-001. Si el problema que queda es el animal que nunca entra a un punto de paso."
  },
  {
    "id": "SOL-SEC-004",
    "title": "Rastreo activo o GPS",
    "description": "un dispositivo por animal, o un esquema equivalente, para saber ubicación. Se considera solo como alternativa de costo alto.",
    "types": [
      "HARDWARE",
      "SOFTWARE",
      "AUTOMATION"
    ],
    "painPointIds": [
      "PP-SEC-001"
    ],
    "capabilityIds": [
      "CAP-SEC-001"
    ],
    "capabilityNote": "",
    "howItHelps": "en teoría acortaría el tiempo para saber que un animal no está donde se espera.",
    "pros": "es la opción que mira el potrero, no solo la manga.",
    "cons": "costo muy alto para aproximadamente 21 cabezas en aproximadamente 530 hectáreas. La cobertura celular es limitada y poco confiable, así que un aviso remoto no se puede suponer. No detecta por sí solo una intrusión. No hay evidencia de que sea económicamente sensato.",
    "preconditions": "energía, cobertura y un costo que el descubrimiento no tiene.",
    "cost": "very_high",
    "complexity": "high",
    "operationalFriction": "medium",
    "dataReliability": "medium",
    "humanDependency": "low",
    "connectivityDependency": "high",
    "hardwareDependency": "high",
    "scalability": "medium",
    "auditability": "high",
    "currentFeasibility": "low",
    "recommendedNow": "no",
    "recommendedAtScale": "investigate",
    "packageNote": "",
    "rationale": "no se diseña como si el GPS fuera razonable hoy. La confiabilidad se queda en medium porque un aviso remoto no se puede suponer con la cobertura descrita. A escala tampoco se recomienda; solo se deja investigable si un problema futuro, medido, lo justificara. La escalabilidad medium refleja predio grande, señal débil y mantenimiento de dispositivos, no una virtud del mapa.",
    "questionsToValidate": "OQ-CONN-001. Ninguna cotización se inventa aquí."
  },
  {
    "id": "SOL-SEC-005",
    "title": "Procedimiento de accesos y de cerco",
    "description": "una forma de trabajo para revisar accesos o tramos y anotar una anomalía. No se fija un horario nocturno ni un recorrido de 530 hectáreas.",
    "types": [
      "PROCESS",
      "POLICY"
    ],
    "painPointIds": [
      "PP-SEC-003"
    ],
    "capabilityIds": [
      "CAP-SEC-002"
    ],
    "capabilityNote": "",
    "howItHelps": "puede dejar constancia de lo que alguien vio, sin aparato.",
    "pros": "costo bajo. No confunde el faltante de ganado con la entrada.",
    "cons": "un corte de noche entre dos revisiones no se detecta. No se sabe si la gente del rancho puede sostener la ronda. La evidencia sigue siendo un dicho o una foto ocasional.",
    "preconditions": "OQ-SEC-001. Saber qué accesos importan.",
    "cost": "low",
    "complexity": "medium",
    "operationalFriction": "medium",
    "dataReliability": "low",
    "humanDependency": "high",
    "connectivityDependency": "none",
    "hardwareDependency": "none",
    "scalability": "medium",
    "auditability": "low",
    "currentFeasibility": "medium",
    "recommendedNow": "investigate",
    "recommendedAtScale": "investigate",
    "packageNote": "",
    "rationale": "es la opción de proceso que hay que entender antes de comprar cámaras. La evidencia no dice que una ronda sea realista, así que no se adopta en el paquete inicial.",
    "questionsToValidate": "OQ-SEC-001. Qué revisión cabe en el trabajo que los dos trabajadores ya hacen."
  },
  {
    "id": "SOL-SEC-006",
    "title": "Iluminación en accesos",
    "description": "luz en algunos accesos o puntos de paso, no en el perímetro completo.",
    "types": [
      "HARDWARE"
    ],
    "painPointIds": [
      "PP-SEC-003"
    ],
    "capabilityIds": [
      "CAP-SEC-002"
    ],
    "capabilityNote": "",
    "howItHelps": "puede disuadir o facilitar que una persona vea un acceso de noche. No crea un archivo.",
    "pros": "no depende de la señal celular.",
    "cons": "no avisa al propietario. No demuestra un corte. El descubrimiento no habla de iluminación ni de energía disponible en los accesos; no se afirma ni se niega que haya energía.",
    "preconditions": "OQ-SEC-001 y un conocimiento del acceso que no está en las entrevistas.",
    "cost": "medium",
    "complexity": "medium",
    "operationalFriction": "low",
    "dataReliability": "low",
    "humanDependency": "low",
    "connectivityDependency": "none",
    "hardwareDependency": "high",
    "scalability": "medium",
    "auditability": "low",
    "currentFeasibility": "medium",
    "recommendedNow": "investigate",
    "recommendedAtScale": "investigate",
    "packageNote": "",
    "rationale": "puede acompañar un procedimiento y no lo sustituye. Sin prioridad dicha por el propietario, no entra al ahora.",
    "questionsToValidate": "OQ-SEC-001."
  },
  {
    "id": "SOL-SEC-007",
    "title": "Cámaras en pocos puntos de paso",
    "description": "cámaras solo donde el ganado o las personas tienen que pasar, no a lo largo del cerco. Están siendo consideradas. No están instaladas.",
    "types": [
      "HARDWARE"
    ],
    "painPointIds": [
      "PP-SEC-003"
    ],
    "capabilityIds": [
      "CAP-SEC-002"
    ],
    "capabilityNote": "",
    "howItHelps": "podría dejar imagen de un acceso. Una imagen revisada después no es lo mismo que un aviso inmediato.",
    "pros": "ataca un punto concreto. Evita la idea de vigilar 530 hectáreas con cámaras.",
    "cons": "el software y la cámara no cubren el cerco que se corta en otro lado. La señal para un aviso remoto es poco confiable. Quién revisa las imágenes no está definido. OQ-SEC-001 no ha puesto esto por encima del registro de ganado.",
    "preconditions": "prioridad del propietario, punto elegido, y una forma de conservar la imagen que no se diseña aquí.",
    "cost": "high",
    "complexity": "high",
    "operationalFriction": "medium",
    "dataReliability": "medium",
    "humanDependency": "medium",
    "connectivityDependency": "high",
    "hardwareDependency": "high",
    "scalability": "medium",
    "auditability": "medium",
    "currentFeasibility": "low",
    "recommendedNow": "investigate",
    "recommendedAtScale": "investigate",
    "packageNote": "",
    "rationale": "la conectividad se puntúa high para un aviso inmediato. Una grabación que alguien ve después sería otro uso, de menos dependencia de red y de más dependencia humana, y tampoco está elegido. Las cámaras solas no se recomiendan.",
    "questionsToValidate": "OQ-SEC-001, OQ-CONN-001."
  },
  {
    "id": "SOL-SEC-008",
    "title": "Sensores de perímetro",
    "description": "sensores a lo largo del cerco para detectar un corte o un paso.",
    "types": [
      "HARDWARE",
      "AUTOMATION"
    ],
    "painPointIds": [
      "PP-SEC-003"
    ],
    "capabilityIds": [
      "CAP-SEC-002"
    ],
    "capabilityNote": "",
    "howItHelps": "sería el intento de cubrir entrada física y no solo un acceso.",
    "pros": "mira el perímetro, que es donde la entrevista sitúa el corte.",
    "cons": "predio grande, costo muy alto, falsas alarmas no estudiadas, aviso remoto con señal mala. No está mencionado como opción concreta del propietario; las cámaras sí se están considerando, los sensores no.",
    "preconditions": "un plano que OQ-LAND-001 no da, y una prioridad que OQ-SEC-001 no da.",
    "cost": "very_high",
    "complexity": "high",
    "operationalFriction": "medium",
    "dataReliability": "medium",
    "humanDependency": "low",
    "connectivityDependency": "high",
    "hardwareDependency": "high",
    "scalability": "low",
    "auditability": "medium",
    "currentFeasibility": "low",
    "recommendedNow": "no",
    "recommendedAtScale": "investigate",
    "packageNote": "",
    "rationale": "no es sensato para el perímetro descrito. La escalabilidad es low porque más cerco implica más puntos. No se recomienda ni ahora ni como camino natural del paquete inicial.",
    "questionsToValidate": "OQ-SEC-001. Solo tendría sentido si un diseño físico futuro, que aquí no se hace, lo acotara a tramos cortos."
  },
  {
    "id": "SOL-SEC-009",
    "title": "Combinación de procedimiento y evidencia en pocos puntos",
    "description": "no es un aparato adicional. Es la opción de no elegir una cámara, una luz o un sensor por separado, sino un procedimiento de accesos más evidencia solo en los puntos que el propietario marque. Qué evidencia, no está elegido.",
    "types": [
      "PROCESS",
      "POLICY",
      "HARDWARE"
    ],
    "painPointIds": [
      "PP-SEC-003"
    ],
    "capabilityIds": [
      "CAP-SEC-002"
    ],
    "capabilityNote": "",
    "howItHelps": "evita la lectura de que una cámara resuelve el rancho, y también la lectura de que un procedimiento nocturno imposible es el plan.",
    "pros": "obliga a decir qué punto queda cubierto y cuál no.",
    "cons": "no se puede adoptar hasta saber la prioridad y el punto. El costo depende del medio de evidencia. La puntuación de abajo usa un medio todavía indefinido y no es una cotización.",
    "preconditions": "SOL-SEC-005 entendido, más OQ-SEC-001.",
    "cost": "medium",
    "complexity": "high",
    "operationalFriction": "medium",
    "dataReliability": "medium",
    "humanDependency": "high",
    "connectivityDependency": "medium",
    "hardwareDependency": "medium",
    "scalability": "medium",
    "auditability": "medium",
    "currentFeasibility": "low",
    "recommendedNow": "investigate",
    "recommendedAtScale": "investigate",
    "packageNote": "",
    "rationale": "es la forma honesta de dejar la intrusión abierta. No entra al paquete inicial. No duplica una compra; dice que SOL-SEC-007 sin procedimiento no se recomienda.",
    "questionsToValidate": "OQ-SEC-001."
  },
  {
    "id": "SOL-HEALTH-001",
    "title": "Nota sanitaria en la ficha",
    "description": "cuando hay vacuna, medicamento, baño o problema observado, se anota qué, a quién y cuándo, con el producto si se sabe.",
    "types": [
      "PROCESS",
      "SOFTWARE"
    ],
    "painPointIds": [
      "PP-HEALTH-001",
      "PP-DATA-001"
    ],
    "capabilityIds": [
      "CAP-HEALTH-001",
      "CAP-DATA-001"
    ],
    "capabilityNote": "",
    "howItHelps": "la memoria deja de ser el archivo. No intenta dirigir el calendario veterinario.",
    "pros": "fricción baja si el hecho ya se le cuenta al propietario. Proporcional a la prioridad dicha.",
    "cons": "no mejora el manejo en manga ni evita lazar. No recuerda una vacuna cuyo calendario se desconoce.",
    "preconditions": "TGT-HEALTH-001. OQ-HEALTH-001 sigue abierta.",
    "cost": "low",
    "complexity": "low",
    "operationalFriction": "low",
    "dataReliability": "medium",
    "humanDependency": "high",
    "connectivityDependency": "low",
    "hardwareDependency": "none",
    "scalability": "high",
    "auditability": "medium",
    "currentFeasibility": "high",
    "recommendedNow": "yes",
    "recommendedAtScale": "yes",
    "packageNote": "",
    "rationale": "cabe en el mismo hábito de registro del propietario, sin subir la sanidad por encima de alimento, peso, rentabilidad y seguridad.",
    "questionsToValidate": "OQ-HEALTH-001. Si el medicamento debe descontar bodega desde el primer día (DQ-INV-001)."
  },
  {
    "id": "SOL-HEALTH-002",
    "title": "Recordatorios de calendario sanitario",
    "description": "avisos de vacunas, baños o refuerzos según un calendario.",
    "types": [
      "SOFTWARE",
      "POLICY"
    ],
    "painPointIds": [
      "PP-HEALTH-001"
    ],
    "capabilityIds": [
      "CAP-HEALTH-001"
    ],
    "capabilityNote": "",
    "howItHelps": "podría evitar olvidos cuando exista un calendario real.",
    "pros": "encaja con la revisión semanal si los avisos son pocos.",
    "cons": "no hay calendario documentado. Un recordatorio inventado sería una política veterinaria que este diseño no tiene.",
    "preconditions": "OQ-HEALTH-001.",
    "cost": "low",
    "complexity": "medium",
    "operationalFriction": "low",
    "dataReliability": "low",
    "humanDependency": "medium",
    "connectivityDependency": "low",
    "hardwareDependency": "none",
    "scalability": "high",
    "auditability": "medium",
    "currentFeasibility": "low",
    "recommendedNow": "no",
    "recommendedAtScale": "investigate",
    "packageNote": "",
    "rationale": "la nota sí; el recordatorio no, hasta que el calendario sea del rancho y no de esta ficha.",
    "questionsToValidate": "OQ-HEALTH-001."
  },
  {
    "id": "SOL-REPRO-001",
    "title": "Registro de nacimiento",
    "description": "al conocer un nacimiento se abre la ficha del becerro y se anotan madre si se reconoce, sexo y fecha aproximada, con foto si se tomó.",
    "types": [
      "PROCESS",
      "SOFTWARE"
    ],
    "painPointIds": [
      "PP-REPRO-001",
      "PP-ID-001",
      "PP-DATA-001"
    ],
    "capabilityIds": [
      "CAP-REPRO-001",
      "CAP-ID-001"
    ],
    "capabilityNote": "",
    "howItHelps": "el parto deja de existir solo en la memoria y el becerro tiene identidad antes del arete.",
    "pros": "usa datos que el rancho dijo estar dispuesto a tomar. No exige corral de parto.",
    "cons": "no registra los partos que nadie vio. La fecha puede ser aproximada.",
    "preconditions": "OQ-ID-001 no bloquea anotar lo que sí se vio. Sí impide exigir detección el mismo día.",
    "cost": "low",
    "complexity": "low",
    "operationalFriction": "low",
    "dataReliability": "medium",
    "humanDependency": "high",
    "connectivityDependency": "low",
    "hardwareDependency": "none",
    "scalability": "high",
    "auditability": "medium",
    "currentFeasibility": "high",
    "recommendedNow": "yes",
    "recommendedAtScale": "yes",
    "packageNote": "",
    "rationale": "es el inicio del historial de crecimiento y de la genealogía, con fricción baja. La foto, si existe, entra por SOL-DATA-002.",
    "questionsToValidate": "OQ-ID-001."
  },
  {
    "id": "SOL-REPRO-002",
    "title": "Inferencia de padre por el único toro",
    "description": "si sigue habiendo un solo toro de monta natural, el padre puede quedar inferido, con motivo «único toro presente». La certeza es inferida, nunca observada ni confirmada. La madre usa las mismas tres certezas en el nacimiento: observada, inferida o desconocida.",
    "types": [
      "PROCESS",
      "POLICY"
    ],
    "painPointIds": [
      "PP-REPRO-001"
    ],
    "capabilityIds": [
      "CAP-REPRO-001"
    ],
    "capabilityNote": "",
    "howItHelps": "el parentesco informal queda escrito con su límite.",
    "pros": "no exige otro manejo ni un análisis.",
    "cons": "la inferencia cae si hay otro toro, si el toro no estaba, o si más adelante hay inseminación. Nada de eso está medido.",
    "preconditions": "BR-REPRO-001. Un solo toro.",
    "cost": "low",
    "complexity": "low",
    "operationalFriction": "low",
    "dataReliability": "low",
    "humanDependency": "high",
    "connectivityDependency": "none",
    "hardwareDependency": "none",
    "scalability": "low",
    "auditability": "medium",
    "currentFeasibility": "high",
    "recommendedNow": "yes",
    "recommendedAtScale": "no",
    "packageNote": "deseable. El nacimiento del mínimo puede dejar el padre desconocido.",
    "rationale": "el único toro es un motivo de inferencia, no una paternidad. A escala, con más de un padre posible, esta política no sirve.",
    "questionsToValidate": "OQ-REPRO-001."
  },
  {
    "id": "SOL-REPRO-003",
    "title": "Comparar líneas más adelante",
    "description": "cuando haya nacimientos, pesos y ventas suficientes, comparar resultados entre líneas. Las razas no se nombraron.",
    "types": [
      "SOFTWARE"
    ],
    "painPointIds": [
      "PP-REPRO-001",
      "PP-GROW-001"
    ],
    "capabilityIds": [
      "CAP-REPRO-001",
      "CAP-GROW-001"
    ],
    "capabilityNote": "",
    "howItHelps": "es el uso de largo plazo de la genealogía. No crea los datos.",
    "pros": "no cambia el manejo de hoy.",
    "cons": "con un solo toro y sin razas, la comparación casi no tiene contraste. Presentarla ahora sería vacía.",
    "preconditions": "historia de SOL-REPRO-001 y de pesos. OQ-GEN-001.",
    "cost": "low",
    "complexity": "medium",
    "operationalFriction": "low",
    "dataReliability": "low",
    "humanDependency": "low",
    "connectivityDependency": "low",
    "hardwareDependency": "none",
    "scalability": "high",
    "auditability": "medium",
    "currentFeasibility": "low",
    "recommendedNow": "no",
    "recommendedAtScale": "investigate",
    "packageNote": "",
    "rationale": "el interés es explícito y de largo plazo. El registro de nacimiento es el camino. La comparación no es alcance inicial.",
    "questionsToValidate": "OQ-GEN-001, OQ-REPRO-001."
  },
  {
    "id": "SOL-COMM-001",
    "title": "El propietario asienta lo que ya recibe",
    "description": "teléfono, WhatsApp, foto y audio siguen como canal de campo. El propietario pasa al registro lo que decide conservar. No hay integración con una API.",
    "types": [
      "PROCESS"
    ],
    "painPointIds": [
      "PP-GOV-001",
      "PP-DATA-002",
      "PP-CONN-001"
    ],
    "capabilityIds": [
      "CAP-COMM-001",
      "CAP-DATA-002",
      "CAP-CONN-001"
    ],
    "capabilityNote": "",
    "howItHelps": "respeta BR-ENTRY-001. La evidencia llega sin convertir a los trabajadores en usuarios.",
    "pros": "no cambia el teléfono del trabajador. Tolera que el mensaje salga cuando haya señal.",
    "cons": "el propietario puede volverse el cuello de botella. Si el hábito se abandona, el paquete inicial se cae. A escala ese cuello aprieta más.",
    "preconditions": "CON-ENTRY-001, DQ-HABIT-001.",
    "cost": "low",
    "complexity": "low",
    "operationalFriction": "medium",
    "dataReliability": "medium",
    "humanDependency": "high",
    "connectivityDependency": "low",
    "hardwareDependency": "low",
    "scalability": "low",
    "auditability": "medium",
    "currentFeasibility": "high",
    "recommendedNow": "yes",
    "recommendedAtScale": "investigate",
    "packageNote": "",
    "rationale": "es la única vía de captura alineada con la dirección actual. Se recomienda ahora y no se da por buena para un hato grande. La fricción medium reconoce el trabajo nuevo del propietario.",
    "questionsToValidate": "DQ-HABIT-001."
  },
  {
    "id": "SOL-COMM-002",
    "title": "Aplicación de captura para los trabajadores",
    "description": "los trabajadores registrarían en un aplicativo, en una etapa posterior a la inicial.",
    "types": [
      "SOFTWARE"
    ],
    "painPointIds": [
      "PP-GOV-001",
      "PP-DATA-002"
    ],
    "capabilityIds": [
      "CAP-COMM-001",
      "CAP-CONN-001"
    ],
    "capabilityNote": "",
    "howItHelps": "repartiría la captura si el volumen deja de caber en el propietario.",
    "pros": "los trabajadores viven en el rancho y tienen teléfonos Android. Podría acercar el dato al hecho.",
    "cons": "contradice la dirección inicial. Añade hábito, entrenamiento y un problema de conectividad en el campo que ahora se puede posponer. No está justificada con aproximadamente 21 cabezas.",
    "preconditions": "que SOL-COMM-001 se haya vuelto insuficiente, y OQ-CONN-001.",
    "cost": "medium",
    "complexity": "high",
    "operationalFriction": "medium",
    "dataReliability": "medium",
    "humanDependency": "medium",
    "connectivityDependency": "medium",
    "hardwareDependency": "low",
    "scalability": "high",
    "auditability": "high",
    "currentFeasibility": "low",
    "recommendedNow": "no",
    "recommendedAtScale": "investigate",
    "packageNote": "",
    "rationale": "la propia dirección de producto la deja para después. La complejidad es de adopción en el campo, no una estimación de programación.",
    "questionsToValidate": "DQ-HABIT-001, OQ-CONN-001."
  },
  {
    "id": "SOL-COMM-003",
    "title": "Integración con una API de mensajería",
    "description": "los mensajes entrarían solos al registro desde WhatsApp u otro canal, por una integración. No se diseña.",
    "types": [
      "SOFTWARE",
      "AUTOMATION"
    ],
    "painPointIds": [
      "PP-DATA-002",
      "PP-GOV-001"
    ],
    "capabilityIds": [
      "CAP-COMM-001"
    ],
    "capabilityNote": "",
    "howItHelps": "reduciría el copiado del propietario.",
    "pros": "el canal de campo ya es WhatsApp, entre otros.",
    "cons": "no está requerida. Un mensaje automático seguiría siendo, muchas veces, un dato declarado. Dependencia alta de un tercero y de la red. Puede capturar ruido.",
    "preconditions": "que el copiado manual sea el problema dominante. Hoy ni siquiera existe el registro.",
    "cost": "high",
    "complexity": "high",
    "operationalFriction": "low",
    "dataReliability": "medium",
    "humanDependency": "low",
    "connectivityDependency": "high",
    "hardwareDependency": "none",
    "scalability": "high",
    "auditability": "high",
    "currentFeasibility": "low",
    "recommendedNow": "no",
    "recommendedAtScale": "investigate",
    "packageNote": "",
    "rationale": "el deseo de recibir fotos y audios no implica integrar el canal. SOL-COMM-001 basta para evaluar el hábito.",
    "questionsToValidate": "ninguna hasta que el registro manual exista y se sepa qué mensajes merecen guardarse."
  },
  {
    "id": "SOL-CONN-001",
    "title": "Registrar después, donde el propietario sí tiene conexión",
    "description": "el hecho ocurre en el rancho aunque no haya señal. La foto, el audio o la nota esperan. El propietario completa el registro cuando puede. No se diseña sincronización.",
    "types": [
      "PROCESS"
    ],
    "painPointIds": [
      "PP-CONN-001",
      "PP-GOV-001"
    ],
    "capabilityIds": [
      "CAP-CONN-001",
      "CAP-COMM-001"
    ],
    "capabilityNote": "",
    "howItHelps": "los flujos críticos no exigen red en el potrero.",
    "pros": "coincide con la captura por el propietario. No pide internet de sitio ni una aplicación de campo.",
    "cons": "hay demora entre el hecho y el registro. Un faltante confirmado que no puede comunicarse sigue sin aviso remoto; esta opción no crea magia de señal.",
    "preconditions": "CON-NET-001, CON-NET-002. El propietario necesita conexión en el lugar donde registra, que puede no ser el potrero.",
    "cost": "low",
    "complexity": "low",
    "operationalFriction": "low",
    "dataReliability": "medium",
    "humanDependency": "high",
    "connectivityDependency": "low",
    "hardwareDependency": "none",
    "scalability": "medium",
    "auditability": "medium",
    "currentFeasibility": "high",
    "recommendedNow": "yes",
    "recommendedAtScale": "yes",
    "packageNote": "",
    "rationale": "es la forma actual de tolerar mala cobertura sin diseñar arquitectura. La dependencia low significa que el rancho puede estar sin señal y el registro ocurre después, no que el sistema funcione para siempre sin ninguna red.",
    "questionsToValidate": "OQ-CONN-001, DQ-HABIT-001."
  },
  {
    "id": "SOL-CONN-002",
    "title": "Captura de campo sin conexión y sincronización posterior",
    "description": "una captura hecha en el rancho se completaría sin red y se incorporaría después, evitando perder el dato. El cómo técnico no se diseña. Está nombrado en CON-NET-003 como restricción prevista, no como alcance.",
    "types": [
      "SOFTWARE"
    ],
    "painPointIds": [
      "PP-CONN-001"
    ],
    "capabilityIds": [
      "CAP-CONN-001"
    ],
    "capabilityNote": "",
    "howItHelps": "importaría si los trabajadores capturaran en el campo.",
    "pros": "acerca el registro al momento del hecho cuando la señal falla.",
    "cons": "hoy no hay usuario de campo. Diseñar conflictos, duplicados y sobrescrituras sería arquitectura, y este documento no la hace. La factibilidad se queda baja por eso, no porque la necesidad sea falsa.",
    "preconditions": "SOL-COMM-002 o un equivalente, y OQ-CONN-001.",
    "cost": "high",
    "complexity": "high",
    "operationalFriction": "medium",
    "dataReliability": "medium",
    "humanDependency": "medium",
    "connectivityDependency": "low",
    "hardwareDependency": "low",
    "scalability": "high",
    "auditability": "medium",
    "currentFeasibility": "low",
    "recommendedNow": "investigate",
    "recommendedAtScale": "investigate",
    "packageNote": "",
    "rationale": "se reconoce la restricción y no se adopta el mecanismo. SOL-CONN-001 cubre el ahora.",
    "questionsToValidate": "OQ-CONN-001, OQ-NET-001."
  },
  {
    "id": "SOL-CONN-003",
    "title": "Internet de sitio",
    "description": "una conexión del predio, del tipo que sea. Starlink es un ejemplo dicho en el descubrimiento, no una decisión.",
    "types": [
      "HARDWARE"
    ],
    "painPointIds": [
      "PP-CONN-001"
    ],
    "capabilityIds": [
      "CAP-CONN-001"
    ],
    "capabilityNote": "",
    "howItHelps": "podría facilitar avisos y captura en el sitio. No ordena los datos por existir.",
    "pros": "bajaría la dependencia del celular irregular, si funcionara en ese terreno.",
    "cons": "no está decidido. No sustituye identidad, alimento ni presencia. El costo no se cotizó aquí; la puntuación high no es un precio.",
    "preconditions": "OQ-NET-001.",
    "cost": "high",
    "complexity": "high",
    "operationalFriction": "low",
    "dataReliability": "medium",
    "humanDependency": "low",
    "connectivityDependency": "low",
    "hardwareDependency": "high",
    "scalability": "high",
    "auditability": "low",
    "currentFeasibility": "low",
    "recommendedNow": "no",
    "recommendedAtScale": "investigate",
    "packageNote": "",
    "rationale": "el paquete inicial tiene que servir sin esa obra. Instalar internet no es una recomendación de este diseño.",
    "questionsToValidate": "OQ-NET-001, OQ-CONN-001."
  },
  {
    "id": "SOL-GOV-001",
    "title": "Resumen aproximadamente semanal",
    "description": "una revisión de periodo con identidad, pesos, alimento, egresos, diferencias de bodega y presencia. Los huecos se ven.",
    "types": [
      "PROCESS",
      "SOFTWARE"
    ],
    "painPointIds": [
      "PP-GOV-001"
    ],
    "capabilityIds": [
      "CAP-GOV-001"
    ],
    "capabilityNote": "",
    "howItHelps": "junta lo que hoy llega disperso, en la cadencia que el propietario ya prefiere.",
    "pros": "no añade una ronda de campo. Evita abrir el rancho todos los días para gestión ordinaria.",
    "cons": "si nadie registró, el resumen está vacío. No crea los datos de los otros procesos.",
    "preconditions": "el paquete de registro. BR-CADENCE-001.",
    "cost": "low",
    "complexity": "low",
    "operationalFriction": "low",
    "dataReliability": "medium",
    "humanDependency": "medium",
    "connectivityDependency": "low",
    "hardwareDependency": "none",
    "scalability": "high",
    "auditability": "medium",
    "currentFeasibility": "medium",
    "recommendedNow": "yes",
    "recommendedAtScale": "yes",
    "packageNote": "",
    "rationale": "es la cadencia de gestión, no un tablero comprometido. La factibilidad es medium porque depende de que existan registros. Mostrar el vacío es parte del resultado.",
    "questionsToValidate": "DQ-HABIT-001. Qué cabe en la revisión sin volverla tediosa."
  },
  {
    "id": "SOL-GOV-002",
    "title": "Aviso solo de excepciones críticas",
    "description": "aviso en el momento para un faltante confirmado, un problema grave de un animal, u otra situación que el propietario marque. El resto espera a la semana.",
    "types": [
      "PROCESS",
      "POLICY"
    ],
    "painPointIds": [
      "PP-GOV-001",
      "PP-SEC-001"
    ],
    "capabilityIds": [
      "CAP-GOV-001",
      "CAP-SEC-001"
    ],
    "capabilityNote": "",
    "howItHelps": "separa lo urgente del ruido.",
    "pros": "coincide con BR-CADENCE-001. Un faltante confirmado no espera quince días.",
    "cons": "no hay lista cerrada de problemas graves. Un aviso no sale del rancho si no hay cómo comunicarlo (OQ-CONN-001). La política no detecta el faltante; solo dice qué se hace cuando ya se confirmó.",
    "preconditions": "DQ-GOV-001. Una confirmación humana, no un sensor.",
    "cost": "low",
    "complexity": "low",
    "operationalFriction": "low",
    "dataReliability": "medium",
    "humanDependency": "medium",
    "connectivityDependency": "low",
    "hardwareDependency": "none",
    "scalability": "high",
    "auditability": "medium",
    "currentFeasibility": "high",
    "recommendedNow": "yes",
    "recommendedAtScale": "yes",
    "packageNote": "",
    "rationale": "la política es clara aunque la lista fina no lo sea. No se recomienda un aviso por pesaje, ticket o mensaje.",
    "questionsToValidate": "DQ-GOV-001."
  },
  {
    "id": "SOL-MILK-001",
    "title": "Economía de leche de grupo, solo si se retoma",
    "description": "si volviera la ordeña, registrar producción de grupo, costo e ingreso de esa actividad, aparte de la engorda. No usa el recuerdo de aproximadamente 150 litros ni de 22 vacas.",
    "types": [
      "PROCESS"
    ],
    "painPointIds": [
      "PP-MILK-001"
    ],
    "capabilityIds": [
      "CAP-MILK-001"
    ],
    "capabilityNote": "",
    "howItHelps": "daría la base para decidir si la leche conviene.",
    "pros": "no exige medición por vaca, que sigue sin decidirse.",
    "cons": "no hay operación vigente. La infraestructura requiere mantenimiento y este diseño no lo ordena. La economía histórica detallada está abierta.",
    "preconditions": "una decisión de retomar, que no existe. OQ-MILK-001.",
    "cost": "medium",
    "complexity": "medium",
    "operationalFriction": "medium",
    "dataReliability": "medium",
    "humanDependency": "high",
    "connectivityDependency": "low",
    "hardwareDependency": "medium",
    "scalability": "medium",
    "auditability": "medium",
    "currentFeasibility": "low",
    "recommendedNow": "no",
    "recommendedAtScale": "investigate",
    "packageNote": "",
    "rationale": "condicional. no ahora no es un rechazo de la leche a largo plazo. Es la negativa a meterla en el flujo inicial. El hardware medium reconoce infraestructura existente sin afirmar que sirva.",
    "questionsToValidate": "OQ-MILK-001, OQ-MILK-002."
  },
  {
    "id": "SOL-MILK-002",
    "title": "Medición de leche por vaca",
    "description": "producción atribuida a cada vaca, solo si se retoma la leche y si entonces se decide que el grupo no basta.",
    "types": [
      "PROCESS",
      "HARDWARE"
    ],
    "painPointIds": [
      "PP-MILK-001"
    ],
    "capabilityIds": [
      "CAP-MILK-001"
    ],
    "capabilityNote": "",
    "howItHelps": "permitiría ver diferencias entre vacas. Puede ser útil después. No es requisito inicial ni siquiera del futuro condicional.",
    "pros": "más detalle para comparar animales.",
    "cons": "más manejo, más fricción, y OQ-MILK-002 lo deja sin decidir. Inútil mientras no haya ordeña.",
    "preconditions": "SOL-MILK-001 activo y OQ-MILK-002 respondida.",
    "cost": "medium",
    "complexity": "high",
    "operationalFriction": "high",
    "dataReliability": "high",
    "humanDependency": "high",
    "connectivityDependency": "low",
    "hardwareDependency": "medium",
    "scalability": "high",
    "auditability": "high",
    "currentFeasibility": "low",
    "recommendedNow": "no",
    "recommendedAtScale": "investigate",
    "packageNote": "",
    "rationale": "ni el futuro condicional la da por necesaria. Medir el grupo sería el primer peldaño si la leche volviera.",
    "questionsToValidate": "OQ-MILK-002."
  },
  {
    "id": "SOL-SALE-001",
    "title": "Registrar el ingreso conocido de una venta",
    "description": "una venta deja cantidad o peso si se conoce, precio unitario si aplica, ingreso total conocido, comprador y evidencia si existe. No calcula margen. El mismo evento deja la salida con motivo venta.",
    "types": [
      "PROCESS",
      "SOFTWARE"
    ],
    "painPointIds": [
      "PP-FIN-001"
    ],
    "capabilityIds": [
      "CAP-FIN-001",
      "CAP-LIFE-001"
    ],
    "capabilityNote": "",
    "howItHelps": "el ingreso existe aunque la rentabilidad provisional todavía no se mire.",
    "pros": "el propietario ya cierra la venta. Poca fricción.",
    "cons": "no dice si convino. No traduce el bulto.",
    "preconditions": "BR-SALE-001. OQ-TRADE-001 sigue abierta.",
    "cost": "low",
    "complexity": "low",
    "operationalFriction": "low",
    "dataReliability": "medium",
    "humanDependency": "high",
    "connectivityDependency": "low",
    "hardwareDependency": "none",
    "scalability": "high",
    "auditability": "medium",
    "currentFeasibility": "high",
    "recommendedNow": "yes",
    "recommendedAtScale": "yes",
    "packageNote": "mínimo.",
    "rationale": "sin ingreso no hay lectura económica, ni siquiera provisional. Registrarlo no exige el modelo completo.",
    "questionsToValidate": "OQ-TRADE-001."
  },
  {
    "id": "SOL-LIFE-001",
    "title": "Registrar la salida y conservar la historia",
    "description": "un animal deja de estar activo por venta, muerte, faltante confirmado, otra salida o motivo desconocido. La ficha permanece. Dejar de verlo no es, por sí solo, esta baja.",
    "types": [
      "PROCESS",
      "SOFTWARE"
    ],
    "painPointIds": [
      "PP-SEC-001",
      "PP-DATA-001"
    ],
    "capabilityIds": [
      "CAP-LIFE-001",
      "CAP-SEC-001"
    ],
    "capabilityNote": "",
    "howItHelps": "la lista de activos no se queda con animales que ya salieron, y el historial no se borra.",
    "pros": "no exige saber la regla de reposición.",
    "cons": "un motivo desconocido es honesto y poco útil para el dinero. No calcula compensación.",
    "preconditions": "TGT-ANIMAL-EXIT-001. La venta usa el mismo hecho, no otro trámite.",
    "cost": "low",
    "complexity": "low",
    "operationalFriction": "low",
    "dataReliability": "medium",
    "humanDependency": "high",
    "connectivityDependency": "low",
    "hardwareDependency": "none",
    "scalability": "high",
    "auditability": "medium",
    "currentFeasibility": "high",
    "recommendedNow": "yes",
    "recommendedAtScale": "yes",
    "packageNote": "mínimo.",
    "rationale": "sin salida, la presencia y la economía siguen contando animales que ya no están. OQ-OWN-002 no se interpreta.",
    "questionsToValidate": "DQ-HERD-001, OQ-OWN-002."
  },
  {
    "id": "SOL-LAND-001",
    "title": "Lugar esperado, o desconocido",
    "description": "un animal o un grupo queda en un potrero o lugar, desde una fecha, o queda con lugar desconocido. Sirven los potreros conocidos o identificados, cerca de ocho. No se afirma que ya tengan nombres formales. El diseño objetivo puede asignar después un nombre o identificador interno. No se pide su superficie ni un aparato.",
    "types": [
      "PROCESS"
    ],
    "painPointIds": [
      "PP-SEC-002",
      "PP-FEED-001",
      "PP-GOV-001"
    ],
    "capabilityIds": [
      "CAP-LAND-001",
      "CAP-SEC-001",
      "CAP-FEED-001"
    ],
    "capabilityNote": "",
    "howItHelps": "el grupo de alimento, el conteo y la última observación tienen un dónde, cuando se sabe.",
    "pros": "no exige GPS ni el croquis de las 530 hectáreas.",
    "cons": "un lugar dicho puede estar mal. No verifica que el animal siga ahí.",
    "preconditions": "OQ-LAND-001 puede seguir abierta. Desconocido es válido.",
    "cost": "low",
    "complexity": "low",
    "operationalFriction": "low",
    "dataReliability": "medium",
    "humanDependency": "high",
    "connectivityDependency": "none",
    "hardwareDependency": "none",
    "scalability": "high",
    "auditability": "medium",
    "currentFeasibility": "high",
    "recommendedNow": "yes",
    "recommendedAtScale": "yes",
    "packageNote": "deseable. El mínimo puede dejar el lugar desconocido.",
    "rationale": "el modelo necesita el lugar para no inventar un mapa. Llenarlo el primer día no es requisito.",
    "questionsToValidate": "OQ-LAND-001, OQ-LAND-002."
  }
]
