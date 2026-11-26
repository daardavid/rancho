import {
  agregarMarcaSchema,
  codigoDeErrorDeAnimalSchema,
  consultaDeAnimalesSchema,
  corregirAnimalSchema,
  corregirSalidaSchema,
  errorDeAnimalSchema,
  fichaConHistoriaSchema,
  fotoPuestaSchema,
  listaDeAnimalesSchema,
  marcarPerdidaSchema,
  marcaSchema,
  ponerFotoSchema,
  registrarAnimalSchema,
  registrarSalidaSchema,
  reemplazarMarcaSchema,
  reemplazoDeMarcaSchema,
  type CorregirAnimal,
  type CorregirSalida,
  type ErrorDeAnimal,
} from '@rancho/api-contracts'
import type { FastifyInstance, FastifyReply } from 'fastify'
import { z } from 'zod'

import {
  RechazoDeHerd,
  type EntradaCorregir,
  type EntradaCorregirSalida,
  type Herd,
} from '../../modules/herd'
import { ConflictoDeIdempotencia, ConflictoDeVersion } from '../../shared-kernel/conflictos'
import { exigirRol } from '../guardia'

const ROLES = ['owner', 'support'] as const

const paramsDeAnimal = z.strictObject({ id: z.uuid() })
const paramsDeMarca = z.strictObject({ id: z.uuid(), markId: z.uuid() })

/**
 * Ficha, correcciones y marcas. El rancho y quién registra salen de la sesión,
 * no del cuerpo. Sin sesión: 401, y el comando no corre.
 */
export function registrarRutasDeAnimales(app: FastifyInstance, herd: Herd): void {
  app.post('/api/animals', { preHandler: exigirRol(ROLES) }, async (peticion, respuesta) => {
    const sesion = exigirSesion(peticion.sesionActiva)
    const cuerpo = registrarAnimalSchema.safeParse(peticion.body)
    if (!cuerpo.success) {
      return cuerpoInvalido(respuesta)
    }

    return enviar(respuesta, 201, fichaConHistoriaSchema, () =>
      herd.registrar({
        commandId: cuerpo.data.commandId,
        id: cuerpo.data.id,
        ranchId: sesion.ranchId,
        recordedBy: sesion.recordedBy,
        ...(cuerpo.data.nombre !== undefined ? { nombre: cuerpo.data.nombre } : {}),
        ...(cuerpo.data.sexo !== undefined ? { sexo: cuerpo.data.sexo } : {}),
        ...(cuerpo.data.categoria !== undefined ? { categoria: cuerpo.data.categoria } : {}),
        ...(cuerpo.data.detalleCategoria !== undefined
          ? { detalleCategoria: cuerpo.data.detalleCategoria }
          : {}),
        ...(cuerpo.data.tenencia !== undefined ? { tenencia: cuerpo.data.tenencia } : {}),
        ...(cuerpo.data.participacionEconomica !== undefined
          ? { participacionEconomica: cuerpo.data.participacionEconomica }
          : {}),
        ...(cuerpo.data.notaDelArreglo !== undefined
          ? { notaDelArreglo: cuerpo.data.notaDelArreglo }
          : {}),
        ...(cuerpo.data.nota !== undefined ? { nota: cuerpo.data.nota } : {}),
      }),
    )
  })

  app.post('/api/animals/:id/corrections', { preHandler: exigirRol(ROLES) }, async (peticion, respuesta) => {
    const sesion = exigirSesion(peticion.sesionActiva)
    const params = paramsDeAnimal.safeParse(peticion.params)
    const cuerpo = corregirAnimalSchema.safeParse(peticion.body)
    if (!params.success || !cuerpo.success) {
      return cuerpoInvalido(respuesta)
    }

    return enviar(respuesta, 200, fichaConHistoriaSchema, () =>
      herd.corregir({
        commandId: cuerpo.data.commandId,
        ranchId: sesion.ranchId,
        recordedBy: sesion.recordedBy,
        animalId: params.data.id,
        version: cuerpo.data.version,
        motivo: cuerpo.data.motivo,
        cambios: cambiosDe(cuerpo.data),
      }),
    )
  })

  app.post('/api/animals/:id/marks', { preHandler: exigirRol(ROLES) }, async (peticion, respuesta) => {
    const sesion = exigirSesion(peticion.sesionActiva)
    const params = paramsDeAnimal.safeParse(peticion.params)
    const cuerpo = agregarMarcaSchema.safeParse(peticion.body)
    if (!params.success || !cuerpo.success) {
      return cuerpoInvalido(respuesta)
    }

    return enviar(respuesta, 201, marcaSchema, () =>
      herd.agregarMarca({
        commandId: cuerpo.data.commandId,
        ranchId: sesion.ranchId,
        recordedBy: sesion.recordedBy,
        animalId: params.data.id,
        marcaId: cuerpo.data.marcaId,
        tipo: cuerpo.data.tipo,
        valor: cuerpo.data.valor,
        ...(cuerpo.data.desde !== undefined ? { desde: cuerpo.data.desde } : {}),
      }),
    )
  })

  app.post(
    '/api/animals/:id/marks/:markId/replace',
    { preHandler: exigirRol(ROLES) },
    async (peticion, respuesta) => {
      const sesion = exigirSesion(peticion.sesionActiva)
      const params = paramsDeMarca.safeParse(peticion.params)
      const cuerpo = reemplazarMarcaSchema.safeParse(peticion.body)
      if (!params.success || !cuerpo.success) {
        return cuerpoInvalido(respuesta)
      }

      return enviar(respuesta, 200, reemplazoDeMarcaSchema, () =>
        herd.reemplazarMarca({
          commandId: cuerpo.data.commandId,
          ranchId: sesion.ranchId,
          recordedBy: sesion.recordedBy,
          animalId: params.data.id,
          marcaAnteriorId: params.data.markId,
          marcaId: cuerpo.data.marcaId,
          tipo: cuerpo.data.tipo,
          valor: cuerpo.data.valor,
          ...(cuerpo.data.desde !== undefined ? { desde: cuerpo.data.desde } : {}),
          ...(cuerpo.data.cambiadaEl !== undefined ? { cambiadaEl: cuerpo.data.cambiadaEl } : {}),
        }),
      )
    },
  )

  app.post(
    '/api/animals/:id/marks/:markId/lost',
    { preHandler: exigirRol(ROLES) },
    async (peticion, respuesta) => {
      const sesion = exigirSesion(peticion.sesionActiva)
      const params = paramsDeMarca.safeParse(peticion.params)
      const cuerpo = marcarPerdidaSchema.safeParse(peticion.body)
      if (!params.success || !cuerpo.success) {
        return cuerpoInvalido(respuesta)
      }

      return enviar(respuesta, 200, marcaSchema, () =>
        herd.marcarPerdida({
          commandId: cuerpo.data.commandId,
          ranchId: sesion.ranchId,
          recordedBy: sesion.recordedBy,
          animalId: params.data.id,
          marcaId: params.data.markId,
          ...(cuerpo.data.cambiadaEl !== undefined ? { cambiadaEl: cuerpo.data.cambiadaEl } : {}),
        }),
      )
    },
  )

  app.post('/api/animals/:id/exit', { preHandler: exigirRol(ROLES) }, async (peticion, respuesta) => {
    const sesion = exigirSesion(peticion.sesionActiva)
    const params = paramsDeAnimal.safeParse(peticion.params)
    const cuerpo = registrarSalidaSchema.safeParse(peticion.body)
    if (!params.success || !cuerpo.success) {
      return cuerpoInvalido(respuesta)
    }

    return enviar(respuesta, 200, fichaConHistoriaSchema, () =>
      herd.registrarSalida({
        commandId: cuerpo.data.commandId,
        ranchId: sesion.ranchId,
        recordedBy: sesion.recordedBy,
        animalId: params.data.id,
        version: cuerpo.data.version,
        motivo: cuerpo.data.motivo,
        fecha: cuerpo.data.fecha,
        ...(cuerpo.data.nota !== undefined ? { nota: cuerpo.data.nota } : {}),
        ...(cuerpo.data.evidenciaId !== undefined ? { evidenciaId: cuerpo.data.evidenciaId } : {}),
      }),
    )
  })

  app.post(
    '/api/animals/:id/exit/corrections',
    { preHandler: exigirRol(ROLES) },
    async (peticion, respuesta) => {
      const sesion = exigirSesion(peticion.sesionActiva)
      const params = paramsDeAnimal.safeParse(peticion.params)
      const cuerpo = corregirSalidaSchema.safeParse(peticion.body)
      if (!params.success || !cuerpo.success) {
        return cuerpoInvalido(respuesta)
      }

      return enviar(respuesta, 200, fichaConHistoriaSchema, () =>
        herd.corregirSalida({
          commandId: cuerpo.data.commandId,
          ranchId: sesion.ranchId,
          recordedBy: sesion.recordedBy,
          animalId: params.data.id,
          version: cuerpo.data.version,
          motivo: cuerpo.data.motivo,
          cambios: cambiosDeSalida(cuerpo.data),
        }),
      )
    },
  )

  app.post('/api/animals/:id/photo', { preHandler: exigirRol(ROLES) }, async (peticion, respuesta) => {
    const sesion = exigirSesion(peticion.sesionActiva)
    const params = paramsDeAnimal.safeParse(peticion.params)
    const cuerpo = ponerFotoSchema.safeParse(peticion.body)
    if (!params.success || !cuerpo.success) {
      return cuerpoInvalido(respuesta)
    }

    return enviar(respuesta, 200, fotoPuestaSchema, () =>
      herd.ponerFoto({
        commandId: cuerpo.data.commandId,
        ranchId: sesion.ranchId,
        recordedBy: sesion.recordedBy,
        animalId: params.data.id,
        version: cuerpo.data.version,
        evidenciaId: cuerpo.data.evidenciaId,
        miniaturaId: cuerpo.data.miniaturaId,
      }),
    )
  })

  app.get('/api/animals', { preHandler: exigirRol(ROLES) }, async (peticion, respuesta) => {
    const sesion = exigirSesion(peticion.sesionActiva)
    const consulta = consultaDeAnimalesSchema.safeParse(peticion.query)
    if (!consulta.success) {
      return cuerpoInvalido(respuesta)
    }

    const marca = consulta.data.mark
    if (marca !== undefined) {
      return enviar(respuesta, 200, listaDeAnimalesSchema, async () => {
        const encontrados = await herd.buscarPorMarca(sesion.ranchId, marca)
        return { animales: filtrarPorEstado(encontrados, consulta.data.estado) }
      })
    }

    if (consulta.data.estado === 'salidas') {
      return enviar(respuesta, 200, listaDeAnimalesSchema, async () => ({
        animales: await herd.listarSalidas(sesion.ranchId),
      }))
    }

    return enviar(respuesta, 200, listaDeAnimalesSchema, async () => ({
      animales: await herd.listarActivos(sesion.ranchId),
    }))
  })

  app.get('/api/animals/:id', { preHandler: exigirRol(ROLES) }, async (peticion, respuesta) => {
    const sesion = exigirSesion(peticion.sesionActiva)
    const params = paramsDeAnimal.safeParse(peticion.params)
    if (!params.success) {
      return cuerpoInvalido(respuesta)
    }

    return enviar(respuesta, 200, fichaConHistoriaSchema, async () => {
      const ficha = await herd.obtener(sesion.ranchId, params.data.id)
      if (ficha === null) {
        throw new RechazoDeHerd('no_encontrado')
      }
      return ficha
    })
  })
}

function cambiosDeSalida(cuerpo: CorregirSalida): EntradaCorregirSalida['cambios'] {
  return {
    ...(cuerpo.motivoDeSalida !== undefined ? { motivo: cuerpo.motivoDeSalida } : {}),
    ...(cuerpo.fecha !== undefined ? { fecha: cuerpo.fecha } : {}),
    ...(cuerpo.nota !== undefined ? { nota: cuerpo.nota } : {}),
    ...(cuerpo.evidenciaId !== undefined ? { evidenciaId: cuerpo.evidenciaId } : {}),
    ...(cuerpo.activo === true ? { activo: true as const } : {}),
  }
}

function filtrarPorEstado<T extends { activo: boolean }>(
  animales: readonly T[],
  estado: 'activos' | 'salidas' | undefined,
): T[] {
  if (estado === 'salidas') {
    return animales.filter((animal) => !animal.activo)
  }
  if (estado === 'activos') {
    return animales.filter((animal) => animal.activo)
  }
  return [...animales]
}

function cambiosDe(cuerpo: CorregirAnimal): EntradaCorregir['cambios'] {
  return {
    ...(cuerpo.nombre !== undefined ? { nombre: cuerpo.nombre } : {}),
    ...(cuerpo.sexo !== undefined ? { sexo: cuerpo.sexo } : {}),
    ...(cuerpo.categoria !== undefined ? { categoria: cuerpo.categoria } : {}),
    ...(cuerpo.detalleCategoria !== undefined ? { detalleCategoria: cuerpo.detalleCategoria } : {}),
    ...(cuerpo.tenencia !== undefined ? { tenencia: cuerpo.tenencia } : {}),
    ...(cuerpo.participacionEconomica !== undefined
      ? { participacionEconomica: cuerpo.participacionEconomica }
      : {}),
    ...(cuerpo.notaDelArreglo !== undefined ? { notaDelArreglo: cuerpo.notaDelArreglo } : {}),
    ...(cuerpo.nota !== undefined ? { nota: cuerpo.nota } : {}),
  }
}

function exigirSesion<T extends { ranchId: string } | null>(sesion: T): NonNullable<T> {
  if (sesion === null) {
    throw new Error('La guardia dejó pasar una petición sin sesión.')
  }
  return sesion
}

function cuerpoInvalido(respuesta: FastifyReply) {
  return respuesta
    .header('cache-control', 'no-store')
    .code(400)
    .send(errorDeAnimalSchema.parse({ codigo: 'cuerpo_invalido' }))
}

async function enviar(
  respuesta: FastifyReply,
  estado: number,
  esquema: { parse: (valor: unknown) => unknown },
  trabajo: () => Promise<unknown>,
) {
  try {
    const cuerpo = esquema.parse(await trabajo())
    return respuesta.header('cache-control', 'no-store').code(estado).send(cuerpo)
  } catch (error) {
    const traducido = traducir(error)
    if (traducido === null) {
      throw error
    }
    return respuesta
      .header('cache-control', 'no-store')
      .code(traducido.estado)
      .send(errorDeAnimalSchema.parse({ codigo: traducido.codigo }))
  }
}

function traducir(error: unknown): { codigo: ErrorDeAnimal['codigo']; estado: number } | null {
  if (error instanceof ConflictoDeVersion) {
    return { codigo: 'version_conflict', estado: 409 }
  }
  if (error instanceof ConflictoDeIdempotencia) {
    return { codigo: 'idempotency_mismatch', estado: 409 }
  }
  if (error instanceof RechazoDeHerd) {
    const codigo = codigoDeErrorDeAnimalSchema.safeParse(error.codigo)
    if (!codigo.success) {
      return null
    }
    return { codigo: codigo.data, estado: estadoDe(error.codigo) }
  }
  return null
}

function estadoDe(codigo: RechazoDeHerd['codigo']): number {
  if (codigo === 'no_encontrado') {
    return 404
  }
  if (
    codigo === 'animal_ya_existe' ||
    codigo === 'marca_ya_existe' ||
    codigo === 'marca_siniiga_duplicada'
  ) {
    return 409
  }
  return 422
}
