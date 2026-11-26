import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'

import { crearCuenta } from '../../src/infrastructure/identity/cuentas'
import { iniciarSesion, resolverSesion } from '../../src/infrastructure/identity/sesiones'
import { INTENTOS_LIBRES_POR_USUARIO_E_IP } from '../../src/infrastructure/identity/parametros'
import { abrirBaseLocal, prepararInstalacionLocal } from '../../src/infrastructure/local/base'
import { ejecutarContrasena } from '../../src/infrastructure/local/cli-contrasena'
import { cambiarContrasenaDeCuenta, cuentaParaCambiar } from '../../src/infrastructure/local/contrasena'

const SECRETO = 'b'.repeat(32)
const VIEJA = 'contrasena-de-prueba'
const NUEVA = 'contrasena-nueva-local'
const USUARIO = 'soporte-local'
const DUENO = 'propietario-prueba'
const IP = '127.0.0.1'
const AHORA = new Date('2026-11-25T18:00:00.000Z')

describe('elegir la cuenta', () => {
  it('con una no pregunta y con varias exige el usuario', () => {
    expect(cuentaParaCambiar([{ usuario: USUARIO }], null)).toBe(USUARIO)
    expect(cuentaParaCambiar([{ usuario: USUARIO }, { usuario: DUENO }], DUENO)).toBe(DUENO)
    expect(() => cuentaParaCambiar([], null)).toThrow(/No hay cuentas/)
    expect(() => cuentaParaCambiar([{ usuario: USUARIO }, { usuario: DUENO }], 'nadie')).toThrow(
      /No se cambió ninguna contraseña/,
    )
  })
})

describe('npm run contrasena', () => {
  const temporales: string[] = []
  const nodeEnvAnterior = process.env['NODE_ENV']

  afterEach(() => {
    if (nodeEnvAnterior === undefined) {
      delete process.env['NODE_ENV']
    } else {
      process.env['NODE_ENV'] = nodeEnvAnterior
    }
    for (const dir of temporales.splice(0)) {
      rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
    }
  })

  it('se niega con NODE_ENV=production y no pide la contraseña', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rancho-clave-prod-'))
    temporales.push(dir)
    writeFileSync(join(dir, '.env'), 'NODE_ENV=production\n', 'utf8')
    let pidio = false
    await expect(
      ejecutarContrasena({
        raiz: dir,
        leerClave: () => {
          pidio = true
          return Promise.resolve(NUEVA)
        },
      }),
    ).rejects.toThrow(/production/)
    expect(pidio).toBe(false)
  })

  it('se niega si el proceso está en production aunque el archivo no', async () => {
    process.env['NODE_ENV'] = 'production'
    const dir = mkdtempSync(join(tmpdir(), 'rancho-clave-proceso-'))
    temporales.push(dir)
    writeFileSync(join(dir, '.env'), 'RANCH_NAME=Rancho de prueba\n', 'utf8')
    await expect(ejecutarContrasena({ raiz: dir })).rejects.toThrow(/production/)
  })

  it('la nueva entra, la vieja no, cierra sus sesiones y quita el bloqueo', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rancho-clave-'))
    temporales.push(dir)
    writeFileSync(
      join(dir, '.env'),
      `SESSION_SECRET=${SECRETO}\nRANCH_NAME=Rancho de prueba\n`,
      'utf8',
    )
    const datos = join(dir, '.datos', 'pglite')

    const base = await abrirBaseLocal(datos)
    let token = ''
    let tokenDueno = ''
    try {
      await prepararInstalacionLocal(base.db, {
        nombreDelRancho: 'Rancho de prueba',
        pedirCuenta: async () => ({ usuario: USUARIO, contrasena: VIEJA }),
      })
      await crearCuenta(base.db, { rol: 'owner', usuario: DUENO, contrasena: VIEJA })

      const abierta = await iniciarSesion(
        base.db,
        SECRETO,
        { usuario: USUARIO, contrasena: VIEJA },
        '192.0.2.20',
        AHORA,
      )
      const dueno = await iniciarSesion(
        base.db,
        SECRETO,
        { usuario: DUENO, contrasena: VIEJA },
        '192.0.2.21',
        AHORA,
      )
      expect(abierta.tipo).toBe('ok')
      expect(dueno.tipo).toBe('ok')
      if (abierta.tipo !== 'ok' || dueno.tipo !== 'ok') {
        throw new Error('La sesión de prueba no abrió.')
      }
      token = abierta.token
      tokenDueno = dueno.token

      for (let intento = 0; intento < INTENTOS_LIBRES_POR_USUARIO_E_IP; intento += 1) {
        const fallo = await iniciarSesion(
          base.db,
          SECRETO,
          { usuario: USUARIO, contrasena: 'clave-incorrecta' },
          IP,
          AHORA,
        )
        expect(fallo.tipo).toBe('credenciales_invalidas')
      }
      const bloqueado = await iniciarSesion(
        base.db,
        SECRETO,
        { usuario: USUARIO, contrasena: VIEJA },
        IP,
        AHORA,
      )
      expect(bloqueado.tipo).toBe('esperar')

      await expect(cambiarContrasenaDeCuenta(base.db, USUARIO, 'corta')).rejects.toThrow(/al menos/)
      expect(await resolverSesion(base.db, SECRETO, token, AHORA)).not.toBeNull()
    } finally {
      await base.cerrar()
    }

    const lineas: string[] = []
    await ejecutarContrasena({
      raiz: dir,
      anunciar: (linea) => {
        lineas.push(linea)
      },
      elegirUsuario: async (cuentas) => {
        expect(cuentas.map((cuenta) => cuenta.usuario)).toEqual([USUARIO, DUENO])
        return USUARIO
      },
      leerClave: async () => NUEVA,
    })
    const texto = lineas.join('\n')
    expect(texto).toContain(`usuario ${USUARIO}`)
    expect(texto).not.toContain(NUEVA)
    expect(texto).not.toContain(VIEJA)
    expect(texto).not.toContain('$argon2')

    const despues = await abrirBaseLocal(datos)
    try {
      expect(await resolverSesion(despues.db, SECRETO, token, AHORA)).toBeNull()
      expect(await resolverSesion(despues.db, SECRETO, tokenDueno, AHORA)).not.toBeNull()

      const conLaNueva = await iniciarSesion(
        despues.db,
        SECRETO,
        { usuario: USUARIO, contrasena: NUEVA },
        IP,
        AHORA,
      )
      expect(conLaNueva.tipo).toBe('ok')

      const conLaVieja = await iniciarSesion(
        despues.db,
        SECRETO,
        { usuario: USUARIO, contrasena: VIEJA },
        '192.0.2.30',
        AHORA,
      )
      expect(conLaVieja.tipo).toBe('credenciales_invalidas')

      const duenoSigue = await iniciarSesion(
        despues.db,
        SECRETO,
        { usuario: DUENO, contrasena: VIEJA },
        '192.0.2.31',
        AHORA,
      )
      expect(duenoSigue.tipo).toBe('ok')
    } finally {
      await despues.cerrar()
    }
  }, 90_000)
})
