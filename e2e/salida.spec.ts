import { expect, test } from '@playwright/test'

import { darDeAltaConNombre, entrar, irA, nombreUnico } from './ayudas'

/**
 * Dar de baja y volver a encontrar al animal.
 *
 * La lista del hato y el pesaje se quedan con los activos. La ficha sigue,
 * con el aviso de la salida, y Salidas lo lista con motivo y fecha. Otro
 * animal se queda en el hato para que la búsqueda no dependa de que el
 * rancho se haya quedado sin activos.
 */
test('dar de baja lo saca del hato y del pesaje, y Salidas lo encuentra', async ({ page }) => {
  await entrar(page)
  const seQueda = nombreUnico('Se queda')
  await darDeAltaConNombre(page, seQueda)
  await page.getByRole('button', { name: 'Regresar al hato' }).click()
  await expect(page.getByRole('heading', { name: 'Hato', exact: true })).toBeVisible()

  const nombre = nombreUnico('Sale del hato')
  await darDeAltaConNombre(page, nombre)

  await page.getByRole('button', { name: 'Dar de baja' }).click()
  await expect(page.getByText('Deja de aparecer en el hato y en el pesaje.')).toBeVisible()
  await expect(
    page.getByRole('radiogroup', { name: '¿Por qué sale?' }).getByRole('radio', { name: 'No sé' }),
  ).toBeChecked()

  await page.getByRole('button', { name: 'Dar de baja', exact: true }).click()
  await expect(page.getByText('Ya no está en el hato')).toBeVisible()
  await expect(page.getByText('No se puede pesar.')).toBeVisible()

  await page.getByRole('button', { name: 'Regresar a salidas' }).click()
  await expect(page.getByRole('heading', { name: 'Salidas', exact: true })).toBeVisible()
  await page.getByLabel('Buscar en salidas').fill(nombre)
  await expect(page.getByRole('button', { name: nombre })).toBeVisible()
  await expect(page.getByRole('button', { name: nombre })).toContainText('No sé')

  await irA(page, 'Hato')
  await expect(page.getByRole('heading', { name: 'Hato', exact: true })).toBeVisible()
  await page.getByLabel('Buscar', { exact: true }).fill(nombre)
  await expect(page.getByRole('heading', { name: 'Salidas', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: nombre })).toContainText('Salió')
  await expect(page.getByRole('button', { name: seQueda })).toHaveCount(0)

  await irA(page, 'Pesaje')
  await page.getByRole('button', { name: 'Agregar otro animal' }).click()
  await page.getByLabel('Buscar', { exact: true }).fill(nombre)
  await expect(page.getByText('Ningún animal coincide o ya está en la sesión.')).toBeVisible()
  await expect(page.getByRole('button', { name: nombre })).toHaveCount(0)
})
