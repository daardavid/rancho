import { expect, test } from '@playwright/test'

import { entrar, irA, nombreUnico } from './ayudas'

/**
 * Un nacimiento entra a Inicio con los activos. La baja lo saca de esa lista
 * y lo deja en las salidas del periodo. El nacimiento sigue siendo un hecho.
 */
test('un nacimiento aparece en Inicio y la baja lo saca de los activos', async ({ page }) => {
  await entrar(page)
  const nombre = nombreUnico('Cría')

  await page.getByRole('button', { name: 'Menú' }).click()
  await page.getByRole('button', { name: 'Registrar nacimiento' }).click()
  await expect(page.getByRole('heading', { name: 'Nacimiento' })).toBeVisible()

  await page.getByRole('radio', { name: 'Fecha exacta' }).check()
  await page.getByLabel('Día del parto').fill(hoyEnMexico())
  await page.getByRole('textbox', { name: 'Nombre o seña' }).fill(nombre)
  await page.getByRole('button', { name: 'Registrar nacimiento' }).click()
  await expect(page.getByRole('heading', { name: nombre })).toBeVisible()

  await irA(page, 'Inicio')
  await expect(page.getByRole('heading', { name: 'Inicio' })).toBeVisible()
  const pestanas = page.getByRole('navigation', { name: 'Pantallas del rancho' }).getByRole('link')
  await expect(pestanas.nth(0)).toHaveText('Inicio')

  await expect(
    page.getByRole('region', { name: 'Nacimientos' }).getByRole('link', { name: nombre }),
  ).toBeVisible()
  await expect(
    page.getByRole('region', { name: 'Para revisar' }).getByRole('link', { name: nombre }).first(),
  ).toBeVisible()

  await page.getByRole('region', { name: 'Para revisar' }).getByRole('link', { name: nombre }).first().click()
  await expect(page.getByRole('heading', { name: nombre })).toBeVisible()
  await page.getByRole('button', { name: 'Dar de baja' }).click()
  await page.getByRole('button', { name: 'Dar de baja', exact: true }).click()
  await expect(page.getByText('Ya no está en el hato')).toBeVisible()

  await irA(page, 'Inicio')
  await expect(page.getByRole('region', { name: 'Salidas' }).getByRole('link', { name: nombre })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Para revisar' }).getByRole('link', { name: nombre })).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Nacimientos' }).getByRole('link', { name: nombre })).toBeVisible()
})

function hoyEnMexico(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}
