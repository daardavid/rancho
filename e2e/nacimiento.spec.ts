import { expect, test } from '@playwright/test'

import { abrirAlta, entrarAlHato, guardarAlta, irA, nombreUnico } from './ayudas'

/**
 * Un nacimiento crea la cría y la filiación juntas.
 *
 * La madre viene de su ficha. Si hay un solo toro, «Inferido: único toro» se
 * ofrece y no viene marcado: inferido no es paternidad segura.
 *
 * El nacimiento se abre desde el menú ☰ del encabezado, que es el mismo en las
 * cuatro pestañas.
 */
test('el nacimiento deja la cría en la familia de la vaca', async ({ page }) => {
  await entrarAlHato(page)

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
  // La madre viene elegida desde su ficha: se ve su nombre y «Quitar».
  // El buscador queda escondido hasta quitarla.
  await expect(page.getByText(vaca, { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Quitar' })).toBeVisible()
  await expect(page.getByLabel('Buscar la madre')).toHaveCount(0)
  await expect(page.getByRole('radio', { name: 'La vi' })).not.toBeChecked()
  await page.getByRole('button', { name: 'Registrar nacimiento' }).click()
  await expect(page.getByRole('alert')).toContainText('viste a la madre')

  await page.getByRole('radio', { name: 'La vi' }).check()

  /*
   * El padre solo se pregunta cuando hay un solo toro activo. La base es una
   * sola para toda la corrida y otra prueba puede haber dado de alta otro toro:
   * en ese caso el formulario dice que «único toro» no aplica y el padre se
   * queda en «No sé». Las dos situaciones son correctas; lo que no se acepta es
   * que «Inferido: único toro» venga marcado.
   */
  const padre = page.getByRole('radiogroup', { name: 'Padre' })
  if ((await padre.count()) > 0) {
    await expect(padre.getByRole('radio', { name: 'No sé' })).not.toBeChecked()
    await expect(padre.getByRole('radio', { name: /Inferido: único toro/ })).not.toBeChecked()
    await page.getByRole('button', { name: 'Registrar nacimiento' }).click()
    await expect(page.getByRole('alert')).toContainText('viste al padre')
    await padre.getByRole('radio', { name: 'No sé' }).check()
  } else {
    // Con más de un toro no se inventa padre: se dice que no se puede inferir.
    await expect(page.getByText(/Hay más de un toro activo/)).toBeVisible()
  }

  await page.getByRole('button', { name: 'Registrar nacimiento' }).click()
  await expect(page.getByRole('heading', { name: 'Familia' })).toBeVisible()
  await expect(page.getByText(`La vi · ${vaca}`)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Registrar nacimiento' })).toHaveCount(0)

  await irA(page, 'Hato')
  await page.getByRole('button', { name: new RegExp(vaca) }).click()
  await expect(page.getByRole('heading', { name: vaca })).toBeVisible()
  await expect(page.getByText('Como madre · La vi')).toBeVisible()
})
