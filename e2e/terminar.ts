/**
 * Apaga lo que levantó `globalSetup`.
 *
 * Sin esto, el proceso de Playwright puede terminar dejando la base y el
 * servidor abiertos, y la corrida siguiente encontraría el puerto ocupado.
 */
export default async function terminar(): Promise<void> {
  const cerrar = globalThis.__ranchoE2eCerrar
  globalThis.__ranchoE2eCerrar = undefined

  if (cerrar !== undefined) {
    await cerrar()
  }
}
