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
    queHacer: 'Espera quince minutos y vuelve a intentar.',
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
}

const GENERICO: { quePaso: string; queHacer: string } = MENSAJES.error_desconocido ?? {
  quePaso: 'Algo falló.',
  queHacer: 'Vuelve a intentar.',
}

export function mensajeDeError(error: unknown): MensajeDeError {
  if (error instanceof ErrorDeApi) {
    const conocido = MENSAJES[error.codigo]
    if (conocido !== undefined) {
      return { ...conocido, codigo: error.codigo }
    }
    return { ...GENERICO, codigo: error.codigo }
  }

  return { ...GENERICO, codigo: 'error_desconocido' }
}

export function esConflictoDeVersion(error: unknown): boolean {
  return error instanceof ErrorDeApi && error.codigo === 'version_conflict'
}
