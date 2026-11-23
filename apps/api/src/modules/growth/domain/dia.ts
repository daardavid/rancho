import { RechazoDeGrowth } from './errores'

/**
 * El día en que se pesó, `YYYY-MM-DD`, sin hora.
 *
 * No es el instante en que alguien lo anotó. `Date.UTC` desborda el 31 de
 * febrero; por eso se vuelve a leer el resultado.
 */
export function diaDeCalendario(valor: string): string {
  const coincidencia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor)
  if (coincidencia === null) {
    throw new RechazoDeGrowth('dia_invalido')
  }

  const anio = Number(coincidencia[1])
  const mes = Number(coincidencia[2])
  const dia = Number(coincidencia[3])
  const fecha = new Date(Date.UTC(anio, mes - 1, dia))
  const real =
    fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia

  if (!real) {
    throw new RechazoDeGrowth('dia_invalido')
  }

  return valor
}
