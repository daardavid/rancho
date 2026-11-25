import {
  codigoDeErrorDeNacimientoSchema,
  corregirFiliacionSchema,
  errorDeNacimientoSchema,
  familiaSchema,
  filiacionConHistoriaSchema,
  nacimientoSchema,
  registrarNacimientoSchema,
  type ErrorDeNacimiento,
} from '@rancho/api-contracts'
import type { FastifyInstance, FastifyReply } from 'fastify'
import { z } from 'zod'

import { RechazoDeHerd, type Herd } from '../../modules/herd'
import { ConflictoDeIdempotencia, ConflictoDeVersion } from '../../shared-kernel/conflictos'
import { exigirRol } from '../guardia'

const ROLES = ['owner', 'support'] as const
const paramsDeAnimal = z.strictObject({ id: z.uuid() })

/**
 * Nacimiento y filiación. El rancho y quién registra salen de la sesión.
 * Sin sesión: 401, y el comando no corre.
 */
export function registrarRutasDeNacimientos(app: FastifyInstance, herd: Herd): void {
  app.post('/api/births', { preHandler: exigirRol(ROLES) }, async (peticion, respuesta) => {
    const sesion = exigirSesion(peticion.sesionActiva)
    const cuerpo = registrarNacimientoSchema.safeParse(peticion.body)
    if (!cuerpo.success) {
      return cuerpoInvalido(respuesta)
    }

    const datos = cuerpo.data
    return enviar(respuesta, 201, nacimientoSchema, () =>
      herd.registrarNacimiento({
        commandId: datos.commandId,
        id: datos.id,
        filiacionId: datos.filiacionId,
        ranchId: sesion.ranchId,
        recordedBy: sesion.recordedBy,
        fechaNacimiento: datos.fechaNacimiento,
        precisionFecha: datos.precisionFecha,
        madre: datos.madre,
        padre: datos.padre,
        ...(datos.nombre !== undefined ? { nombre: datos.nombre } : {}),
        ...(datos.sexo !== undefined ? { sexo: datos.sexo } : {}),
        ...(datos.tenencia !== undefined ? { tenencia: datos.tenencia } : {}),
        ...(datos.marca !== undefined ? { marca: datos.marca } : {}),
        ...(datos.nota !== undefined ? { nota: datos.nota } : {}),
      }),
    )
  })

  app.post(
    '/api/animals/:id/parentage/corrections',
    { preHandler: exigirRol(ROLES) },
    async (peticion, respuesta) => {
      const sesion = exigirSesion(peticion.sesionActiva)
      const params = paramsDeAnimal.safeParse(peticion.params)
      const cuerpo = corregirFiliacionSchema.safeParse(peticion.body)
      if (!params.success || !cuerpo.success) {
        return cuerpoInvalido(respuesta)
      }

      const datos = cuerpo.data
      return enviar(respuesta, 200, filiacionConHistoriaSchema, () =>
        herd.corregirFiliacion({
          commandId: datos.commandId,
          ranchId: sesion.ranchId,
          recordedBy: sesion.recordedBy,
          criaId: params.data.id,
          version: datos.version,
          motivo: datos.motivo,
          madre: datos.madre,
          padre: datos.padre,
          nota: datos.nota,
          fechaNacimiento: datos.fechaNacimiento,
          precisionFecha: datos.precisionFecha,
        }),
      )
    },
  )

  app.get('/api/animals/:id/family', { preHandler: exigirRol(ROLES) }, async (peticion, respuesta) => {
    const sesion = exigirSesion(peticion.sesionActiva)
    const params = paramsDeAnimal.safeParse(peticion.params)
    if (!params.success) {
      return cuerpoInvalido(respuesta)
    }

    return enviar(respuesta, 200, familiaSchema, async () => {
      const familia = await herd.familia(sesion.ranchId, params.data.id)
      if (familia === null) {
        throw new RechazoDeHerd('no_encontrado')
      }
      return familia
    })
  })
}

function exigirSesion<T extends { ranchId: string; recordedBy: string } | null>(
  sesion: T,
): NonNullable<T> {
  if (sesion === null) {
    throw new Error('La guardia dejó pasar una petición sin sesión.')
  }
  return sesion
}

function cuerpoInvalido(respuesta: FastifyReply) {
  return respuesta
    .header('cache-control', 'no-store')
    .code(400)
    .send(errorDeNacimientoSchema.parse({ codigo: 'cuerpo_invalido' }))
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
      .send(errorDeNacimientoSchema.parse({ codigo: traducido.codigo }))
  }
}

function traducir(error: unknown): { codigo: ErrorDeNacimiento['codigo']; estado: number } | null {
  if (error instanceof ConflictoDeVersion) {
    return { codigo: 'version_conflict', estado: 409 }
  }
  if (error instanceof ConflictoDeIdempotencia) {
    return { codigo: 'idempotency_mismatch', estado: 409 }
  }
  if (error instanceof RechazoDeHerd) {
    const codigo = codigoDeErrorDeNacimientoSchema.safeParse(error.codigo)
    if (!codigo.success) {
      return null
    }
    return { codigo: codigo.data, estado: estadoDe(codigo.data) }
  }
  return null
}

function estadoDe(codigo: ErrorDeNacimiento['codigo']): number {
  if (codigo === 'no_encontrado') {
    return 404
  }
  if (
    codigo === 'animal_ya_existe' ||
    codigo === 'filiacion_ya_existe' ||
    codigo === 'marca_ya_existe' ||
    codigo === 'marca_siniiga_duplicada'
  ) {
    return 409
  }
  if (
    codigo === 'filiacion_incoherente' ||
    codigo === 'progenitor_ausente' ||
    codigo === 'tenencia_de_cria' ||
    codigo === 'unico_toro_no_aplica' ||
    codigo === 'marca_invalida' ||
    codigo === 'correccion_vacia' ||
    codigo === 'motivo_vacio' ||
    codigo === 'dia_invalido' ||
    codigo === 'texto_invalido'
  ) {
    return 422
  }
  return 422
}
