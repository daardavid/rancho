import { describe, expect, it } from 'vitest'

import {
  esperarHasta,
  segundosDeEspera,
  type Fallos,
} from '../../src/infrastructure/identity/limite'
import {
  ESPERA_BASE_MS,
  ESPERA_MAXIMA_MS,
  INTENTOS_LIBRES_POR_IP,
  INTENTOS_LIBRES_POR_USUARIO_E_IP,
} from '../../src/infrastructure/identity/parametros'

const ULTIMO = new Date('2026-11-24T06:00:00.000Z')

function fallos(delUsuarioEnEstaDireccion: number, deEstaDireccion: number) {
  return { delUsuarioEnEstaDireccion, deEstaDireccion, ultimoFallo: ULTIMO }
}

/** Lo que falta, en milisegundos, contado desde el último fallo. */
function espera(entrada: Fallos): number | null {
  const hasta = esperarHasta(entrada)
  return hasta === null ? null : hasta.getTime() - ULTIMO.getTime()
}

describe('espera por intentos fallidos', () => {
  it('mientras queden intentos libres no hay que esperar nada', () => {
    expect(espera(fallos(0, 0))).toBeNull()
    expect(espera(fallos(1, 0))).toBeNull()
    expect(espera(fallos(INTENTOS_LIBRES_POR_USUARIO_E_IP - 1, 1))).toBeNull()
    expect(espera(fallos(0, INTENTOS_LIBRES_POR_IP - 1))).toBeNull()
  })

  it('agotados los libres, el siguiente intento espera medio minuto', () => {
    expect(espera(fallos(INTENTOS_LIBRES_POR_USUARIO_E_IP, 1))).toBe(ESPERA_BASE_MS)
    // El tope por IP se comporta igual: una IP que probó muchos nombres espera.
    expect(espera(fallos(0, INTENTOS_LIBRES_POR_IP))).toBe(ESPERA_BASE_MS)
  })

  it('cada fallo de más duplica la espera', () => {
    const base = espera(fallos(INTENTOS_LIBRES_POR_USUARIO_E_IP, 1))
    expect(base).toBe(ESPERA_BASE_MS)
    expect(espera(fallos(INTENTOS_LIBRES_POR_USUARIO_E_IP + 1, 1))).toBe(base! * 2)
    expect(espera(fallos(INTENTOS_LIBRES_POR_USUARIO_E_IP + 2, 1))).toBe(base! * 4)
    expect(espera(fallos(0, INTENTOS_LIBRES_POR_IP + 1))).toBe(ESPERA_BASE_MS * 2)
  })

  it('la espera más larga de las dos señales es la que manda', () => {
    // Cinco usuarios distintos desde la misma IP: la pareja está limpia (0),
    // pero la IP ya agotó su margen. Sin la señal por IP, esto pasaría.
    expect(espera(fallos(0, INTENTOS_LIBRES_POR_IP))).toBe(ESPERA_BASE_MS)
    // Y al revés: la IP va holgada, la pareja es la que topó.
    expect(espera(fallos(INTENTOS_LIBRES_POR_USUARIO_E_IP + 3, 2))).toBe(ESPERA_BASE_MS * 8)
  })

  it('la espera tiene techo: adivinar mucho no es una cadena perpetua', () => {
    expect(espera(fallos(5_000, 5_000))).toBe(ESPERA_MAXIMA_MS)
  })

  it('sin ningún fallo registrado no hay nada que esperar', () => {
    expect(
      esperarHasta({
        delUsuarioEnEstaDireccion: 99,
        deEstaDireccion: 99,
        ultimoFallo: null,
      }),
    ).toBeNull()
  })

  it('los segundos de espera nunca son cero y redondean hacia arriba', () => {
    const hasta = new Date(ULTIMO.getTime() + 1_500)
    expect(segundosDeEspera(hasta, ULTIMO)).toBe(2)
    expect(segundosDeEspera(ULTIMO, ULTIMO)).toBe(1)
    expect(segundosDeEspera(new Date(ULTIMO.getTime() - 60_000), ULTIMO)).toBe(1)
  })
})
