/**
 * Mensajes de error que dicen qué hacer ([UX-17](../../../../../docs/product/ux-principles.md)).
 *
 * El código técnico se queda abajo, en letra chica, para que quien dé soporte
 * pueda cruzarlo con el log. La frase de arriba es la que el dueño lee.
 */

import { ErrorDeApi } from '../api/http'

export type MensajeDeError = {
  readonly quePaso: string
  readonly queHacer: string
  readonly codigo: string
}

const MENSAJES: Record<string, { quePaso: string; queHacer: string }> = {
  sin_conexion: {
    quePaso: 'No hay conexión con el rancho.',
    queHacer: 'Revisa la señal del celular y vuelve a intentar. Lo que escribiste no se perdió.',
  },
  respuesta_invalida: {
    quePaso: 'El servicio contestó algo que esta pantalla no entiende.',
    queHacer: 'Vuelve a intentar. Si sigue igual, avísale a quien te da soporte.',
  },
  credenciales_invalidas: {
    quePaso: 'El usuario o la contraseña no coinciden.',
    queHacer: 'Revísalos y vuelve a escribir la contraseña.',
  },
  demasiados_intentos: {
    quePaso: 'Hubo varios intentos fallidos seguidos.',
    queHacer: 'Espera un momento y vuelve a intentar. Los intentos buenos no se bloquean para siempre.',
  },
  no_autenticado: {
    quePaso: 'La sesión venció.',
    queHacer: 'Vuelve a entrar. Regresarás a la misma pantalla.',
  },
  prohibido: {
    quePaso: 'Esta cuenta no puede hacer eso.',
    queHacer: 'Entra con la cuenta del propietario.',
  },
  cuerpo_invalido: {
    quePaso: 'Algún dato no tiene el formato que se esperaba.',
    queHacer: 'Revisa lo que escribiste y vuelve a guardar.',
  },
  no_encontrado: {
    quePaso: 'Ese animal ya no aparece en el rancho.',
    queHacer: 'Regresa al hato y ábrelo otra vez.',
  },
  version_conflict: {
    quePaso: 'Alguien más cambió esta ficha mientras la tenías abierta.',
    queHacer: 'Recarga la ficha para ver lo último antes de guardar tu corrección.',
  },
  idempotency_mismatch: {
    quePaso: 'Este envío ya se había usado con otros datos.',
    queHacer: 'Vuelve a intentar: la pantalla manda un envío nuevo.',
  },
  correccion_vacia: {
    quePaso: 'No cambiaste nada.',
    queHacer: 'Cambia al menos un dato antes de guardar la corrección.',
  },
  motivo_vacio: {
    quePaso: 'Falta decir por qué se corrige.',
    queHacer: 'Escribe el motivo. Sirve para entender después qué pasó.',
  },
  texto_invalido: {
    quePaso: 'Un texto está vacío o es demasiado largo.',
    queHacer: 'Acórtalo o déjalo como «No sé».',
  },
  dia_invalido: {
    quePaso: 'La fecha no existe.',
    queHacer: 'Escoge otra fecha.',
  },
  filiacion_incoherente: {
    quePaso: 'La madre o el padre no cuadran con lo que se dijo.',
    queHacer: 'Revisa la certeza. Si es «No sé», no elijas un animal. Único toro no se marca como seguro.',
  },
  progenitor_ausente: {
    quePaso: 'Esa madre o ese padre no está en el hato.',
    queHacer: 'Elige un animal de la lista, o déjalo en «No sé».',
  },
  tenencia_de_cria: {
    quePaso: 'La madre está a la parte y el reparto de la cría no está definido.',
    queHacer: 'La cría se guarda con tenencia «No sé». No elijas otra.',
  },
  unico_toro_no_aplica: {
    quePaso: 'No hay un solo toro activo para inferir al padre.',
    queHacer: 'Deja al padre en «No sé». Único toro no se anota como seguro.',
  },
  filiacion_ya_existe: {
    quePaso: 'Ese nacimiento ya estaba anotado.',
    queHacer: 'Abre la ficha de la cría. La filiación se corrige ahí, sin dar de alta otro animal.',
  },
  categoria_incoherente: {
    quePaso: 'El texto libre solo acompaña a «Otra» categoría.',
    queHacer: 'Escoge «Otra» o borra el detalle.',
  },
  animal_ya_existe: {
    quePaso: 'Ese animal ya se había registrado.',
    queHacer: 'Regresa al hato y ábrelo desde la lista.',
  },
  marca_ya_existe: {
    quePaso: 'Ese arete ya está en esta ficha.',
    queHacer: 'Revisa los aretes del animal.',
  },
  marca_siniiga_duplicada: {
    quePaso: 'Ese arete SINIIGA ya lo tiene otro animal.',
    queHacer: 'Busca ese arete en el hato antes de guardarlo.',
  },
  marca_no_activa: {
    quePaso: 'Ese arete ya no está puesto.',
    queHacer: 'Recarga la ficha para ver los aretes vigentes.',
  },
  marca_invalida: {
    quePaso: 'El arete viene vacío.',
    queHacer: 'Escribe el número del arete.',
  },
  error_desconocido: {
    quePaso: 'Algo falló y no sabemos exactamente qué.',
    queHacer: 'Vuelve a intentar. Si se repite, avísale a quien te da soporte.',
  },
  animal_repetido: {
    quePaso: 'Un animal aparece dos veces en esta vuelta.',
    queHacer: 'Deja una sola vez a cada animal y vuelve a guardar.',
  },
  fila_repetida: {
    quePaso: 'Un renglón de la vuelta se repitió.',
    queHacer: 'Vuelve a abrir la pantalla del pesaje y captura de nuevo.',
  },
  peso_sin_calidad: {
    quePaso: 'Falta decir cómo se obtuvo un peso.',
    queHacer: 'Escoge «medido en la báscula», «visto, no medido» o «me lo dijeron».',
  },
  peso_invalido: {
    quePaso: 'Un peso no se pudo leer.',
    queHacer: 'Escríbelo en kilos, con punto y hasta 3 decimales. Por ejemplo 351.5',
  },
  animal_ausente: {
    quePaso: 'Un animal de esta vuelta ya no existe en el rancho.',
    queHacer: 'Quítalo de la vuelta y vuelve a guardar.',
  },
  animal_inactivo: {
    quePaso: 'Un animal de esta vuelta ya está dado de baja.',
    queHacer: 'Quítalo de la vuelta y vuelve a guardar.',
  },
  no_es_peso: {
    quePaso: 'Ese renglón no es un peso, es un «no se pesó».',
    queHacer: 'Abre la sesión de nuevo y corrige el renglón que sí se pesó.',
  },
  sesion_ya_existe: {
    quePaso: 'Esta vuelta ya estaba guardada.',
    queHacer: 'Abre la sesión guardada en vez de capturarla otra vez.',
  },
  fila_ya_existe: {
    quePaso: 'Uno de los renglones ya estaba guardado en esta vuelta.',
    queHacer: 'Abre la sesión guardada para revisarla.',
  },
  evidencia_ajena: {
    quePaso: 'Esa foto no se puede usar aquí.',
    queHacer: 'Tómala otra vez desde esta pantalla.',
  },
  ya_inactivo: {
    quePaso: 'Este animal ya está dado de baja.',
    queHacer: 'Si la salida está mal, corrígela. No se anota otra encima.',
  },
  sin_salida: {
    quePaso: 'Este animal sigue en el hato.',
    queHacer: 'La salida se corrige cuando ya se dio de baja.',
  },
  salida_incoherente: {
    quePaso: 'Volver al hato no cambia a la vez el motivo de la salida.',
    queHacer: 'Elige una sola cosa: corregir la salida, o dejarlo activo otra vez.',
  },
  foto_no_es_imagen: {
    quePaso: 'Eso no es una foto JPEG, PNG o WebP.',
    queHacer: 'Toma la foto del indicador con la cámara del celular.',
  },
  foto_demasiado_grande: {
    quePaso: 'La foto pesa más de 25 MB.',
    queHacer: 'Toma otra más cerca del indicador.',
  },
  foto_vacia: {
    quePaso: 'La foto llegó vacía.',
    queHacer: 'Tómala otra vez.',
  },
}

const GENERICO: { quePaso: string; queHacer: string } = MENSAJES.error_desconocido ?? {
  quePaso: 'Algo falló.',
  queHacer: 'Vuelve a intentar.',
}

export function mensajeDeError(error: unknown): MensajeDeError {
  if (error instanceof ErrorDeApi) {
    const conocido = MENSAJES[error.codigo]
    if (conocido !== undefined) {
      const queHacer =
        error.codigo === 'demasiados_intentos' && error.segundos !== null
          ? esperaEnPalabras(error.segundos)
          : conocido.queHacer
      return { quePaso: conocido.quePaso, queHacer, codigo: error.codigo }
    }
    return { ...GENERICO, codigo: error.codigo }
  }

  return { ...GENERICO, codigo: 'error_desconocido' }
}

/**
 * Cuánto esperar, dicho como se dice en el rancho.
 *
 * La API manda los segundos que le faltan; la pantalla no inventa un plazo. Si
 * la espera es de minutos se redondea hacia arriba, para no prometer un momento
 * en el que todavía no se puede.
 */
function esperaEnPalabras(segundos: number): string {
  // Solo hasta medio minuto se dice «medio minuto»: prometerlo con 45 o 55
  // segundos por delante sería mentir y la API todavía devolvería 429.
  if (segundos <= 30) {
    return 'Espera medio minuto y vuelve a intentar.'
  }
  const minutos = Math.ceil(segundos / 60)
  return minutos === 1
    ? 'Espera un minuto y vuelve a intentar.'
    : `Espera ${String(minutos)} minutos y vuelve a intentar.`
}

export function esConflictoDeVersion(error: unknown): boolean {
  return error instanceof ErrorDeApi && error.codigo === 'version_conflict'
}
