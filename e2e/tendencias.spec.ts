import { readdirSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

import { expect, test } from '@playwright/test'

import { entrar, irA } from './ayudas'

const DIST = resolve(import.meta.dirname, '../apps/web/dist')

/**
 * El trozo de las gráficas no viaja con la app.
 *
 * Abrir Inicio baja el JS de siempre. «Ver tendencias» es lo que pide el trozo
 * aparte. El mismo build se mide en disco: el JS inicial no nombra a ECharts.
 */
test('abrir Inicio no descarga las gráficas; ver tendencias sí', async ({ page }) => {
  const pedidos: string[] = []
  page.on('request', (pedido) => {
    if (pedido.url().includes('.js')) {
      pedidos.push(pedido.url())
    }
  })

  await entrar(page)
  expect(pedidos.some(esTrozoDeTendencias)).toBe(false)

  await irA(page, 'Crecimiento')
  await page.getByRole('button', { name: 'Ver tendencias' }).click()
  await expect(page.getByRole('heading', { name: 'Tendencias' })).toBeVisible()
  await expect.poll(() => pedidos.some(esTrozoDeTendencias)).toBe(true)
})

function esTrozoDeTendencias(url: string): boolean {
  return /\/tendencias-/i.test(url)
}

test('el JS inicial no contiene ECharts y Tendencias va en su trozo', () => {
  const html = readFileSync(resolve(DIST, 'index.html'), 'utf8')
  expect(/tendencias-/i.test(html)).toBe(false)

  const entradas = [...html.matchAll(/assets\/[^"]+?\.js/g)].map((coincidencia) => coincidencia[0] ?? '')
  expect(entradas.length).toBeGreaterThan(0)

  for (const relativa of entradas) {
    const texto = readFileSync(resolve(DIST, relativa), 'utf8')
    expect(texto.includes('echarts'), relativa).toBe(false)
    expect(texto.includes('zrender'), relativa).toBe(false)
  }

  const trozos = readdirSync(resolve(DIST, 'assets')).filter(
    (nombre) => /^tendencias-.*\.js$/i.test(nombre),
  )
  expect(trozos).toHaveLength(1)
  const trozo = trozos[0]
  if (trozo === undefined) {
    throw new Error('Falta el trozo de tendencias.')
  }
  const texto = readFileSync(resolve(DIST, 'assets', trozo), 'utf8')
  expect(statSync(resolve(DIST, 'assets', trozo)).size).toBeGreaterThan(30_000)
  expect(texto.includes('echarts') || texto.includes('zrender')).toBe(true)
})

/**
 * R-42: Tendencias no es una pestaña, pero lleva el mismo encabezado del rancho
 * —«MI RANCHO», el título y el menú ☰— y además la flecha de regreso a
 * Crecimiento, que es de donde se abre.
 */
test('Tendencias tiene el menú del rancho y regresa a Crecimiento', async ({ page }) => {
  await entrar(page)
  await irA(page, 'Crecimiento')
  await page.getByRole('button', { name: 'Ver tendencias' }).click()

  const encabezado = page.locator('header.ui-encabezado')
  await expect(encabezado.getByRole('heading', { name: 'Tendencias' })).toBeVisible()
  await expect(encabezado.getByText('MI RANCHO')).toBeVisible()
  await expect(encabezado.getByRole('button', { name: 'Menú' })).toBeVisible()

  // El menú abre como en las pestañas.
  await encabezado.getByRole('button', { name: 'Menú' }).click()
  await expect(page.getByRole('button', { name: 'Salir' })).toBeVisible()
  await page.keyboard.press('Escape')

  // La flecha dice su destino y llega a él.
  await encabezado.getByRole('button', { name: 'Regresar a Crecimiento' }).click()
  await expect(page.getByRole('heading', { name: 'Crecimiento', exact: true })).toBeVisible()
})
