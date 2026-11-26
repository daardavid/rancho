import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, type RenderResult } from '@testing-library/react'
import { vi } from 'vitest'

import { App } from '../src/App'

/**
 * Apoyo para las pruebas de componentes.
 *
 * La API se sustituye con un `fetch` falso que contesta por ruta y método como
 * contesta la API de verdad: cuerpo JSON y código HTTP. Así lo que se prueba es
 * lo mismo que corre en el celular, incluida la validación del contrato y el
 * manejo de `version_conflict`.
 */

export const RANCHO = '11111111-1111-4111-8111-111111111111'
export const CUENTA = '22222222-2222-4222-8222-222222222222'
export const ANIMAL = '33333333-3333-4333-8333-333333333333'

export const CUANDO = '2026-11-22T15:04:05.678Z'

export type Peticion = {
  readonly ruta: string
  readonly metodo: string
  readonly cuerpo: unknown
}

export type Respuesta = { readonly estado: number; readonly cuerpo: unknown }

type RutaFalsa = (peticion: Peticion) => Respuesta | Promise<Respuesta>

/**
 * Rutas falsas por `MÉTODO /ruta`. Lo que no está contestado responde 404, para
 * que una petición inesperada se note en vez de pasar en silencio.
 */
export function montarApi(rutas: Record<string, RutaFalsa>): {
  peticiones: Peticion[]
} {
  const peticiones: Peticion[] = []

  const falso = vi.fn(async (entrada: RequestInfo | URL, inicio?: RequestInit) => {
    const ruta = String(entrada)
    const metodo = inicio?.method ?? 'GET'
    let cuerpo: unknown
    if (typeof inicio?.body === 'string') {
      cuerpo = JSON.parse(inicio.body) as unknown
    }
    const peticion: Peticion = { ruta, metodo, cuerpo }
    peticiones.push(peticion)

    const rutaFalsa = rutas[`${metodo} ${ruta}`]
    if (rutaFalsa === undefined) {
      // La ficha siempre pide la familia. Un animal dado de alta sin nacimiento
      // no tiene filiación: la API responde vacío, no 404. Quien quiera otra
      // familia la registra en su prueba.
      if (metodo === 'GET' && /^\/api\/animals\/[^/]+\/family$/.test(ruta)) {
        return Response.json(
          { filiacion: null, madre: null, padre: null, crias: [], referidos: [] },
          { status: 200 },
        )
      }
      // La ficha también pide las notas de sanidad. Sin notas anotadas la API
      // responde una lista vacía; una prueba que quiera notas las registra.
      if (metodo === 'GET' && /^\/api\/animals\/[^/]+\/health-notes$/.test(ruta)) {
        return Response.json({ animalId: ruta.split('/')[3], notas: [] }, { status: 200 })
      }
      // El pesaje compara contra todos los pesos, no contra la última vuelta.
      // Sin pesos anotados la lista va vacía; quien quiera historia la registra.
      if (metodo === 'GET' && ruta === '/api/read-models/known-weights') {
        return Response.json({ pesos: [] }, { status: 200 })
      }
      // La ficha de una hembra pide su cría. Sin partos la API responde vacío.
      if (metodo === 'GET' && /^\/api\/read-models\/destete\/[^/]+$/.test(ruta)) {
        return Response.json(
          { animalId: ruta.split('/').pop(), destete: null },
          { status: 200 },
        )
      }
      if (metodo === 'GET' && ruta === '/api/read-models/kilos-destetados') {
        return Response.json({ porPromedio: [] }, { status: 200 })
      }
      if (metodo === 'GET' && /^\/api\/read-models\/cria\/[^/]+$/.test(ruta)) {
        return Response.json(
          {
            animalId: ruta.split('/').pop(),
            partos: [],
            intervalos: [],
            partosSinFecha: 0,
            diasDesdeElUltimoParto: null,
            diagnosticos: [],
            kilosDestetados: {
              observadas: { conPeso: 0, sinPeso: 0, total: null, promedio: null },
              inferidas: { conPeso: 0, sinPeso: 0, total: null, promedio: null },
              sinPeso: [],
            },
          },
          { status: 200 },
        )
      }
      if (metodo === 'GET' && /^\/api\/read-models\/ultima-observacion\/[^/]+$/.test(ruta)) {
        return Response.json(
          { animalId: ruta.split('/').pop(), observacion: null },
          { status: 200 },
        )
      }
      return Response.json({ codigo: 'no_encontrado' }, { status: 404 })
    }

    const respuesta = await rutaFalsa(peticion)
    return Response.json(respuesta.cuerpo, { status: respuesta.estado })
  })

  vi.stubGlobal('fetch', falso)

  return { peticiones }
}

/** La sesión abierta, que es lo normal después de entrar. */
export function sesionAbierta(): RutaFalsa {
  return () => ({ estado: 200, cuerpo: { cuentaId: CUENTA, rol: 'owner', ranchId: RANCHO } })
}

export function fichaDeAnimal(
  cambios: Record<string, unknown> = {},
): Record<string, unknown> {
  return { ...animalBase(), correcciones: [], correccionesDeSalida: [], ...cambios }
}

/**
 * Un animal tal como viene en la lista del hato. `listaDeAnimalesSchema` es
 * estricto y no lleva la historia de correcciones: esa solo viaja en la ficha.
 */
export function animalDeLista(
  cambios: Record<string, unknown> = {},
): Record<string, unknown> {
  return { ...animalBase(), ...cambios }
}

function animalBase(): Record<string, unknown> {
  return {
    id: ANIMAL,
    nombre: null,
    sexo: 'unknown',
    categoria: 'unknown',
    detalleCategoria: null,
    tenencia: 'unknown',
    participacionEconomica: 'unknown',
    notaDelArreglo: null,
    nota: null,
    activo: true,
    salida: null,
    version: 1,
    recordedBy: CUENTA,
    recordedAt: CUANDO,
    marcas: [],
    foto: null,
  }
}

/** Pinta la aplicación entera con la ruta que se le pida. */
export function pintarApp(hash = '#/'): RenderResult {
  window.location.hash = hash
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  return render(
    <QueryClientProvider client={cliente}>
      <App />
    </QueryClientProvider>,
  )
}

/** Un peso tal como lo devuelve la vista de crecimiento. */
export function puntoDePeso(
  kilos: string,
  fecha: string,
  intervalos: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    pesoId: '44444444-4444-4444-8444-444444444444',
    sesionId: '55555555-5555-4555-8555-555555555555',
    fecha,
    kilos,
    calidad: 'measured',
    version: 1,
    intervalo: null,
    ...intervalos,
  }
}