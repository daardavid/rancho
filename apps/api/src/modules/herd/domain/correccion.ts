import type { RecordedBy } from '../../../shared-kernel/actores'

import type { CampoDeFicha } from './valores'

/** Una fila de historia: el valor que estaba, quién lo cambió, cuándo y por qué. */
export type Correccion = {
  readonly campo: CampoDeFicha
  readonly valorAnterior: string | null
  readonly motivo: string
  readonly correctedBy: RecordedBy
  readonly correctedAt: Date
}
