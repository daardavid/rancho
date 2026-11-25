import { expect, test } from '@playwright/test'

import { abrirAlta, entrar, guardarAlta, irA, nombreUnico } from './ayudas'

/**
 * Un nacimiento crea la cría y la filiación juntas.
 *
 * La madre viene de su ficha. Si hay un solo toro, «Inferido: único toro» se
 * ofrece y no viene marcado: inferido no es paternidad segura.
 */
test('el nacimiento deja la cría en la familia de la vaca', async ({ page }) => {
  await entrar(page)

  await page.getByRole('button', { name: 'Menú' }).click()
  await page.getByRole('button', { name: 'Registrar nacimiento' }).click()
  await expect(page.getByRole('heading', { name: 'Nacimiento' })).toBeVisible()
  await page.getByRole('button', { name: 'Cerrar' }).click()
  await expect(page.getByRole('heading', { name: 'Hato', exact: true })).toBeVisible()

  const toro = nombreUnico('Toro')
  const vaca = nombreUnico('Vaca')

  await abrirAlta(page)
  await page.getByLabel('Nombre o seña').fill(toro)
  await page.getByRole('radio', { name: 'Toro' }).check()
  await guardarAlta(page)
  await expect(page.getByRole('heading', { name: toro })).toBeVisible()

  await irA(page, 'Hato')
  await abrirAlta(page)
  await page.getByLabel('Nombre o seña').fill(vaca)
  await page.getByRole('radio', { name: 'Vaca' }).check()
  await guardarAlta(page)
  await expect(page.getByRole('heading', { name: vaca })).toBeVisible()

  await page.getByRole('button', { name: 'Registrar nacimiento' }).click()
  await expect(page.getByRole('heading', { name: 'Nacimiento' })).toBeVisible()
  await expect(page.getByLabel('Madre').locator('option:checked')).toHaveText(vaca)
  await expect(page.getByRole('radio', { name: 'La vi' })).toBeChecked()

  const padre = page.getByRole('radiogroup', { name: 'Padre' })
  await expect(padre.getByRole('radio', { name: 'No sé' })).toBeChecked()
  await expect(padre.getByRole('radio', { name: /Inferido: único toro/ })).not.toBeChecked()

  await page.getByRole('button', { name: 'Registrar nacimiento' }).click()
  await expect(page.getByRole('heading', { name: 'Familia' })).toBeVisible()
  await expect(page.getByText(`La vi · ${vaca}`)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Registrar nacimiento' })).toHaveCount(0)

  await irA(page, 'Hato')
  await page.getByRole('button', { name: new RegExp(vaca) }).click()
  await expect(page.getByRole('heading', { name: vaca })).toBeVisible()
  await expect(page.getByText('Como madre · La vi')).toBeVisible()
})
