/**
 * Modelos de lectura. Consultan y no escriben: pueden leer tablas de varios
 * esquemas para un `SELECT`, y no usan repositorios de escritura ni comandos de
 * módulo ([persistence-strategy.md](../../../../docs/architecture/persistence-strategy.md)).
 *
 * `crecimiento.ts` es `AnimalGrowthView` y el resumen del hato. Lo derivado —la
 * ganancia de peso— se calcula en la consulta y no se guarda en ninguna tabla.
 */
export {
  crearModelosDeCrecimiento,
  type Categoria,
  type FilaDelResumen,
  type HuecoDePesaje,
  type IntervaloDeCrecimiento,
  type ModelosDeCrecimiento,
  type PesoConocido,
  type PesoEnLaVista,
  type PuntoDeCrecimiento,
  type ResumenDelHato,
  type VistaDeAnimal,
} from './crecimiento'
export { crearModelosDeTendencias, type ModelosDeTendencias } from './tendencias'
export {
  crearModelosDeCria,
  type DiagnosticoEnLaVista,
  type FilaDeVaca,
  type HistorialDeCria,
  type IntervaloEntrePartos,
  type ListaDeVacas,
  type ModelosDeCria,
  type DesteteDelAnimal,
  type ListaDeKilosDestetados,
  type Parto,
} from './cria'
export {
  crearModelosDePresencia,
  type AnimalDelInicio,
  type AnimalSinVerse,
  type ModelosDePresencia,
  type Observacion,
  type OrigenDeObservacion,
  type UltimaObservacion,
  type VistaDeInicio,
} from './presencia'
export {
  crearModelosDeResumen,
  type ModelosDeResumen,
  type VistaDeResumenSemanal,
} from './resumen'
export { crearModelosDeExportacion, type ArchivoCsv, type ModelosDeExportacion } from './exportacion'
