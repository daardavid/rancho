import { expect, test } from '@playwright/test'

import { darDeAltaConNombre, entrarAlHato, irA, nombreUnico } from './ayudas'

/**
 * Dar de baja y volver a encontrar al animal.
 *
 * La lista del hato y el pesaje se quedan con los activos. La ficha sigue,
 * con el aviso de la salida, y Salidas lo lista con motivo y fecha. Otro
 * animal se queda en el hato para que la búsqueda no dependa de que el
 * rancho se haya quedado sin activos.
 */
test('dar de baja lo saca del hato y del pesaje, y Salidas lo encuentra', async ({ page }) => {
  await entrarAlHato(page)
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

/**
 * R-42: el texto de la flecha dice a dónde lleva, de verdad.
 *
 * David lo encontró al probar INC-006: una ficha dada de baja decía «Regresar
 * al hato» y aterrizaba en Salidas. Ahora la ficha recuerda de dónde se llegó
 * (`?desde=`) y, cuando no lo sabe, lo decide por el animal. En los tres casos
 * el texto nombra el destino real.
 */
test('la flecha de una ficha dada de baja dice el lugar al que lleva', async ({ page }) => {
  await entrarAlHato(page)
  const nombre = nombreUnico('Sale y regresa')

  // Se llega desde el alta: la ficha no sabe de dónde viene y se decide por el
  // animal. Salió, así que el destino es Salidas y el texto lo dice.
  await darDeAltaConNombre(page, nombre)
  await page.getByRole('button', { name: 'Dar de baja' }).click()
  await page.getByRole('button', { name: 'Dar de baja', exact: true }).click()
  await expect(page.getByText('Ya no está en el hato')).toBeVisible()
  await page.getByRole('button', { name: 'Regresar a salidas' }).click()
  await expect(page.getByRole('heading', { name: 'Salidas', exact: true })).toBeVisible()

  // Abierta desde Salidas: vuelve a Salidas, y lo dice.
  await page.getByLabel('Buscar en salidas').fill(nombre)
  await page.getByRole('button', { name: new RegExp(nombre) }).click()
  await expect(page.getByRole('heading', { name: nombre })).toBeVisible()
  await page.getByRole('button', { name: 'Regresar a salidas' }).click()
  await expect(page.getByRole('heading', { name: 'Salidas', exact: true })).toBeVisible()

  // Abierta desde el hato (la búsqueda encuentra a quien salió): vuelve al
  // hato, y ahora sí dice «Regresar al hato».
  await irA(page, 'Hato')
  await expect(page.getByRole('heading', { name: 'Hato', exact: true })).toBeVisible()
  await page.getByLabel('Buscar', { exact: true }).fill(nombre)
  await page.getByRole('button', { name: new RegExp(nombre) }).click()
  await expect(page.getByRole('heading', { name: nombre })).toBeVisible()
  await page.getByRole('button', { name: 'Regresar al hato' }).click()
  await expect(page.getByRole('heading', { name: 'Hato', exact: true })).toBeVisible()
})
