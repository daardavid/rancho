import type { Animal } from '../domain/animal'
import type { Correccion } from '../domain/correccion'
import type {
  CertezaDeFiliacion,
  Filiacion,
  FiliacionAnterior,
  LadoDeFiliacion,
  MotivoDeInferencia,
  PrecisionDeFecha,
} from '../domain/filiacion'
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

export type LadoPublico = {
  readonly certeza: CertezaDeFiliacion
  readonly animalId: string | null
  readonly motivo: MotivoDeInferencia | null
}

export type FiliacionPublica = {
  readonly id: string
  readonly criaId: string
  readonly madre: LadoPublico
  readonly padre: LadoPublico
  readonly nota: string | null
  readonly fechaNacimiento: string | null
  readonly precisionFecha: PrecisionDeFecha | null
  readonly version: number
  readonly recordedBy: string
  readonly recordedAt: string
}

export type CorreccionDeFiliacionPublica = {
  readonly madre: LadoPublico
  readonly padre: LadoPublico
  readonly nota: string | null
  readonly fechaNacimiento: string | null
  readonly precisionFecha: PrecisionDeFecha | null
  readonly motivo: string
  readonly correctedBy: string
  readonly correctedAt: string
}

export type FiliacionConHistoria = FiliacionPublica & {
  readonly correcciones: readonly CorreccionDeFiliacionPublica[]
}

export function publicarLado(lado: LadoDeFiliacion): LadoPublico {
  return {
    certeza: lado.certeza,
    animalId: lado.animalId,
    motivo: lado.motivo,
  }
}

export function publicarFiliacion(filiacion: Filiacion): FiliacionPublica {
  return {
    id: filiacion.id,
    criaId: filiacion.criaId,
    madre: publicarLado(filiacion.madre),
    padre: publicarLado(filiacion.padre),
    nota: filiacion.nota,
    fechaNacimiento: filiacion.fechaNacimiento,
    precisionFecha: filiacion.precisionFecha,
    version: filiacion.version,
    recordedBy: filiacion.recordedBy,
    recordedAt: filiacion.recordedAt.toISOString(),
  }
}

export function publicarCorreccionDeFiliacion(
  anterior: FiliacionAnterior,
  motivo: string,
  correctedBy: string,
  correctedAt: Date,
): CorreccionDeFiliacionPublica {
  return {
    madre: publicarLado(anterior.madre),
    padre: publicarLado(anterior.padre),
    nota: anterior.nota,
    fechaNacimiento: anterior.fechaNacimiento,
    precisionFecha: anterior.precisionFecha,
    motivo,
    correctedBy,
    correctedAt: correctedAt.toISOString(),
  }
}
