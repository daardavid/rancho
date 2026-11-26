import type { AlmacenDeIdempotencia } from '../../../shared-kernel/idempotencia'
import { ejecutarComandoIdempotente } from '../../../shared-kernel/idempotencia'
import { animalIdSchema, ranchIdSchema, type RanchId } from '../../../shared-kernel/ids'
import type { RecordedBy } from '../../../shared-kernel/actores'
import { ConflictoDeVersion } from '../../../shared-kernel/conflictos'
import { z } from 'zod'

import type { Animal } from '../domain/animal'
import { RechazoDeHerd } from '../domain/errores'
import {
  abrirFiliacion,
  corregirFiliacion,
  exigirUnicoToro,
  type LadoDeFiliacion,
  type PrecisionDeFecha,
} from '../domain/filiacion'
import { crearMarca, type Marca } from '../domain/marca'
import { animalDeNacimiento } from '../domain/nacimiento'
import type { Sexo, Tenencia, TipoDeMarca } from '../domain/valores'
import type { RepositorioDeAnimales } from './repositorio'
import type { RepositorioDeFiliacion } from './repositorio-filiacion'
import {
  publicarAnimal,
  publicarCorreccionDeFiliacion,
  publicarFiliacion,
  type FichaConHistoria,
  type FiliacionConHistoria,
  type FiliacionPublica,
} from './publicar'

export type DepsDeNacimiento = {
  readonly animales: RepositorioDeAnimales
  readonly filiacion: RepositorioDeFiliacion
  readonly idempotencia: AlmacenDeIdempotencia
}

export type MarcaDeNacimiento = {
  readonly marcaId: string
  readonly tipo: TipoDeMarca
  readonly valor: string
}

export type EntradaRegistrarNacimiento = {
  readonly commandId: string
  readonly ranchId: RanchId
  readonly recordedBy: RecordedBy
  readonly id: string
  readonly filiacionId: string
  readonly nombre?: string
  readonly sexo?: Sexo
  readonly tenencia?: Tenencia
  readonly marca?: MarcaDeNacimiento
  readonly fechaNacimiento: string | null
  readonly precisionFecha: PrecisionDeFecha | null
  readonly madre: LadoDeFiliacion
  readonly padre: LadoDeFiliacion
  readonly nota?: string | null
}

export type EntradaCorregirFiliacion = {
  readonly commandId: string
  readonly ranchId: RanchId
  readonly recordedBy: RecordedBy
  readonly criaId: string
  readonly version: number
  readonly motivo: string
  readonly madre: LadoDeFiliacion
  readonly padre: LadoDeFiliacion
  readonly nota: string | null
  readonly fechaNacimiento: string | null
  readonly precisionFecha: PrecisionDeFecha | null
}

export type ResumenDeAnimal = {
  readonly id: string
  readonly nombre: string | null
  readonly sexo: Sexo
  readonly categoria: Animal['categoria']
}

export type CriaPublica = {
  readonly animal: ResumenDeAnimal
  readonly como: 'madre' | 'padre'
  readonly certeza: LadoDeFiliacion['certeza']
  readonly motivo: LadoDeFiliacion['motivo']
}

export type FamiliaPublica = {
  readonly filiacion: FiliacionConHistoria | null
  readonly madre: ResumenDeAnimal | null
  readonly padre: ResumenDeAnimal | null
  readonly crias: readonly CriaPublica[]
  /**
   * Madre y padre citados en la filiación vigente o en su historia. Incluye
   * a quien ya no está activo: el hato solo lista activos y la historia no
   * puede depender de esa lista para decir el nombre.
   */
  readonly referidos: readonly ResumenDeAnimal[]
}

export type NacimientoPublico = {
  readonly animal: FichaConHistoria
  readonly filiacion: FiliacionPublica
}

/**
 * Registra el nacimiento: la cría y su filiación en la misma transacción, o
 * nada. El mismo comando devuelve lo ya guardado; otro contenido con ese id
 * es `idempotency_mismatch`.
 */
export async function registrarNacimiento(
  deps: DepsDeNacimiento,
  entrada: EntradaRegistrarNacimiento,
): Promise<NacimientoPublico> {
  return ejecutarComandoIdempotente(
    deps.idempotencia,
    entrada.commandId,
    {
      comando: 'registrar_nacimiento',
      ranchId: entrada.ranchId,
      recordedBy: entrada.recordedBy,
      id: entrada.id,
      filiacionId: entrada.filiacionId,
      nombre: entrada.nombre ?? null,
      sexo: entrada.sexo ?? 'unknown',
      tenencia: entrada.tenencia ?? 'unknown',
      marca: entrada.marca ?? null,
      fechaNacimiento: entrada.fechaNacimiento,
      precisionFecha: entrada.precisionFecha,
      madre: entrada.madre,
      padre: entrada.padre,
      nota: entrada.nota ?? null,
    },
    async () => {
      const ranchId = ranchIdSchema.parse(entrada.ranchId)
      const criaId = animalIdSchema.parse(entrada.id)
      const cuando = new Date()

      const filiacion = abrirFiliacion({
        id: exigirUuid(entrada.filiacionId),
        ranchId,
        criaId,
        madre: entrada.madre,
        padre: entrada.padre,
        nota: entrada.nota ?? null,
        fechaNacimiento: entrada.fechaNacimiento,
        precisionFecha: entrada.precisionFecha,
        recordedBy: entrada.recordedBy,
        recordedAt: cuando,
      })

      const madre = await progenitor(deps.animales, ranchId, filiacion.madre, 'madre')
      await progenitor(deps.animales, ranchId, filiacion.padre, 'padre')
      await exigirToroUnico(deps.animales, ranchId, filiacion.padre)

      const animal = animalDeNacimiento({
        id: criaId,
        ranchId,
        recordedBy: entrada.recordedBy,
        recordedAt: cuando,
        tenencia: tenenciaDeLaCria(madre, entrada.tenencia),
        ...(entrada.nombre !== undefined ? { nombre: entrada.nombre } : {}),
        ...(entrada.sexo !== undefined ? { sexo: entrada.sexo } : {}),
      })

      await deps.animales.insertar(animal)

      const marcas: Marca[] = []
      if (entrada.marca !== undefined) {
        const marca = crearMarca({
          id: exigirUuid(entrada.marca.marcaId),
          ranchId,
          animalId: criaId,
          tipo: entrada.marca.tipo,
          valor: entrada.marca.valor,
          recordedBy: entrada.recordedBy,
          recordedAt: cuando,
        })
        await deps.animales.insertarMarca(marca)
        marcas.push(marca)
      }

      await deps.filiacion.insertar(filiacion)

      return {
        animal: { ...publicarAnimal(animal, marcas, null), correcciones: [], correccionesDeSalida: [] },
        filiacion: publicarFiliacion(filiacion),
      }
    },
  )
}

/**
 * Corrige la filiación y conserva la certeza anterior. La ficha del animal no
 * se escribe: este comando no la toca.
 */
export async function corregirFiliacionDeCria(
  deps: DepsDeNacimiento,
  entrada: EntradaCorregirFiliacion,
): Promise<FiliacionConHistoria> {
  return ejecutarComandoIdempotente(
    deps.idempotencia,
    entrada.commandId,
    {
      comando: 'corregir_filiacion',
      ranchId: entrada.ranchId,
      recordedBy: entrada.recordedBy,
      criaId: entrada.criaId,
      version: entrada.version,
      motivo: entrada.motivo,
      madre: entrada.madre,
      padre: entrada.padre,
      nota: entrada.nota,
      fechaNacimiento: entrada.fechaNacimiento,
      precisionFecha: entrada.precisionFecha,
    },
    async () => {
      const ranchId = ranchIdSchema.parse(entrada.ranchId)
      const criaId = animalIdSchema.parse(entrada.criaId)
      const actual = await deps.filiacion.obtenerPorCria(ranchId, criaId, true)
      if (actual === null) {
        throw new RechazoDeHerd('no_encontrado')
      }
      if (actual.version !== entrada.version) {
        throw new ConflictoDeVersion()
      }

      const corregida = corregirFiliacion(
        actual,
        {
          madre: entrada.madre,
          padre: entrada.padre,
          nota: entrada.nota,
          fechaNacimiento: entrada.fechaNacimiento,
          precisionFecha: entrada.precisionFecha,
        },
        entrada.motivo,
      )

      await progenitor(deps.animales, ranchId, corregida.filiacion.madre, 'madre')
      await progenitor(deps.animales, ranchId, corregida.filiacion.padre, 'padre')
      // El único toro se exige al asignarlo. Si el padre guardado no cambió,
      // una corrección de la madre, la fecha o la nota no lo vuelve a juzgar:
      // el hato pudo ganar o perder toros después, y el motivo ya estaba escrito.
      if (ladoDistinto(actual.padre, corregida.filiacion.padre)) {
        await exigirToroUnico(deps.animales, ranchId, corregida.filiacion.padre)
      }

      const cuando = new Date()
      await deps.filiacion.guardarCorreccion({
        filiacion: corregida.filiacion,
        versionLeida: entrada.version,
        anterior: corregida.anterior,
        motivo: corregida.motivo,
        correctedBy: entrada.recordedBy,
        correctedAt: cuando,
      })

      const correcciones = await deps.filiacion.correccionesDe(ranchId, actual.id)
      return {
        ...publicarFiliacion(corregida.filiacion),
        correcciones: correcciones.map((correccion) =>
          publicarCorreccionDeFiliacion(
            correccion,
            correccion.motivo,
            correccion.correctedBy,
            correccion.correctedAt,
          ),
        ),
      }
    },
  )
}

/** Madre, padre y crías de un animal. Si el animal no está en el rancho, no hay familia. */
export async function familiaDe(
  deps: DepsDeNacimiento,
  ranchId: RanchId,
  animalId: string,
): Promise<FamiliaPublica | null> {
  const id = animalIdSchema.parse(animalId)
  const alcance = ranchIdSchema.parse(ranchId)
  const animal = await deps.animales.obtener(alcance, id, false)
  if (animal === null) {
    return null
  }

  const filiacion = await deps.filiacion.obtenerPorCria(alcance, id, false)
  const correcciones =
    filiacion === null ? [] : await deps.filiacion.correccionesDe(alcance, filiacion.id)
  const crias = await deps.filiacion.criasDe(alcance, id)

  const ids = new Set<string>()
  const idsDeReferidos = new Set<string>()
  const anotarReferido = (citado: string | null | undefined): void => {
    if (citado === undefined || citado === null) {
      return
    }
    ids.add(citado)
    idsDeReferidos.add(citado)
  }
  anotarReferido(filiacion?.madre.animalId)
  anotarReferido(filiacion?.padre.animalId)
  for (const correccion of correcciones) {
    anotarReferido(correccion.madre.animalId)
    anotarReferido(correccion.padre.animalId)
  }
  for (const cria of crias) {
    ids.add(cria.criaId)
  }

  const encontrados =
    ids.size === 0
      ? []
      : await deps.animales.obtenerVarios(
          alcance,
          [...ids].map((pedido) => animalIdSchema.parse(pedido)),
        )
  const porId = new Map<string, ResumenDeAnimal>(encontrados.map((fila) => [fila.id, resumir(fila)]))
  const referidos = encontrados.filter((fila) => idsDeReferidos.has(fila.id)).map(resumir)

  return {
    filiacion:
      filiacion === null
        ? null
        : {
            ...publicarFiliacion(filiacion),
            correcciones: correcciones.map((correccion) =>
              publicarCorreccionDeFiliacion(
                correccion,
                correccion.motivo,
                correccion.correctedBy,
                correccion.correctedAt,
              ),
            ),
          },
    madre: buscar(porId, filiacion?.madre.animalId),
    padre: buscar(porId, filiacion?.padre.animalId),
    crias: crias.flatMap((cria) => {
      const resumen = porId.get(cria.criaId)
      if (resumen === undefined) {
        return []
      }
      return [{ animal: resumen, como: cria.como, certeza: cria.certeza, motivo: cria.motivo }]
    }),
    referidos,
  }
}

/**
 * La cría de una madre «a la parte» queda con tenencia desconocida: el reparto
 * no está definido. Si la madre no está en ese arreglo, vale la tenencia que
 * se eligió, o desconocida si no se eligió ninguna.
 */
function tenenciaDeLaCria(madre: Animal | null, pedida: Tenencia | undefined): Tenencia {
  if (madre !== null && madre.tenencia === 'a_la_parte') {
    if (pedida !== undefined && pedida !== 'unknown') {
      throw new RechazoDeHerd('tenencia_de_cria')
    }
    return 'unknown'
  }
  return pedida ?? 'unknown'
}

async function progenitor(
  animales: RepositorioDeAnimales,
  ranchId: RanchId,
  lado: LadoDeFiliacion,
  rol: 'madre' | 'padre',
): Promise<Animal | null> {
  if (lado.animalId === null) {
    return null
  }
  const animal = await animales.obtener(ranchId, animalIdSchema.parse(lado.animalId), false)
  if (animal === null) {
    throw new RechazoDeHerd('progenitor_ausente')
  }
  const esMacho = animal.sexo === 'male' || animal.categoria === 'bull'
  const esHembra = animal.sexo === 'female' || animal.categoria === 'cow'
  if ((rol === 'madre' && esMacho) || (rol === 'padre' && esHembra && !esMacho)) {
    throw new RechazoDeHerd('filiacion_incoherente')
  }
  return animal
}

/** Certeza, animal y motivo. Es lo que decide si el padre de la corrección cambió. */
function ladoDistinto(actual: LadoDeFiliacion, corregido: LadoDeFiliacion): boolean {
  return (
    actual.certeza !== corregido.certeza ||
    actual.animalId !== corregido.animalId ||
    actual.motivo !== corregido.motivo
  )
}

async function exigirToroUnico(
  animales: RepositorioDeAnimales,
  ranchId: RanchId,
  padre: LadoDeFiliacion,
): Promise<void> {
  if (padre.motivo !== 'unico_toro') {
    return
  }
  const activos = await animales.listarActivos(ranchId)
  const toros = activos.filter((animal) => animal.categoria === 'bull').map((animal) => animal.id)
  exigirUnicoToro(padre, toros)
}

function resumir(animal: Animal): ResumenDeAnimal {
  return {
    id: animal.id,
    nombre: animal.nombre,
    sexo: animal.sexo,
    categoria: animal.categoria,
  }
}

function buscar(
  porId: ReadonlyMap<string, ResumenDeAnimal>,
  animalId: string | null | undefined,
): ResumenDeAnimal | null {
  if (animalId === undefined || animalId === null) {
    return null
  }
  return porId.get(animalId) ?? null
}

function exigirUuid(valor: string): string {
  const leido = z.uuid().safeParse(valor)
  if (!leido.success) {
    throw new RechazoDeHerd('filiacion_incoherente')
  }
  return leido.data
}
