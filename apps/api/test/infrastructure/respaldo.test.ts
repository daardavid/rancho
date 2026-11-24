import { randomUUID } from 'node:crypto'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { PassThrough } from 'node:stream'

import { PGlite } from '@electric-sql/pglite'
import { sql } from 'drizzle-orm'
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres'
import { drizzle as drizzlePglite, type PgliteDatabase } from 'drizzle-orm/pglite'
import { Client, Pool } from 'pg'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'

import { filasDe, type EjecutorSql } from '../../src/infrastructure/db/filas'
import { aplicarMigraciones } from '../../src/infrastructure/db/migrar'
import { sembrarRancho } from '../../src/infrastructure/db/semilla'
import { crearPuertoDeEvidencia } from '../../src/infrastructure/evidence/puerto'
import { crearCuenta } from '../../src/infrastructure/identity/cuentas'
import { abrirBaseLocal, exponerBaseLocal } from '../../src/infrastructure/local/base'
import { preguntar } from '../../src/infrastructure/local/cli-restaurar'
import {
  afirmarRespaldoPermitido,
  aplicarRespaldo,
  confirmarRestauracion,
  esRespaldoSql,
  leerArchivoDeRestauracion,
  nombreDeRespaldo,
  respaldarBaseLocal,
  resolverArchivoDeRestauracion,
  restaurarBaseLocal,
  volcarSql,
} from '../../src/infrastructure/local/respaldo'
import { crearGrowth } from '../../src/modules/growth'
import { crearHerd } from '../../src/modules/herd'
import { recordedBySchema } from '../../src/shared-kernel/actores'
import { nuevoId, ranchIdSchema, type RanchId } from '../../src/shared-kernel/ids'

const CONTRASENA = 'contrasena-de-prueba'
const ARETE = 'PRUEBA-R13-0001'

describe('el comando se niega fuera de su lugar', () => {
  it('no corre en producción, ni por el proceso ni por el archivo', () => {
    expect(() => afirmarRespaldoPermitido('production')).toThrow(/production/)
    expect(() => afirmarRespaldoPermitido(undefined, 'production')).toThrow(/production/)
    expect(() => afirmarRespaldoPermitido('test', undefined)).not.toThrow()
  })

  it('la confirmación es la palabra RESTAURAR', () => {
    expect(confirmarRestauracion('RESTAURAR')).toBe(true)
    expect(confirmarRestauracion('  RESTAURAR  ')).toBe(true)
    expect(confirmarRestauracion('restaurar')).toBe(false)
    expect(confirmarRestauracion('sí')).toBe(false)
    expect(confirmarRestauracion('')).toBe(false)
  })

  it('restaurar pide un solo archivo', () => {
    expect(leerArchivoDeRestauracion(['respaldos/rancho.sql'])).toBe('respaldos/rancho.sql')
    expect(() => leerArchivoDeRestauracion([])).toThrow(/Uso:/)
    expect(() => leerArchivoDeRestauracion(['a.sql', 'b.sql'])).toThrow(/Uso:/)
    expect(() => leerArchivoDeRestauracion(['--forzar'])).toThrow(/Uso:/)
  })

  it('una ruta relativa se resuelve desde la carpeta donde se invocó npm', () => {
    const raiz = resolve('/rancho')
    const api = join(raiz, 'apps', 'api')
    const previo = process.env['INIT_CWD']
    try {
      process.env['INIT_CWD'] = raiz
      expect(resolverArchivoDeRestauracion('respaldos/rancho.sql', undefined, api)).toBe(
        resolve(raiz, 'respaldos/rancho.sql'),
      )
      delete process.env['INIT_CWD']
      expect(resolverArchivoDeRestauracion('respaldos/rancho.sql', undefined, api)).toBe(
        resolve(api, 'respaldos/rancho.sql'),
      )
      expect(resolverArchivoDeRestauracion('respaldos/rancho.sql', '', api)).toBe(
        resolve(api, 'respaldos/rancho.sql'),
      )
      const absoluto = resolve(raiz, 'respaldos', 'rancho.sql')
      expect(resolverArchivoDeRestauracion(absoluto, raiz, api)).toBe(absoluto)
    } finally {
      if (previo === undefined) {
        delete process.env['INIT_CWD']
      } else {
        process.env['INIT_CWD'] = previo
      }
    }
  })

  it('la pregunta pausa la entrada para que el comando termine', async () => {
    const entrada = new PassThrough()
    const salida = new PassThrough()
    const promesa = preguntar(entrada, salida, 'Para seguir, escribe RESTAURAR y pulsa Enter: ')
    entrada.write('RESTAURAR\n')
    await expect(promesa).resolves.toBe('RESTAURAR')
    expect(entrada.isPaused()).toBe(true)
    entrada.destroy()
    salida.destroy()
  })

  it('el nombre lleva la hora del rancho y no usa dos puntos', () => {
    const nombre = nombreDeRespaldo(new Date('2026-11-24T05:41:14.120Z'))
    expect(nombre).toBe('rancho-2026-11-23-234114-120.sql')
    expect(nombre.includes(':')).toBe(false)
  })

  it('un texto que no es pg_dump no cuenta como respaldo', () => {
    expect(esRespaldoSql('-- PostgreSQL database dump\nCREATE TABLE herd.animal (id uuid);\n')).toBe(
      true,
    )
    expect(esRespaldoSql('hola')).toBe(false)
  })
})

type Foto = Record<string, Array<Record<string, string | null>>>

const TABLAS: ReadonlyArray<readonly [string, string, string]> = [
  ['drizzle', '__drizzle_migrations', 'id'],
  ['identity', 'ranch', 'id'],
  ['identity', 'account', 'id'],
  ['identity', 'session', 'id'],
  ['identity', 'login_attempt', 'id'],
  ['herd', 'animal', 'id'],
  ['herd', 'animal_correction', 'id'],
  ['herd', 'animal_mark', 'id'],
  ['growth', 'weighing_session', 'id'],
  ['growth', 'weighing_line', 'id'],
  ['growth', 'weight_correction', 'id'],
  ['evidence', 'file', 'id'],
  ['public', 'command_idempotency', 'command_id'],
]

describe('ida y vuelta del respaldo', () => {
  let origen: PGlite
  let db: PgliteDatabase<Record<string, never>>
  let fotoOriginal: Foto
  let sqlTexto: string
  let ranchId: RanchId
  let animalPesado: string
  let fotoId: string
  let carpetaDeFotos = ''
  let cerrarOrigen: () => Promise<void> = async () => {}

  beforeAll(async () => {
    origen = new PGlite()
    await origen.waitReady
    db = drizzlePglite(origen)
    await aplicarMigraciones(db)
    const sembrado = await sembrarRancho(db, 'Rancho de prueba')
    ranchId = ranchIdSchema.parse(sembrado.id)
    const owner = await crearCuenta(db, {
      rol: 'owner',
      usuario: 'propietario-r13',
      contrasena: CONTRASENA,
    })
    await crearCuenta(db, {
      rol: 'support',
      usuario: 'apoyo-r13',
      contrasena: CONTRASENA,
    })
    const recordedBy = recordedBySchema.parse(owner.id)
    const herd = crearHerd(db)
    animalPesado = nuevoId()
    const animalHueco = nuevoId()
    await herd.registrar({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      id: animalPesado,
      nombre: 'Becerro de prueba',
      sexo: 'male',
      categoria: 'calf',
      tenencia: 'a_la_parte',
      participacionEconomica: 'unknown',
      notaDelArreglo: 'acuerdo de palabra, sin porcentaje',
    })
    await herd.corregir({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      animalId: animalPesado,
      version: 1,
      motivo: 'la seña estaba mal',
      cambios: { nombre: 'Becerro corregido' },
    })
    await herd.agregarMarca({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      animalId: animalPesado,
      marcaId: nuevoId(),
      tipo: 'siniiga',
      valor: ARETE,
      desde: '2026-03-01',
    })
    await herd.registrar({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      id: animalHueco,
      sexo: 'female',
      categoria: 'calf',
    })

    carpetaDeFotos = mkdtempSync(join(tmpdir(), 'rancho-respaldo-foto-'))
    const evidencia = crearPuertoDeEvidencia(db, carpetaDeFotos)
    const foto = await evidencia.guardar({
      ranchId,
      bytes: Uint8Array.from([0xff, 0xd8, 0xff, 0xd9]),
      nombreOriginal: 'indicador.jpg',
    })
    fotoId = foto.id

    const growth = crearGrowth(db, herd, evidencia)
    const pesoId = nuevoId()
    await growth.registrar({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      id: nuevoId(),
      fecha: '2026-04-03',
      nota: 'manga de prueba',
      reportedBy: 'trabajador de prueba',
      filas: [
        {
          id: pesoId,
          animalId: animalPesado,
          resultado: 'pesado',
          kilos: '351.125',
          calidad: 'measured',
          evidenciaId: foto.id,
        },
        { id: nuevoId(), animalId: animalHueco, resultado: 'hueco' },
      ],
    })
    await growth.corregir({
      commandId: nuevoId(),
      ranchId,
      recordedBy,
      pesoId,
      version: 1,
      motivo: 'leí de más',
      kilos: '350.000',
    })

    fotoOriginal = await fotoDe(db)
    sqlTexto = await volcarSql(origen)
    expect(await fotoDe(db)).toEqual(fotoOriginal)
    cerrarOrigen = () => origen.close()
  }, 180_000)

  afterAll(async () => {
    await cerrarOrigen()
    if (carpetaDeFotos !== '') {
      rmSync(carpetaDeFotos, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 })
    }
  })

  it('una base vacía queda con los mismos datos, versiones e historias', async () => {
    const vacia = new PGlite()
    await vacia.waitReady
    try {
      await aplicarRespaldo(vacia, sqlTexto)
      const restaurada = drizzlePglite(vacia)
      expect(await fotoDe(restaurada)).toEqual(fotoOriginal)

      const herd = crearHerd(restaurada)
      const ficha = await herd.obtener(ranchId, animalPesado)
      expect(ficha?.version).toBe(2)
      expect(ficha?.nombre).toBe('Becerro corregido')
      expect(ficha?.tenencia).toBe('a_la_parte')
      expect(ficha?.participacionEconomica).toBe('unknown')
      expect(ficha?.correcciones).toEqual([
        expect.objectContaining({
          campo: 'nombre',
          valorAnterior: 'Becerro de prueba',
          motivo: 'la seña estaba mal',
        }),
      ])
      expect(ficha?.marcas).toEqual([
        expect.objectContaining({ tipo: 'siniiga', valor: ARETE, estado: 'active' }),
      ])

      const pesos = await crearGrowth(restaurada, herd).pesosDe(ranchId, animalPesado)
      expect(pesos.pesos).toEqual([
        expect.objectContaining({
          version: 2,
          kilos: '350.000',
          calidad: 'measured',
          evidenciaId: fotoId,
          correcciones: [
            expect.objectContaining({ campo: 'kilos', valorAnterior: '351.125', motivo: 'leí de más' }),
          ],
        }),
      ])

      const cuentas = filasDe<{ usuario: string; rol: string; password_hash: string }>(
        await restaurada.execute(sql`
          SELECT usuario, rol, password_hash
          FROM identity.account
          ORDER BY usuario
        `),
      )
      expect(cuentas.map((cuenta) => ({ usuario: cuenta.usuario, rol: cuenta.rol }))).toEqual([
        { usuario: 'apoyo-r13', rol: 'support' },
        { usuario: 'propietario-r13', rol: 'owner' },
      ])
      expect(cuentas.every((cuenta) => cuenta.password_hash.startsWith('$argon2id$'))).toBe(true)
    } finally {
      await vacia.close()
    }
  }, 120_000)

  it('una tabla que el respaldo no trae no impide restaurar', async () => {
    const ocupada = new PGlite()
    await ocupada.waitReady
    try {
      await aplicarMigraciones(drizzlePglite(ocupada))
      await ocupada.exec('CREATE TABLE herd.tabla_de_mas (id integer PRIMARY KEY)')
      await ocupada.exec('INSERT INTO herd.tabla_de_mas (id) VALUES (1)')
      await aplicarRespaldo(ocupada, sqlTexto)
      expect(await fotoDe(drizzlePglite(ocupada))).toEqual(fotoOriginal)
      const sobra = filasDe<{ nombre: string }>(
        await ocupada.query(
          `SELECT table_name AS nombre
           FROM information_schema.tables
           WHERE table_schema = 'herd' AND table_name = 'tabla_de_mas'`,
        ),
      )
      expect(sobra).toEqual([])
    } finally {
      await ocupada.close()
    }
  }, 120_000)

  it('reemplaza lo que ya había en la base', async () => {
    const ocupada = new PGlite()
    await ocupada.waitReady
    try {
      const otra = drizzlePglite(ocupada)
      await aplicarMigraciones(otra)
      await sembrarRancho(otra, 'Rancho que no debe sobrevivir')
      await aplicarRespaldo(ocupada, sqlTexto)
      expect(await fotoDe(drizzlePglite(ocupada))).toEqual(fotoOriginal)
      const nombres = filasDe<{ nombre: string }>(
        await ocupada.query(`SELECT nombre FROM identity.ranch`),
      )
      expect(nombres).toEqual([{ nombre: 'Rancho de prueba' }])
    } finally {
      await ocupada.close()
    }
  }, 120_000)

  it('node-pg ejecuta el mismo SQL', async () => {
    const vacia = new PGlite()
    await vacia.waitReady
    const socket = await exponerBaseLocal(vacia)
    const cliente = new Client({ connectionString: socket.url })
    await cliente.connect()
    try {
      await cliente.query('BEGIN')
      await cliente.query(sqlTexto)
      await cliente.query('COMMIT')
      expect(await fotoDe(drizzlePglite(vacia))).toEqual(fotoOriginal)
    } finally {
      await cliente.end().catch(() => undefined)
      await socket.cerrar()
      await vacia.close()
    }
  }, 120_000)

  it('el mismo SQL carga en PostgreSQL de servidor cuando hay TEST_DATABASE_URL', async () => {
    expect(sqlTexto).toContain('INSERT INTO herd.animal')
    expect(sqlTexto).toContain('INSERT INTO herd.animal_correction')
    expect(sqlTexto).toContain('INSERT INTO herd.animal_mark')
    expect(sqlTexto).toContain('INSERT INTO growth.weighing_line')
    expect(sqlTexto).toContain('INSERT INTO growth.weight_correction')
    expect(sqlTexto).toContain('INSERT INTO identity.account')
    expect(sqlTexto).toContain('INSERT INTO evidence.file')
    expect(sqlTexto).not.toMatch(/DROP SCHEMA(?: IF EXISTS)? public\b/)

    const url = process.env['TEST_DATABASE_URL']?.trim() ?? ''
    // Sin esa variable no hay servidor: la ida y vuelta de arriba ya cargó el
    // SQL. En CI está puesta. Si está y el servidor no responde, esto falla;
    // no se salta.
    if (url === '') {
      return
    }

    const servidor = await cargarEnServidor(url, sqlTexto)
    try {
      expect(await fotoDe(servidor.db)).toEqual(fotoOriginal)
    } finally {
      await servidor.cerrar()
    }
  }, 120_000)
})

describe('respaldo y restauración sobre la carpeta', () => {
  const temporales: string[] = []

  afterEach(() => {
    for (const dir of temporales.splice(0)) {
      rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 })
    }
  })

  it('en producción no abre la carpeta', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rancho-respaldo-'))
    temporales.push(dir)
    await expect(
      respaldarBaseLocal({
        directorioDeDatos: join(dir, 'datos'),
        directorioDeRespaldos: join(dir, 'respaldos'),
        nodeEnv: 'production',
      }),
    ).rejects.toThrow(/production/)
  })

  it('sin base local no inventa un archivo', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rancho-respaldo-'))
    temporales.push(dir)
    await expect(
      respaldarBaseLocal({
        directorioDeDatos: join(dir, 'datos'),
        directorioDeRespaldos: join(dir, 'respaldos'),
        nodeEnv: 'test',
      }),
    ).rejects.toThrow(/No hay base local/)
  })

  it('guarda el archivo, y restaurar reemplaza después de copiar lo que había', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rancho-respaldo-'))
    temporales.push(dir)
    const datos = join(dir, 'pglite')
    const respaldos = join(dir, 'respaldos')
    const ranch = nuevoId()

    const base = await abrirBaseLocal(datos)
    try {
      await aplicarMigraciones(base.db)
      await base.db.execute(sql`
        INSERT INTO identity.ranch (id, nombre, created_at)
        VALUES (${ranch}, 'Rancho original', ${new Date()})
      `)
    } finally {
      await base.cerrar()
    }

    const archivo = await respaldarBaseLocal({
      directorioDeDatos: datos,
      directorioDeRespaldos: respaldos,
      nodeEnv: 'test',
    })
    expect(readFileSync(archivo, 'utf8')).toContain('Rancho original')

    const cambiada = await abrirBaseLocal(datos)
    try {
      await cambiada.db.execute(sql`
        UPDATE identity.ranch
        SET nombre = 'Rancho cambiado antes de restaurar'
        WHERE id = ${ranch}
      `)
    } finally {
      await cambiada.cerrar()
    }

    const resultado = await restaurarBaseLocal({
      directorioDeDatos: datos,
      directorioDeRespaldos: respaldos,
      archivo,
      nodeEnv: 'test',
    })
    expect(resultado.respaldoPrevio).not.toBeNull()
    expect(readFileSync(resultado.respaldoPrevio ?? '', 'utf8')).toContain(
      'Rancho cambiado antes de restaurar',
    )

    const restaurada = await abrirBaseLocal(datos)
    try {
      const filas = filasDe<{ nombre: string }>(
        await restaurada.db.execute(sql`SELECT nombre FROM identity.ranch`),
      )
      expect(filas).toEqual([{ nombre: 'Rancho original' }])
    } finally {
      await restaurada.cerrar()
    }

    rmSync(datos, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 })
    const limpia = await restaurarBaseLocal({
      directorioDeDatos: datos,
      directorioDeRespaldos: respaldos,
      archivo,
      nodeEnv: 'test',
    })
    expect(limpia.respaldoPrevio).toBeNull()
    const creada = await abrirBaseLocal(datos)
    try {
      const filas = filasDe<{ nombre: string }>(
        await creada.db.execute(sql`SELECT nombre FROM identity.ranch`),
      )
      expect(filas).toEqual([{ nombre: 'Rancho original' }])
    } finally {
      await creada.cerrar()
    }
  }, 180_000)

  it('un archivo que no es respaldo no crea la base', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'rancho-respaldo-'))
    temporales.push(dir)
    const archivo = join(dir, 'no.sql')
    writeFileSync(archivo, 'esto no es un respaldo', 'utf8')
    const datos = join(dir, 'pglite')
    await expect(
      restaurarBaseLocal({
        directorioDeDatos: datos,
        directorioDeRespaldos: join(dir, 'respaldos'),
        archivo,
        nodeEnv: 'test',
      }),
    ).rejects.toThrow(/no es un respaldo/)
    expect(existsSync(datos)).toBe(false)
  })
})

async function fotoDe(db: EjecutorSql): Promise<Foto> {
  const salida: Foto = {}
  for (const [esquema, tabla, orden] of TABLAS) {
    const columnas = filasDe<{ column_name: string }>(
      await db.execute(sql`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = ${esquema} AND table_name = ${tabla}
        ORDER BY ordinal_position
      `),
    )
    const lista = columnas
      .map((columna) => `${cita(columna.column_name)}::text AS ${cita(columna.column_name)}`)
      .join(', ')
    const filas = filasDe<Record<string, unknown>>(
      await db.execute(
        sql.raw(`SELECT ${lista} FROM ${cita(esquema)}.${cita(tabla)} ORDER BY ${cita(orden)}`),
      ),
    )
    salida[`${esquema}.${tabla}`] = filas.map(canonizarFila)
  }

  const secuencia = filasDe<Record<string, unknown>>(
    await db.execute(
      sql.raw(
        'SELECT last_value::text AS last_value, is_called::text AS is_called FROM drizzle.__drizzle_migrations_id_seq',
      ),
    ),
  )
  salida['drizzle.__drizzle_migrations_id_seq'] = secuencia.map(canonizarFila)
  return salida
}

function canonizarFila(fila: Record<string, unknown>): Record<string, string | null> {
  const salida: Record<string, string | null> = {}
  for (const clave of Object.keys(fila).sort()) {
    salida[clave] = canonico(fila[clave])
  }
  return salida
}

function canonico(valor: unknown): string | null {
  if (valor === null || valor === undefined) {
    return null
  }
  if (valor instanceof Date) {
    return valor.toISOString()
  }
  const texto = String(valor)
  if (/^-?\d+\.\d+$/.test(texto)) {
    const negativo = texto.startsWith('-')
    const cuerpo = negativo ? texto.slice(1) : texto
    const [entero, fraccion = ''] = cuerpo.split('.')
    const fraccionLimpia = fraccion.replace(/0+$/, '')
    const unido = fraccionLimpia === '' ? (entero ?? '0') : `${entero ?? '0'}.${fraccionLimpia}`
    return negativo ? `-${unido}` : unido
  }
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/.test(texto)) {
    const normalizado = texto
      .replace(' ', 'T')
      .replace(/([+-]\d{2})$/, '$1:00')
      .replace(/([+-]\d{2})(\d{2})$/, '$1:$2')
    const fecha = new Date(normalizado)
    if (!Number.isNaN(fecha.getTime())) {
      return fecha.toISOString()
    }
  }
  return texto
}

function cita(nombre: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(nombre)) {
    throw new Error(`Identificador inesperado en la foto: ${nombre}`)
  }
  return `"${nombre}"`
}

async function cargarEnServidor(
  adminUrl: string,
  sqlTexto: string,
): Promise<{ db: EjecutorSql; cerrar: () => Promise<void> }> {
  const nombre = `rancho_test_${randomUUID().replace(/-/g, '').slice(0, 16)}`
  try {
    await conAdministracion(adminUrl, `CREATE DATABASE ${cita(nombre)}`)
  } catch (error) {
    throw new Error(
      `TEST_DATABASE_URL está definida y no se pudo crear la base «${nombre}» para cargar el respaldo: ${mensaje(error)}`,
    )
  }

  const conexion = urlConBase(adminUrl, nombre)
  const cliente = new Client({ connectionString: conexion })
  await cliente.connect()
  try {
    await cliente.query('BEGIN')
    await cliente.query(sqlTexto)
    await cliente.query('COMMIT')
  } catch (error) {
    await cliente.query('ROLLBACK').catch(() => undefined)
    await cliente.end().catch(() => undefined)
    await borrarBase(adminUrl, nombre).catch(() => undefined)
    throw new Error(`El respaldo no cargó en PostgreSQL de servidor: ${mensaje(error)}`)
  }
  await cliente.end()

  const pool = new Pool({ connectionString: conexion })
  const db = drizzlePg(pool)
  return {
    db,
    cerrar: async () => {
      await pool.end().catch(() => undefined)
      await borrarBase(adminUrl, nombre)
    },
  }
}

function urlConBase(url: string, nombre: string): string {
  const copia = new URL(url)
  copia.pathname = `/${nombre}`
  return copia.toString()
}

async function borrarBase(url: string, nombre: string): Promise<void> {
  await conAdministracion(url, `DROP DATABASE IF EXISTS ${cita(nombre)} WITH (FORCE)`)
}

async function conAdministracion(url: string, sentencia: string): Promise<void> {
  const cliente = new Client({ connectionString: url })
  await cliente.connect()
  try {
    await cliente.query(sentencia)
  } finally {
    await cliente.end().catch(() => undefined)
  }
}

function mensaje(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
