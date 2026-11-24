import { sql } from 'drizzle-orm'
import { Readable } from 'node:stream'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { NoSePudoCrearLaCuenta, crearCuenta } from '../../src/infrastructure/identity/cuentas'
import { esEntradaDirecta, leerArgumentos, leerContrasena } from '../../src/infrastructure/identity/cli-cuenta'
import { filasDe } from '../../src/infrastructure/db/filas'
import { sembrarRancho } from '../../src/infrastructure/db/semilla'
import { nuevoId } from '../../src/shared-kernel/ids'
import { abrirBaseDePruebas } from '../db/base-de-pruebas'

const CONTRASENA = 'contrasena-de-prueba'

describe('argumentos y contraseña del comando cuenta:crear', () => {
  it('lee --rol y --usuario', () => {
    expect(leerArgumentos(['--rol', 'owner', '--usuario', 'propietario'])).toEqual({
      rol: 'owner',
      usuario: 'propietario',
    })
  })

  it('rechaza una bandera desconocida y un valor que falta', () => {
    expect(() => leerArgumentos(['--correo', 'a@b.c'])).toThrow(/No reconozco/)
    expect(() => leerArgumentos(['--rol'])).toThrow(/--rol/)
    expect(() => leerArgumentos(['--usuario', 'propietario'])).toThrow(/Uso:/)
  })

  it('lee la contraseña de la entrada estándar sin pedirle nada a una terminal', async () => {
    const entrada = Readable.from(['contrasena-de-prueba\n'])
    await expect(leerContrasena(entrada, process.stdout)).resolves.toBe('contrasena-de-prueba')
  })

  it('no arranca el comando cuando el archivo se importa desde las pruebas', () => {
    expect(esEntradaDirecta(import.meta.url, process.argv[1])).toBe(false)
  })
})

describe('crearCuenta', () => {
  let db: Awaited<ReturnType<typeof abrirBaseDePruebas>>['db']
  let cerrar: () => Promise<void> = async () => {}

  beforeAll(async () => {
    const base = await abrirBaseDePruebas()
    db = base.db
    cerrar = base.cerrar
    await sembrarRancho(db, 'Rancho de prueba')
  })

  afterAll(async () => {
    await cerrar()
  })

  it('no inventa un rancho si la semilla no corrió', async () => {
    const vacia = await abrirBaseDePruebas()
    try {
      await expect(
        crearCuenta(vacia.db, { rol: 'owner', usuario: 'propietario', contrasena: CONTRASENA }),
      ).rejects.toBeInstanceOf(NoSePudoCrearLaCuenta)
      await expect(
        crearCuenta(vacia.db, { rol: 'owner', usuario: 'propietario', contrasena: CONTRASENA }),
      ).rejects.toMatchObject({ motivo: 'sin_rancho' })
    } finally {
      await vacia.cerrar()
    }
  })

  it('guarda la cuenta del rancho sembrado con un hash de la librería, no la contraseña', async () => {
    const sembrado = await sembrarRancho(db, 'Rancho de prueba')
    const cuenta = await crearCuenta(db, {
      rol: 'owner',
      usuario: 'propietario-prueba',
      contrasena: CONTRASENA,
    })

    expect(cuenta.rol).toBe('owner')
    expect(cuenta.ranchId).toBe(sembrado.id)

    const filas = filasDe<{ password_hash: string; rol: string; ranch_id: string }>(
      await db.execute(sql`
        SELECT password_hash, rol, ranch_id
        FROM identity.account
        WHERE id = ${cuenta.id}
      `),
    )
    expect(filas[0]?.ranch_id).toBe(sembrado.id)
    expect(filas[0]?.rol).toBe('owner')
    expect(filas[0]?.password_hash.startsWith('$argon2id$')).toBe(true)
    expect(filas[0]?.password_hash).not.toContain(CONTRASENA)
  })

  it('no cambia la contraseña si el usuario ya existe', async () => {
    const antes = filasDe<{ password_hash: string }>(
      await db.execute(sql`
        SELECT password_hash FROM identity.account WHERE usuario = 'propietario-prueba'
      `),
    )

    await expect(
      crearCuenta(db, {
        rol: 'owner',
        usuario: 'propietario-prueba',
        contrasena: 'otra-contrasena-distinta',
      }),
    ).rejects.toMatchObject({ motivo: 'usuario_duplicado' })

    const despues = filasDe<{ password_hash: string }>(
      await db.execute(sql`
        SELECT password_hash FROM identity.account WHERE usuario = 'propietario-prueba'
      `),
    )
    expect(despues).toEqual(antes)
  })

  it('rechaza un rol reservado y una contraseña corta', async () => {
    await expect(
      crearCuenta(db, { rol: 'worker', usuario: 'trabajador', contrasena: CONTRASENA }),
    ).rejects.toMatchObject({ motivo: 'rol_no_permitido' })
    await expect(
      crearCuenta(db, { rol: 'owner', usuario: 'corta', contrasena: 'corta' }),
    ).rejects.toMatchObject({ motivo: 'contrasena_corta' })
  })

  it('la base también niega un rol que no sea owner o support', async () => {
    const ranchos = filasDe<{ id: string }>(
      await db.execute(sql`SELECT id FROM identity.ranch LIMIT 1`),
    )
    const ranchId = ranchos[0]?.id
    expect(ranchId).toBeDefined()

    let texto = ''
    try {
      await db.execute(sql`
        INSERT INTO identity.account (id, ranch_id, usuario, password_hash, rol, created_at)
        VALUES (${nuevoId()}, ${ranchId}, 'trabajador-prueba', 'no-es-un-hash', 'worker', ${new Date()})
      `)
    } catch (error) {
      texto = cadenaDe(error)
    }

    expect(texto).toMatch(/account_rol_valido|check constraint/i)
  })
})

function cadenaDe(error: unknown): string {
  const partes: string[] = []
  const vistos = new Set<unknown>()
  let actual: unknown = error
  while (typeof actual === 'object' && actual !== null && !vistos.has(actual)) {
    vistos.add(actual)
    partes.push(actual instanceof Error ? `${actual.name}: ${actual.message}` : String(actual))
    actual = 'cause' in actual ? actual.cause : undefined
  }
  return partes.join('\n')
}
