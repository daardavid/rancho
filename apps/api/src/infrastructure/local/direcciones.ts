import { networkInterfaces, type NetworkInterfaceInfo } from 'node:os'

export type DireccionDeRed = {
  readonly address: string
  readonly family: string | number
  readonly internal: boolean
}

/** IPv4 que no son de loopback. Son las que puede usar el celular en la misma WiFi. */
export function direccionesIpv4(
  interfaces: Readonly<Record<string, readonly DireccionDeRed[] | undefined>>,
): string[] {
  const encontradas: string[] = []
  for (const lista of Object.values(interfaces)) {
    if (lista === undefined) {
      continue
    }
    for (const info of lista) {
      const ipv4 = info.family === 4 || info.family === 'IPv4'
      if (!ipv4 || info.internal) {
        continue
      }
      encontradas.push(info.address)
    }
  }
  return encontradas
}

export function direccionesDeEstaMaquina(): string[] {
  return direccionesIpv4(networkInterfaces() as Record<string, NetworkInterfaceInfo[] | undefined>)
}

/** Líneas para la consola: esta máquina y, si hay, el celular. */
export function lineasParaAbrir(puerto: number, direcciones: readonly string[]): string[] {
  const lineas = [`En esta máquina: http://127.0.0.1:${String(puerto)}/`]
  if (direcciones.length === 0) {
    lineas.push(
      'No encontré una dirección de la red. En el celular usa la IP de esta máquina, en la misma WiFi.',
    )
    return lineas
  }
  for (const ip of direcciones) {
    lineas.push(`Desde el celular, en la misma WiFi: http://${ip}:${String(puerto)}/`)
  }
  return lineas
}

export function puertoEscuchando(servidor: {
  address(): string | { port: number } | null
}): number {
  const direccion = servidor.address()
  if (typeof direccion === 'object' && direccion !== null) {
    return direccion.port
  }
  throw new Error('El servidor no está escuchando.')
}
