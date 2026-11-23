import type { Animal } from '../domain/animal'
import type { Correccion } from '../domain/correccion'
import type { Marca } from '../domain/marca'
import type {
  Categoria,
  EstadoDeMarca,
  ParticipacionEconomica,
  Sexo,
  Tenencia,
  TipoDeMarca,
  CampoDeFicha,
} from '../domain/valores'

/** Lo que sale del módulo. Fechas en texto para que el reintento idempotente no las pierda. */
export type MarcaPublica = {
  readonly id: string
  readonly tipo: TipoDeMarca
  readonly valor: string
  readonly desde: string | null
  readonly estado: EstadoDeMarca
  readonly cambiadaEl: string | null
  readonly recordedBy: string
  readonly recordedAt: string
}

export type FichaAnimal = {
  readonly id: string
  readonly nombre: string | null
  readonly sexo: Sexo
  readonly categoria: Categoria
  readonly detalleCategoria: string | null
  readonly tenencia: Tenencia
  readonly participacionEconomica: ParticipacionEconomica
  readonly notaDelArreglo: string | null
  readonly nota: string | null
  readonly activo: boolean
  readonly version: number
  readonly recordedBy: string
  readonly recordedAt: string
  readonly marcas: readonly MarcaPublica[]
}

export type CorreccionPublica = {
  readonly campo: CampoDeFicha
  readonly valorAnterior: string | null
  readonly motivo: string
  readonly correctedBy: string
  readonly correctedAt: string
}

export type FichaConHistoria = FichaAnimal & {
  readonly correcciones: readonly CorreccionPublica[]
}

export function publicarMarca(marca: Marca): MarcaPublica {
  return {
    id: marca.id,
    tipo: marca.tipo,
    valor: marca.valor,
    desde: marca.desde,
    estado: marca.estado,
    cambiadaEl: marca.cambiadaEl,
    recordedBy: marca.recordedBy,
    recordedAt: marca.recordedAt.toISOString(),
  }
}

export function publicarAnimal(animal: Animal, marcas: readonly Marca[]): FichaAnimal {
  return {
    id: animal.id,
    nombre: animal.nombre,
    sexo: animal.sexo,
    categoria: animal.categoria,
    detalleCategoria: animal.detalleCategoria,
    tenencia: animal.tenencia,
    participacionEconomica: animal.participacionEconomica,
    notaDelArreglo: animal.notaDelArreglo,
    nota: animal.nota,
    activo: animal.activo,
    version: animal.version,
    recordedBy: animal.recordedBy,
    recordedAt: animal.recordedAt.toISOString(),
    marcas: marcas.map(publicarMarca),
  }
}

export function publicarCorreccion(correccion: Correccion): CorreccionPublica {
  return {
    campo: correccion.campo,
    valorAnterior: correccion.valorAnterior,
    motivo: correccion.motivo,
    correctedBy: correccion.correctedBy,
    correctedAt: correccion.correctedAt.toISOString(),
  }
}
