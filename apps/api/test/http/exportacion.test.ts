import { sql } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { crearCapturaDeDestete } from '../../src/application/destete'
import { construirApp } from '../../src/http/app'
import { filasDe } from '../../src/infrastructure/db/filas'
import { sembrarRancho } from '../../src/infrastructure/db/semilla'
import { crearCuenta } from '../../src/infrastructure/identity/cuentas'
import { crearIdentidad } from '../../src/infrastructure/identity/identidad'
import { crearGrowth } from '../../src/modules/growth'
import { crearHerd } from '../../src/modules/herd'
import { crearJournal } from '../../src/modules/journal'
import { crearModelosDeExportacion } from '../../src/read-models'
import { nuevoId } from '../../src/shared-kernel/ids'
import { SECRETO_DE_PRUEBA, abrirBaseDePruebas } from '../db/base-de-pruebas'

const CONTRASENA = 'contrasena-de-prueba'
const USUARIO = 'propietario-r41'
const USUARIO_APOYO = 'apoyo-r41'

const COLUMNAS_HATO = [
  'Id del animal',
  'Nombre o seña',
  'Sexo',
  'Nota del sexo',
  'Categoría',
  'Detalle de la categoría',
  'Nota de la categoría',
  'Tenencia',
  'Nota de la tenencia',
  'Nota del arreglo',
  'Nota',
  'SINIIGA',
  'Otros aretes',
  'Aretes anteriores',
  'Potrero esperado',
  'Nota del potrero',
  'Última observación',
  'De dónde',
  'En el hato',
  'Motivo de la salida',
  'Nota del motivo',
  'Día en que se supo',
  'Nota de la salida',
]

const COLUMNAS_PESOS = [
  'Id del animal',
  'Nombre o seña',
  'SINIIGA',
  'Día',
  'Kilos',
  'Calidad',
  'Nota de la sesión',
  'Corregido',
]

const COLUMNAS_EVENTOS = [
  'Tipo',
  'Día',
  'Precisión del día',
  'Nota del día',
  'Id del animal',
  'Animal',
  'Madre',
  'Id de la madre',
  'Certeza de la madre',
  'Nota de la madre',
  'Por qué la madre',
  'Padre',
  'Id del padre',
  'Certeza del padre',
  'Nota del padre',
  'Por qué el padre',
  'Motivo de la salida',
  'Nota del motivo',
  'Qué fue',
  'Detalle',
  'Producto',
  'Se vio al animal',
  'Nota de si se vio',
  'Resultado',
  'Nota del resultado',
  'Potrero',
  'Nota del potrero',
  'Kilos',
  'Quién lo dijo',
  'Nota',
]

const RUTAS = ['/api/exports/herd', '/api/exports/weights', '/api/exports/events'] as const

type Base = Awaited<ReturnType<typeof abrirBaseDePruebas>>['db']
type App = ReturnType<typeof construirApp>
type Fila = Record<string, string>
type Tabla = { readonly columnas: readonly string[]; readonly filas: readonly Fila[] }

let db: Base
let cerrar: () => Promise<void> = async () => {}
let app: App
let ownerId = ''
let supportId = ''

function cookieEnviada(setCookie: string): string {
  return (setCookie.split(';')[0] ?? '').trim()
}

function setCookieDe(headers: Record<string, unknown>): string {
  const cruda = headers['set-cookie']
  const texto = Array.isArray(cruda) ? cruda[0] : cruda
  if (typeof texto !== 'string') {
    throw new Error('La respuesta no trajo la cookie de sesión.')
  }
  return texto
}

async function entrar(usuario: string): Promise<string> {
  const respuesta = await app.inject({
    method: 'POST',
    url: '/api/session',
    payload: { usuario, contrasena: CONTRASENA },
  })
  expect(respuesta.statusCode).toBe(200)
  return cookieEnviada(setCookieDe(respuesta.headers))
}

async function post(
  cookie: string,
  url: string,
  payload: Record<string, unknown>,
  esperado = 201,
): Promise<Record<string, unknown>> {
  const respuesta = await app.inject({
    method: 'POST',
    url,
    headers: { cookie },
    payload,
  })
  if (respuesta.statusCode !== esperado) {
    throw new Error(`${url} → ${String(respuesta.statusCode)} ${respuesta.body}`)
  }
  return respuesta.json()
}

async function alta(
  cookie: string,
  cuerpo: Record<string, unknown> = {},
): Promise<{ id: string; version: number }> {
  const id = nuevoId()
  const ficha = await post(cookie, '/api/animals', { commandId: nuevoId(), id, ...cuerpo })
  const version = ficha.version
  if (typeof version !== 'number') {
    throw new Error('El alta no devolvió la versión.')
  }
  return { id, version }
}

describe('exportar a hoja de cálculo', () => {
  beforeAll(async () => {
    const base = await abrirBaseDePruebas()
    db = base.db
    cerrar = base.cerrar
    await sembrarRancho(db, 'Rancho de prueba')
    const owner = await crearCuenta(db, { rol: 'owner', usuario: USUARIO, contrasena: CONTRASENA })
    const apoyo = await crearCuenta(db, {
      rol: 'support',
      usuario: USUARIO_APOYO,
      contrasena: CONTRASENA,
    })
    ownerId = owner.id
    supportId = apoyo.id
    const herd = crearHerd(db)
    app = construirApp({
      identidad: crearIdentidad(db, SECRETO_DE_PRUEBA),
      herd,
      growth: crearGrowth(db, herd),
      destete: crearCapturaDeDestete(db),
      journal: crearJournal(db, herd),
      exportacion: crearModelosDeExportacion(db),
      nivelDeLog: 'silent',
    })
  }, 60_000)

  afterAll(async () => {
    await app.close()
    await cerrar()
  })

  it('responde 401 sin sesión', async () => {
    for (const url of RUTAS) {
      const respuesta = await app.inject({ method: 'GET', url })
      expect(respuesta.statusCode, url).toBe(401)
      expect(respuesta.json()).toEqual({ codigo: 'no_autenticado' })
    }
  })

  it('arma los tres archivos con los hechos, los kilos tal cual y las notas citadas', async () => {
    const cookie = await entrar(USUARIO)
    const luna = await alta(cookie, {
      nombre: 'Luna',
      sexo: 'female',
      categoria: 'cow',
      tenencia: 'ranch',
    })
    const negro = await alta(cookie, {
      nombre: 'Negro',
      sexo: 'male',
      categoria: 'bull',
      tenencia: 'ranch',
    })
    const hueco = await alta(cookie, { nota: 'sin nombre, a propósito' })
    const sinSena = await alta(cookie, { nombre: 'Sin seña' })
    const parte = await alta(cookie, {
      nombre: 'Parte',
      sexo: 'female',
      categoria: 'cow',
      tenencia: 'a_la_parte',
      notaDelArreglo: 'de palabra, no es un porcentaje',
    })
    await post(
      cookie,
      `/api/animals/${parte.id}/exit`,
      {
        commandId: nuevoId(),
        version: parte.version,
        motivo: 'death',
        fecha: '2026-05-02',
        nota: 'Se murió, lo dijo el vaquero',
      },
      200,
    )

    const marcaVieja = nuevoId()
    await post(cookie, `/api/animals/${luna.id}/marks`, {
      commandId: nuevoId(),
      marcaId: marcaVieja,
      tipo: 'siniiga',
      valor: 'MX-VIEJO',
    })
    await post(
      cookie,
      `/api/animals/${luna.id}/marks/${marcaVieja}/replace`,
      { commandId: nuevoId(), marcaId: nuevoId(), tipo: 'siniiga', valor: 'MX-NUEVO' },
      200,
    )
    await post(cookie, `/api/animals/${negro.id}/marks`, {
      commandId: nuevoId(),
      marcaId: nuevoId(),
      tipo: 'other',
      valor: 'OREJA-7',
    })

    const potrero = nuevoId()
    await post(cookie, '/api/paddocks', { commandId: nuevoId(), id: potrero, nombre: 'La Orilla' })
    await post(cookie, '/api/locations', {
      commandId: nuevoId(),
      potreroId: potrero,
      desde: '2026-01-01',
      nota: 'la bajaron, de mañana',
      reportedBy: 'el vaquero',
      animales: [{ animalId: luna.id, asignacionId: nuevoId() }],
    })

    const canelo = nuevoId()
    await post(cookie, '/api/births', {
      commandId: nuevoId(),
      id: canelo,
      filiacionId: nuevoId(),
      nombre: 'Canelo',
      sexo: 'male',
      tenencia: 'ranch',
      fechaNacimiento: '2026-01-10',
      precisionFecha: 'exact',
      madre: { certeza: 'observed', animalId: luna.id, motivo: null },
      padre: { certeza: 'inferred', animalId: negro.id, motivo: 'unico_toro' },
      nota: 'Nació en la manga',
    })
    const sinPadres = nuevoId()
    await post(cookie, '/api/births', {
      commandId: nuevoId(),
      id: sinPadres,
      filiacionId: nuevoId(),
      nombre: 'Sin padres',
      sexo: 'female',
      fechaNacimiento: null,
      precisionFecha: null,
      madre: { certeza: 'unknown', animalId: null, motivo: null },
      padre: { certeza: 'unknown', animalId: null, motivo: null },
    })
    await post(cookie, '/api/locations', {
      commandId: nuevoId(),
      potreroId: null,
      desde: '2026-01-11',
      animales: [{ animalId: canelo, asignacionId: nuevoId() }],
    })

    const sesionDeLuna = nuevoId()
    const pesoDeLuna = nuevoId()
    await post(cookie, '/api/weighing-sessions', {
      commandId: nuevoId(),
      id: sesionDeLuna,
      fecha: '2026-03-15',
      nota: 'manga, lado norte',
      filas: [
        {
          id: pesoDeLuna,
          animalId: luna.id,
          resultado: 'pesado',
          kilos: '349.250',
          calidad: 'measured',
        },
        { id: nuevoId(), animalId: hueco.id, resultado: 'hueco' },
      ],
    })
    await post(
      cookie,
      `/api/weights/${pesoDeLuna}/corrections`,
      { commandId: nuevoId(), version: 1, motivo: 'leí de más', kilos: '348.500' },
      200,
    )
    const sesionDeNegro = nuevoId()
    await post(cookie, '/api/weighing-sessions', {
      commandId: nuevoId(),
      id: sesionDeNegro,
      fecha: '2026-04-01',
      filas: [
        {
          id: nuevoId(),
          animalId: negro.id,
          resultado: 'pesado',
          kilos: '410.000',
          calidad: 'observed',
        },
      ],
    })

    await post(cookie, '/api/health-notes', {
      commandId: nuevoId(),
      tipo: 'vacuna',
      detalle: 'Garrapata, y tos',
      fecha: '2026-09-01',
      vioAlAnimal: true,
      animales: [{ animalId: canelo, notaId: nuevoId() }],
    })
    await post(cookie, '/api/health-notes', {
      commandId: nuevoId(),
      tipo: 'otro',
      detalle: 'No se supo',
      fecha: '2026-02-02',
      vioAlAnimal: null,
      animales: [{ animalId: sinSena.id, notaId: nuevoId() }],
    })
    await post(cookie, '/api/pregnancy-checks', {
      commandId: nuevoId(),
      fecha: '2026-02-01',
      resultado: 'prenada',
      vioAlAnimal: true,
      animales: [{ animalId: luna.id, diagnosticoId: nuevoId() }],
    })
    await post(cookie, '/api/pregnancy-checks', {
      commandId: nuevoId(),
      fecha: '2026-02-10',
      resultado: 'no_se',
      vioAlAnimal: null,
      nota: 'Revisión, sin resultado',
      animales: [{ animalId: sinSena.id, diagnosticoId: nuevoId() }],
    })
    const pesoDeDestete = nuevoId()
    await post(cookie, '/api/weanings', {
      commandId: nuevoId(),
      precisionFecha: 'approximate',
      fecha: '2026-08-01',
      nota: 'Se apartó, tarde',
      reportedBy: 'el vaquero',
      animales: [
        {
          animalId: canelo,
          desteteId: nuevoId(),
          peso: { id: pesoDeDestete, kilos: '180.500', calidad: 'declared' },
        },
      ],
    })
    await post(cookie, '/api/journal-notes', {
      commandId: nuevoId(),
      id: nuevoId(),
      tipo: 'lluvia',
      texto: 'Cayó el agua, y el caño',
      fecha: '2026-07-04',
      precision: 'approximate',
      potreroId: potrero,
      reportedBy: 'el vaquero',
    })

    const dia = await diaDelRancho()
    const hato = await bajar(cookie, '/api/exports/herd', dia, 'hato')
    const pesos = await bajar(cookie, '/api/exports/weights', dia, 'pesos')
    const eventos = await bajar(cookie, '/api/exports/events', dia, 'eventos')

    expect(hato.tabla.columnas).toEqual(COLUMNAS_HATO)
    expect(pesos.tabla.columnas).toEqual(COLUMNAS_PESOS)
    expect(eventos.tabla.columnas).toEqual(COLUMNAS_EVENTOS)
    expect(hato.tabla.filas).toHaveLength(7)
    expect(pesos.tabla.filas).toHaveLength(3)
    expect(eventos.tabla.filas).toHaveLength(11)

    expect(hato.tabla.filas.at(-1)?.['Nombre o seña']).toBe('Parte')
    expect(fila(hato.tabla, 'Nombre o seña', 'Luna')).toMatchObject({
      Sexo: 'Hembra',
      'Nota del sexo': '',
      Categoría: 'Vaca',
      Tenencia: 'Del rancho',
      SINIIGA: 'MX-NUEVO',
      'Aretes anteriores': 'SINIIGA MX-VIEJO (cambiado)',
      'Potrero esperado': 'La Orilla',
      'Nota del potrero': '',
      'Última observación': '2026-03-15',
      'De dónde': 'Pesaje',
      'En el hato': 'Activo',
      'Motivo de la salida': '',
      'Nota de la salida': '',
    })
    expect(fila(hato.tabla, 'Nombre o seña', 'Negro')).toMatchObject({
      Sexo: 'Macho',
      Categoría: 'Toro',
      'Otros aretes': 'OREJA-7',
      SINIIGA: '',
    })
    expect(fila(hato.tabla, 'Nota', 'sin nombre, a propósito')).toMatchObject({
      'Id del animal': hueco.id,
      'Nombre o seña': '',
      'Nota del sexo': 'No sé',
    })
    expect(fila(hato.tabla, 'Nombre o seña', 'Sin seña')).toMatchObject({
      Sexo: '',
      'Nota del sexo': 'No sé',
      Categoría: '',
      'Nota de la categoría': 'No sé',
      Tenencia: '',
      'Nota de la tenencia': 'No sé',
      'Potrero esperado': '',
      'Nota del potrero': '',
      'Última observación': '',
      'De dónde': '',
      'En el hato': 'Activo',
    })
    expect(fila(hato.tabla, 'Nombre o seña', 'Parte')).toMatchObject({
      Tenencia: 'A la parte',
      'Nota del arreglo': 'de palabra, no es un porcentaje',
      'En el hato': 'Dado de baja',
      'Motivo de la salida': 'Muerte',
      'Nota del motivo': '',
      'Día en que se supo': '2026-05-02',
      'Nota de la salida': 'Se murió, lo dijo el vaquero',
    })
    expect(fila(hato.tabla, 'Nombre o seña', 'Canelo')).toMatchObject({
      Sexo: 'Macho',
      Categoría: 'Becerro',
      'Potrero esperado': '',
      'Nota del potrero': 'No sé',
      'Última observación': '2026-09-01',
      'De dónde': 'Sanidad',
      'En el hato': 'Activo',
    })

    const kilosDeLuna = await kilosGuardados(pesoDeLuna)
    const kilosDelDestete = await kilosGuardados(pesoDeDestete)
    expect(kilosDeLuna).toBe('348.500')
    expect(kilosDelDestete).toBe('180.500')
    expect(fila(pesos.tabla, 'Nombre o seña', 'Luna')).toMatchObject({
      SINIIGA: 'MX-NUEVO',
      Día: '2026-03-15',
      Kilos: kilosDeLuna,
      Calidad: 'Medido en la báscula',
      'Nota de la sesión': 'manga, lado norte',
      Corregido: 'Sí',
    })
    expect(fila(pesos.tabla, 'Nombre o seña', 'Negro')).toMatchObject({
      Día: '2026-04-01',
      Kilos: '410.000',
      Calidad: 'Visto, no medido',
      Corregido: 'No',
    })
    expect(fila(pesos.tabla, 'Nombre o seña', 'Canelo')).toMatchObject({
      Día: '2026-08-01',
      Kilos: kilosDelDestete,
      Calidad: 'Me lo dijeron',
      'Nota de la sesión': 'Se apartó, tarde',
      Corregido: 'No',
    })
    expect(pesos.cuerpo).not.toContain(hueco.id)
    expect(pesos.cuerpo).not.toContain('349.250')

    const nacimiento = eventos.tabla.filas.find(
      (evento) => evento.Tipo === 'Nacimiento' && evento.Animal === 'Canelo',
    )
    expect(nacimiento).toMatchObject({
      Día: '2026-01-10',
      'Precisión del día': 'Exacta',
      'Nota del día': '',
      Madre: 'Luna',
      'Id de la madre': luna.id,
      'Certeza de la madre': 'La vi',
      'Nota de la madre': '',
      Padre: 'Negro',
      'Id del padre': negro.id,
      'Certeza del padre': 'Inferida',
      'Nota del padre': '',
      'Por qué el padre': 'Único toro',
      Nota: 'Nació en la manga',
    })
    expect(
      eventos.tabla.filas.find(
        (evento) => evento.Tipo === 'Nacimiento' && evento.Animal === 'Sin padres',
      ),
    ).toMatchObject({
      Día: '',
      'Nota del día': 'No sé',
      'Certeza de la madre': '',
      'Nota de la madre': 'No sé',
      'Id de la madre': '',
      'Certeza del padre': '',
      'Nota del padre': 'No sé',
      Padre: '',
    })
    expect(eventos.tabla.filas.find((evento) => evento.Tipo === 'Salida')).toMatchObject({
      Animal: 'Parte',
      Día: '2026-05-02',
      'Motivo de la salida': 'Muerte',
      Nota: 'Se murió, lo dijo el vaquero',
    })
    expect(
      eventos.tabla.filas.find((evento) => evento.Tipo === 'Sanidad' && evento.Animal === 'Canelo'),
    ).toMatchObject({
      Día: '2026-09-01',
      'Qué fue': 'Vacuna',
      Detalle: 'Garrapata, y tos',
      'Se vio al animal': 'Sí',
      'Nota de si se vio': '',
    })
    expect(
      eventos.tabla.filas.find(
        (evento) => evento.Tipo === 'Sanidad' && evento.Animal === 'Sin seña',
      ),
    ).toMatchObject({
      'Se vio al animal': '',
      'Nota de si se vio': 'No sé',
    })
    expect(eventos.tabla.filas.find((evento) => evento.Tipo === 'Destete')).toMatchObject({
      Animal: 'Canelo',
      Día: '2026-08-01',
      'Precisión del día': 'Aproximada',
      'Nota del día': '',
      Kilos: kilosDelDestete,
      'Quién lo dijo': 'el vaquero',
      Nota: 'Se apartó, tarde',
    })
    expect(
      eventos.tabla.filas.find(
        (evento) => evento.Tipo === 'Diagnóstico de preñez' && evento.Animal === 'Luna',
      ),
    ).toMatchObject({
      Resultado: 'Preñada',
      'Nota del resultado': '',
      'Se vio al animal': 'Sí',
    })
    expect(
      eventos.tabla.filas.find(
        (evento) => evento.Tipo === 'Diagnóstico de preñez' && evento.Animal === 'Sin seña',
      ),
    ).toMatchObject({
      Resultado: '',
      'Nota del resultado': 'No sé',
      'Nota de si se vio': 'No sé',
      Nota: 'Revisión, sin resultado',
    })
    expect(
      eventos.tabla.filas.find(
        (evento) => evento.Tipo === 'Movimiento de potrero' && evento.Animal === 'Luna',
      ),
    ).toMatchObject({
      Día: '2026-01-01',
      Potrero: 'La Orilla',
      'Nota del potrero': '',
      Nota: 'la bajaron, de mañana',
      'Quién lo dijo': 'el vaquero',
    })
    expect(
      eventos.tabla.filas.find(
        (evento) => evento.Tipo === 'Movimiento de potrero' && evento.Animal === 'Canelo',
      ),
    ).toMatchObject({
      Potrero: '',
      'Nota del potrero': 'No sé',
    })
    expect(eventos.tabla.filas.find((evento) => evento.Tipo === 'Bitácora')).toMatchObject({
      Día: '2026-07-04',
      'Precisión del día': 'Aproximada',
      'Qué fue': 'Lluvia',
      Potrero: 'La Orilla',
      'Quién lo dijo': 'el vaquero',
      Nota: 'Cayó el agua, y el caño',
      'Id del animal': '',
    })

    expect(hato.cuerpo).toContain('"de palabra, no es un porcentaje"')
    expect(hato.cuerpo).toContain('"Se murió, lo dijo el vaquero"')
    expect(pesos.cuerpo).toContain('"manga, lado norte"')
    expect(eventos.cuerpo).toContain('"Cayó el agua, y el caño"')
    expect(eventos.cuerpo).toContain('"Garrapata, y tos"')

    const sesiones = filasDe<{ id: string }>(
      await db.execute(sql`SELECT id FROM growth.weighing_session`),
    )
    for (const cuerpo of [hato.cuerpo, pesos.cuerpo, eventos.cuerpo]) {
      expect(cuerpo).not.toContain(ownerId)
      expect(cuerpo).not.toContain(supportId)
      expect(cuerpo).not.toContain(USUARIO)
      expect(cuerpo).not.toContain(USUARIO_APOYO)
      expect(cuerpo.toLowerCase()).not.toContain('password')
      for (const sesion of sesiones) {
        expect(cuerpo).not.toContain(sesion.id)
      }
    }
  })

  it('support también baja el archivo, como ADR-010 deja leer los hechos', async () => {
    const cookie = await entrar(USUARIO_APOYO)
    for (const url of RUTAS) {
      const respuesta = await app.inject({ method: 'GET', url, headers: { cookie } })
      expect(respuesta.statusCode, url).toBe(200)
      expect(String(respuesta.headers['content-type'])).toContain('text/csv')
      expect(respuesta.body.charCodeAt(0)).toBe(0xfeff)
      expect(respuesta.body).not.toContain(supportId)
      expect(respuesta.body).not.toContain(ownerId)
    }
  })
})

async function bajar(
  cookie: string,
  url: string,
  dia: string,
  pieza: string,
): Promise<{ cuerpo: string; tabla: Tabla }> {
  const respuesta = await app.inject({ method: 'GET', url, headers: { cookie } })
  expect(respuesta.statusCode, url).toBe(200)
  expect(String(respuesta.headers['content-type'])).toContain('text/csv')
  expect(String(respuesta.headers['content-type'])).toContain('utf-8')
  expect(String(respuesta.headers['cache-control'])).toContain('no-store')
  const disposicion = String(respuesta.headers['content-disposition'])
  expect(disposicion).toContain(`Rancho de prueba - ${pieza} - ${dia}.csv`)
  expect(disposicion).toContain('attachment')
  expect(respuesta.body.charCodeAt(0)).toBe(0xfeff)
  return { cuerpo: respuesta.body, tabla: tablaDe(respuesta.body) }
}

async function diaDelRancho(): Promise<string> {
  const filas = filasDe<{ dia: string }>(
    await db.execute(sql`
      SELECT (timezone('America/Mexico_City', now()))::date::text AS dia
    `),
  )
  const dia = filas[0]?.dia
  if (dia === undefined) {
    throw new Error('La base no devolvió el día.')
  }
  return dia
}

async function kilosGuardados(id: string): Promise<string> {
  const filas = filasDe<{ kilos: string }>(
    await db.execute(sql`SELECT kilos::text AS kilos FROM growth.weighing_line WHERE id = ${id}`),
  )
  const kilos = filas[0]?.kilos
  if (kilos === undefined) {
    throw new Error('No están los kilos guardados.')
  }
  return kilos
}

function fila(tabla: Tabla, columna: string, valor: string): Fila {
  const encontrada = tabla.filas.find((candidata) => candidata[columna] === valor)
  if (encontrada === undefined) {
    throw new Error(`No está ${columna}=${valor}`)
  }
  return encontrada
}

function tablaDe(cuerpo: string): Tabla {
  const crudas = parsear(cuerpo)
  const encabezado = crudas[0]
  if (encabezado === undefined) {
    throw new Error('El CSV no trae columnas.')
  }
  return {
    columnas: encabezado,
    filas: crudas.slice(1).map((filaCruda) => {
      const registro: Fila = {}
      encabezado.forEach((columna, indice) => {
        registro[columna] = filaCruda[indice] ?? ''
      })
      return registro
    }),
  }
}

function parsear(cuerpo: string): string[][] {
  const texto = cuerpo.startsWith('\uFEFF') ? cuerpo.slice(1) : cuerpo
  const filas: string[][] = []
  let actual: string[] = []
  let celda = ''
  let entreComillas = false

  for (let i = 0; i < texto.length; i += 1) {
    const char = texto[i] ?? ''
    if (entreComillas) {
      if (char === '"') {
        if (texto[i + 1] === '"') {
          celda += '"'
          i += 1
        } else {
          entreComillas = false
        }
      } else {
        celda += char
      }
      continue
    }
    if (char === '"') {
      entreComillas = true
      continue
    }
    if (char === ',') {
      actual.push(celda)
      celda = ''
      continue
    }
    if (char === '\r') {
      continue
    }
    if (char === '\n') {
      actual.push(celda)
      filas.push(actual)
      actual = []
      celda = ''
      continue
    }
    celda += char
  }

  return filas
}
