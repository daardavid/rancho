import { expect, test } from '@playwright/test'

import { entrar, irA, nombreUnico } from './ayudas'

/**
 * El camino del North Star del MVP: al abrir la app se ve lo que hay que
 * revisar, y desde ahí se captura sin pasar por el hato.
 *
 * Abrir la app → Inicio → el acceso directo a Nacimiento → registrar → la cría
 * aparece en Inicio. Es el flujo que la prueba de David del 2026-11-25 no
 * encontraba: la app abría en el hato y el nacimiento solo estaba en su menú.
 */
test('abrir la app, capturar un nacimiento desde Inicio y verlo ahí', async ({ page }) => {
  await entrar(page)

  await expect(page.getByRole('heading', { name: 'Inicio', exact: true })).toBeVisible()

  // Inicio empieza por los accesos, no por un selector de fecha.
  const accesos = page.getByRole('region', { name: 'Accesos directos' })
  await expect(accesos.getByRole('link', { name: 'Registrar pesaje' })).toBeVisible()
  await expect(accesos.getByRole('link', { name: 'Salida' })).toBeVisible()

  const nombre = nombreUnico('Cría desde Inicio')
  await accesos.getByRole('link', { name: 'Nacimiento' }).click()
  await expect(page.getByRole('heading', { name: 'Nacimiento' })).toBeVisible()

  await page.getByRole('radio', { name: 'Fecha exacta' }).check()
  await page.getByLabel('Día del parto').fill(hoyEnMexico())
  // Si el hato tiene un solo toro, el formulario pide decir qué se sabe del
  // padre. «No sé» es una respuesta válida y no viene marcada.
  const padre = page.getByRole('radiogroup', { name: 'Padre' })
  if ((await padre.count()) > 0) {
    await padre.getByRole('radio', { name: 'No sé' }).check()
  }
  await page.getByRole('textbox', { name: 'Nombre o seña' }).fill(nombre)
  await page.getByRole('button', { name: 'Registrar nacimiento' }).click()
  await expect(page.getByRole('heading', { name: nombre })).toBeVisible()

  await irA(page, 'Inicio')
  await expect(page.getByRole('heading', { name: 'Inicio', exact: true })).toBeVisible()

  // La cría recién registrada se ve en lo que hay que revisar: nació hoy y
  // todavía no tiene lugar asignado.
  await expect(
    page.getByRole('region', { name: 'Para revisar' }).getByRole('link', { name: nombre }).first(),
  ).toBeVisible()

  // Y en el resumen del periodo, que va plegado.
  const periodo = page.getByRole('region', { name: 'Resumen del periodo' })
  await periodo.getByRole('button', { name: /Últimos 7 días/ }).click()
  await expect(periodo.getByRole('region', { name: 'Nacimientos' }).getByRole('link', { name: nombre })).toBeVisible()
})

/** Las cuatro pestañas llevan el mismo encabezado y el mismo menú ☰. */
test('las cuatro pestañas comparten encabezado y menú, y el pesaje ya no trae flecha', async ({
  page,
}) => {
  await entrar(page)

  for (const pantalla of ['Inicio', 'Hato', 'Pesaje', 'Crecimiento'] as const) {
    await irA(page, pantalla)
    const encabezado = page.locator('header.ui-encabezado')
    await expect(encabezado.getByText('MI RANCHO')).toBeVisible()
    await expect(encabezado.getByRole('heading', { name: pantalla, exact: true })).toBeVisible()
    await expect(encabezado.getByRole('button', { name: 'Menú' })).toBeVisible()
    // Ninguna pestaña trae la flecha de regreso: no se regresa del trabajo.
    await expect(encabezado.getByRole('link', { name: /Regresar/ })).toHaveCount(0)

    // El menú es el mismo y ofrece las cuatro opciones.
    await encabezado.getByRole('button', { name: 'Menú' }).click()
    await expect(page.getByRole('button', { name: 'Registrar nacimiento' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Potreros' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Salidas' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Salir' })).toBeVisible()
    await page.keyboard.press('Escape')
  }
})

function hoyEnMexico(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}
