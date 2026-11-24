import { levantar } from './aplicacion'

/**
 * Playwright llama a `globalSetup` una vez, en su proceso principal, antes de
 * la primera prueba. Aquí se levanta la aplicación construida.
 *
 * Cómo apagarla se guarda en `globalThis` porque `globalTeardown` es otra
 * invocación del módulo; una variable de este archivo no sobreviviría.
 */
declare global {
  var __ranchoE2eCerrar: (() => Promise<void>) | undefined
}

export default async function preparar(): Promise<void> {
  globalThis.__ranchoE2eCerrar = await levantar()
}
