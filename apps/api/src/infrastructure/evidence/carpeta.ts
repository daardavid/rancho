import { join } from 'node:path'

import { raizDelRepo } from '../local/construir'

/**
 * Dónde viven los bytes en esta máquina.
 *
 * Por omisión es `.datos/evidencia`, que git ya ignora junto con la base
 * local. `EVIDENCE_DIR` la mueve sin cambiar la llave `{ranchId}/{evidenceId}`.
 */
export function carpetaDeEvidencia(env: NodeJS.ProcessEnv = process.env): string {
  const dada = env['EVIDENCE_DIR']?.trim()
  if (dada !== undefined && dada !== '') {
    return dada
  }
  return join(raizDelRepo(), '.datos', 'evidencia')
}
