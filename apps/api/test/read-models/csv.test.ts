import { describe, expect, it } from 'vitest'

import { aCsv, disposicion, nombreDeArchivo } from '../../src/read-models/csv'

describe('CSV para Excel', () => {
  it('deja los kilos como texto y cita coma, comilla y acento', () => {
    const csv = aCsv(
      ['Kilos', 'Nota'],
      [
        ['350.500', 'Se murió, lo dijo "el vaquero"'],
        ['100.000', 'Cayó el agua'],
      ],
    )

    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(csv.includes('\r\n')).toBe(true)
    const filas = parsear(csv)
    expect(filas[0]).toEqual(['Kilos', 'Nota'])
    expect(filas[1]).toEqual(['350.500', 'Se murió, lo dijo "el vaquero"'])
    expect(filas[2]).toEqual(['100.000', 'Cayó el agua'])
    expect(csv.includes('"Se murió, lo dijo ""el vaquero"""')).toBe(true)
  })

  it('arma el nombre con el rancho y el día, y conserva el acento en el encabezado', () => {
    expect(nombreDeArchivo('El Cebú', 'hato', '2026-11-26')).toBe('El Cebú - hato - 2026-11-26.csv')
    expect(nombreDeArchivo('Rancho / norte', 'pesos', '2026-11-26')).toBe(
      'Rancho norte - pesos - 2026-11-26.csv',
    )

    const encabezado = disposicion('El Cebú - eventos - 2026-11-26.csv')
    expect(encabezado).toContain('filename="El Cebu - eventos - 2026-11-26.csv"')
    expect(encabezado).toContain(`filename*=UTF-8''${encodeURIComponent('El Cebú - eventos - 2026-11-26.csv')}`)
  })
})

function parsear(cuerpo: string): string[][] {
  const texto = cuerpo.startsWith('\uFEFF') ? cuerpo.slice(1) : cuerpo
  const filas: string[][] = []
  let fila: string[] = []
  let celda = ''
  let entreComillas = false

  for (let i = 0; i < texto.length; i += 1) {
    const char = texto[i] ?? ''
    if (entreComillas) {
      if (char === '"') {
        if (texto[i + 1] === '"') {
          celda += '"'
          i += 1
        } else {
          entreComillas = false
        }
      } else {
        celda += char
      }
      continue
    }
    if (char === '"') {
      entreComillas = true
      continue
    }
    if (char === ',') {
      fila.push(celda)
      celda = ''
      continue
    }
    if (char === '\r') {
      continue
    }
    if (char === '\n') {
      fila.push(celda)
      filas.push(fila)
      fila = []
      celda = ''
      continue
    }
    celda += char
  }

  return filas
}
