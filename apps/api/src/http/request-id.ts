/**
 * Los identificadores de petición vienen del cliente cuando el cliente es un
 * proxy de confianza, y del servidor cuando no. Nunca se copia un valor
 * arbitrario al log: se acepta solo un UUID, para que nadie pueda inyectar texto
 * en las líneas de Pino.
 */

const PATRON_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function idDePeticion(cabecera: string | string[] | undefined): string {
  const candidato = Array.isArray(cabecera) ? cabecera[0] : cabecera

  if (typeof candidato === 'string' && PATRON_UUID.test(candidato)) {
    return candidato.toLowerCase()
  }

  return crypto.randomUUID()
}
