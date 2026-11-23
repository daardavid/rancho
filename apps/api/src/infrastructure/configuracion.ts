/** Lo que el proceso necesita del entorno para arrancar. */
export type Configuracion = {
  readonly databaseUrl: string
  readonly puerto: number
  readonly host: string
  readonly secretoDeSesion: string
  /** Conexiones del pool. 1 cuando la base atiende una sola a la vez. */
  readonly maxConexiones: number
  /** `true` cuando `NODE_ENV=production`: la cookie lleva `Secure` y el nivel de log baja. */
  readonly produccion: boolean
}

const PUERTO_POR_OMISION = 3000
const HOST_POR_OMISION = '127.0.0.1'
const POOL_POR_OMISION = 10

/**
 * El largo mínimo del secreto de sesión.
 *
 * No es una regla del rancho: es un supuesto técnico. Un secreto corto se
 * adivina, y con él se fabrican huellas de token válidas. 32 caracteres deja
 * lugar a un valor de `openssl rand -base64 32` sin obligar a un formato.
 */
export const LARGO_MINIMO_DEL_SECRETO = 32

/**
 * Arma la configuración del proceso y falla con un mensaje que dice qué falta.
 *
 * Las tres variables que importan son `DATABASE_URL`, `PORT` y
 * `SESSION_SECRET`. Las dos primeras deciden a dónde se conecta y en qué
 * puerto escucha; la tercera firma las cookies de sesión. Ninguna tiene un
 * valor de relleno: un proceso de producción que arranca con un secreto
 * inventado es peor que uno que no arranca.
 *
 * `PORT` sí tiene omisión (3000) porque un puerto no es un secreto y el host lo
 * suele fijar. `DATABASE_URL` y `SESSION_SECRET` son obligatorias siempre.
 */
export function cargarConfiguracion(fuente: NodeJS.ProcessEnv = process.env): Configuracion {
  const databaseUrl = exigir(fuente, 'DATABASE_URL', 'sin base no hay rancho que leer ni escribir')

  const secretoDeSesion = exigir(
    fuente,
    'SESSION_SECRET',
    'sin secreto no se pueden firmar las cookies de sesión',
  )
  if (secretoDeSesion.length < LARGO_MINIMO_DEL_SECRETO) {
    throw new Error(
      `SESSION_SECRET tiene ${String(secretoDeSesion.length)} caracteres y necesita al menos ${String(LARGO_MINIMO_DEL_SECRETO)}. Genera uno con «openssl rand -base64 32» y no lo repitas entre instalaciones.`,
    )
  }

  return {
    databaseUrl,
    puerto: leerPuerto(fuente['PORT']),
    host: fuente['HOST'] ?? HOST_POR_OMISION,
    secretoDeSesion,
    maxConexiones: leerMaxConexiones(fuente['DB_POOL']),
    produccion: fuente['NODE_ENV'] === 'production',
  }
}

/**
 * Tamaño del pool. Diez por omisión: un rancho de veintiuna cabezas y dos
 * usuarios no necesita más.
 *
 * Se puede bajar a 1 con `DB_POOL=1`, que es lo que usan las pruebas de punta a
 * punta. El motor embebido atiende una consulta a la vez y multiplexa las
 * conexiones sobre la misma sesión, así que dos consultas simultáneas por
 * conexiones distintas se pisan los parámetros. Un pool de uno las turna y
 * reproduce el comportamiento de un PostgreSQL de verdad.
 */
function leerMaxConexiones(valor: string | undefined): number {
  if (valor === undefined || valor.trim() === '') {
    return POOL_POR_OMISION
  }

  const conexiones = Number(valor)
  if (!Number.isInteger(conexiones) || conexiones <= 0) {
    throw new Error(`DB_POOL tiene que ser un entero mayor que cero: ${valor}`)
  }

  return conexiones
}

function exigir(fuente: NodeJS.ProcessEnv, nombre: string, razon: string): string {
  const valor = fuente[nombre]
  if (valor === undefined || valor.trim() === '') {
    throw new Error(`Falta ${nombre}: ${razon}.`)
  }
  return valor
}

function leerPuerto(valor: string | undefined): number {
  if (valor === undefined || valor.trim() === '') {
    return PUERTO_POR_OMISION
  }

  const puerto = Number(valor)
  if (!Number.isInteger(puerto) || puerto <= 0 || puerto > 65_535) {
    throw new Error(`PORT no es un puerto válido: ${valor}`)
  }

  return puerto
}
