export const NOMBRE_COOKIE_DE_SESION = 'rancho_sesion'

export function cookieDeSesion(token: string, produccion: boolean, maxAgeSegundos: number): string {
  return `${NOMBRE_COOKIE_DE_SESION}=${token}; ${atributos(produccion, maxAgeSegundos)}`
}

export function cookieDeCierre(produccion: boolean): string {
  return `${NOMBRE_COOKIE_DE_SESION}=; ${atributos(produccion, 0)}`
}

export function leerCookie(cabecera: string | undefined, nombre: string): string | null {
  if (cabecera === undefined || cabecera === '') {
    return null
  }

  for (const parte of cabecera.split(';')) {
    const separador = parte.indexOf('=')
    if (separador === -1) {
      continue
    }
    const clave = parte.slice(0, separador).trim()
    if (clave !== nombre) {
      continue
    }
    const valor = parte.slice(separador + 1).trim()
    return valor === '' ? null : valor
  }

  return null
}

function atributos(produccion: boolean, maxAgeSegundos: number): string {
  const partes = ['HttpOnly', 'Path=/', 'SameSite=Lax', `Max-Age=${maxAgeSegundos}`]
  if (produccion) {
    partes.push('Secure')
  }
  return partes.join('; ')
}
