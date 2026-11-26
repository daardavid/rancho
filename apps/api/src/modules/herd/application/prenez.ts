import {
  ejecutarComandoIdempotente,
  type AlmacenDeIdempotencia,
} from '../../../shared-kernel/idempotencia'
import { animalIdSchema, ranchIdSchema, type RanchId } from '../../../shared-kernel/ids'
import type { RecordedBy } from '../../../shared-kernel/actores'
import { ConflictoDeVersion } from '../../../shared-kernel/conflictos'
import { z } from 'zod'

import { RechazoDeHerd } from '../domain/errores'
import {
  abrirDiagnostico,
  corregirDiagnostico,
  esMachoConocido,
  type CambiosDeDiagnostico,
  type ResultadoDePrenez,
} from '../domain/prenez'
import { vistoElegido } from '../domain/salud'
import {
  publicarCorreccionDeDiagnostico,
  publicarDiagnostico,
  type DiagnosticoConHistoria,
  type DiagnosticosAnotadosPublicos,
} from './publicar-prenez'
import type { RepositorioDeAnimales } from './repositorio'
import type { RepositorioDePrenez } from './repositorio-prenez'

/** Una hembra de la captura y el id que el cliente acuñó para su diagnóstico. */
export type AnimalDelDiagnostico = {
  readonly animalId: string
  readonly diagnosticoId: string
}

export type EntradaAnotarDiagnostico = {
  readonly commandId: string
  readonly ranchId: RanchId
  readonly recordedBy: RecordedBy
  readonly fecha: string
  readonly resultado: ResultadoDePrenez
  readonly reportedBy?: string | null
  readonly nota?: string | null
  /** Obligatorio. Si no viene, no se guarda «no se vio». `null` es «No sé». */
  readonly vioAlAnimal?: boolean | null
  readonly animales: readonly AnimalDelDiagnostico[]
}

export type EntradaCorregirDiagnostico = {
  readonly commandId: string
  readonly ranchId: RanchId
  readonly recordedBy: RecordedBy
  readonly diagnosticoId: string
  readonly version: number
  readonly motivo: string
  readonly cambios: CambiosDeDiagnostico
}

export type DepsDePrenez = {
  readonly animales: RepositorioDeAnimales
  readonly prenez: RepositorioDePrenez
  readonly idempotencia: AlmacenDeIdempotencia
}

/**
 * Anota un diagnóstico a una hembra o a un grupo.
 *
 * Todo va en una sola transacción: o quedan todos o ninguno. Cada hembra
 * recibe su propia fila, así que corregir el de una no toca el de las demás.
 * Un macho conocido y un animal que ya salió se rechazan y no se escribe nada.
 * El diagnóstico no es una observación salvo que diga que se vio al animal.
 */
export async function anotarDiagnostico(
  deps: DepsDePrenez,
  entrada: EntradaAnotarDiagnostico,
): Promise<DiagnosticosAnotadosPublicos> {
  const vioAlAnimal = vistoElegido(entrada.vioAlAnimal)
  const animales = ordenarSinRepetir(entrada.animales)
  const contenido = {
    comando: 'anotar_diagnostico',
    ranchId: entrada.ranchId,
    recordedBy: entrada.recordedBy,
    fecha: entrada.fecha,
    resultado: entrada.resultado,
    reportedBy: entrada.reportedBy ?? null,
    nota: entrada.nota ?? null,
    vioAlAnimal,
    animales,
  }

  return ejecutarComandoIdempotente(deps.idempotencia, entrada.commandId, contenido, async () => {
    if (animales.length === 0) {
      throw new RechazoDeHerd('diagnostico_vacio')
    }
    const ranchId = ranchIdSchema.parse(entrada.ranchId)
    await exigirHembras(deps, ranchId, animales)

    const cuando = new Date()
    const diagnosticos: DiagnosticoConHistoria[] = []
    for (const animal of animales) {
      const diagnostico = abrirDiagnostico({
        id: exigirId(animal.diagnosticoId, 'diagnostico_ya_existe'),
        ranchId,
        animalId: animalIdSchema.parse(animal.animalId),
        fecha: entrada.fecha,
        resultado: entrada.resultado,
        reportedBy: entrada.reportedBy ?? null,
        nota: entrada.nota ?? null,
        vioAlAnimal,
        recordedBy: entrada.recordedBy,
        recordedAt: cuando,
      })
      await deps.prenez.insertar(diagnostico)
      diagnosticos.push({ ...publicarDiagnostico(diagnostico), correcciones: [] })
    }
    return { diagnosticos }
  })
}

/**
 * Corrige un diagnóstico ya asentado. Lo anterior queda en la historia, y una
 * versión vieja no cambia nada.
 */
export async function corregirDiagnosticoDe(
  deps: DepsDePrenez,
  entrada: EntradaCorregirDiagnostico,
): Promise<DiagnosticoConHistoria> {
  const contenido = {
    comando: 'corregir_diagnostico',
    ranchId: entrada.ranchId,
    recordedBy: entrada.recordedBy,
    diagnosticoId: entrada.diagnosticoId,
    version: entrada.version,
    motivo: entrada.motivo,
    cambios: entrada.cambios,
  }

  return ejecutarComandoIdempotente(deps.idempotencia, entrada.commandId, contenido, async () => {
    const ranchId = ranchIdSchema.parse(entrada.ranchId)
    const id = exigirId(entrada.diagnosticoId, 'no_encontrado')
    const actual = await deps.prenez.obtener(ranchId, id, true)
    if (actual === null) {
      throw new RechazoDeHerd('no_encontrado')
    }
    if (actual.version !== entrada.version) {
      throw new ConflictoDeVersion()
    }

    const corregido = corregirDiagnostico(actual, entrada.cambios, entrada.motivo)
    await deps.prenez.guardarCorreccion({
      diagnostico: corregido.diagnostico,
      versionLeida: entrada.version,
      anteriores: corregido.anteriores,
      motivo: corregido.motivo,
      correctedBy: entrada.recordedBy,
      correctedAt: new Date(),
    })

    const correcciones = await deps.prenez.correcciones(ranchId, corregido.diagnostico.id)
    return {
      ...publicarDiagnostico(corregido.diagnostico),
      correcciones: correcciones.map(publicarCorreccionDeDiagnostico),
    }
  })
}

function ordenarSinRepetir(animales: readonly AnimalDelDiagnostico[]): AnimalDelDiagnostico[] {
  const vistos = new Set<string>()
  const diagnosticos = new Set<string>()
  for (const animal of animales) {
    if (vistos.has(animal.animalId)) {
      throw new RechazoDeHerd('animal_repetido')
    }
    vistos.add(animal.animalId)
    if (diagnosticos.has(animal.diagnosticoId)) {
      throw new RechazoDeHerd('diagnostico_ya_existe')
    }
    diagnosticos.add(animal.diagnosticoId)
  }
  return [...animales].sort((uno, otro) => (uno.animalId < otro.animalId ? -1 : 1))
}

/**
 * Cada animal tiene que existir, seguir en el hato y no ser un macho conocido.
 * Si uno falla, no se escribe el grupo.
 */
async function exigirHembras(
  deps: DepsDePrenez,
  ranchId: RanchId,
  animales: readonly AnimalDelDiagnostico[],
): Promise<void> {
  for (const animal of animales) {
    const id = animalIdSchema.safeParse(animal.animalId)
    if (!id.success) {
      throw new RechazoDeHerd('no_encontrado')
    }
    const ficha = await deps.animales.obtener(ranchId, id.data, false)
    if (ficha === null) {
      throw new RechazoDeHerd('no_encontrado')
    }
    if (!ficha.activo) {
      throw new RechazoDeHerd('fuera_del_hato')
    }
    if (esMachoConocido(ficha.sexo, ficha.categoria)) {
      throw new RechazoDeHerd('no_es_hembra')
    }
  }
}

function exigirId(valor: string, codigo: 'no_encontrado' | 'diagnostico_ya_existe'): string {
  const leido = z.uuid().safeParse(valor)
  if (!leido.success) {
    throw new RechazoDeHerd(codigo)
  }
  return leido.data
}
