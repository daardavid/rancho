import { expect, test } from '@playwright/test'

import { darDeAltaConNombre, entrar, nombreUnico } from './ayudas'

/**
 * Notas de sanidad, de punta a punta.
 *
 * Una nota a un solo animal desde su ficha, y otra a dos animales a la vez
 * desde el modo de selección del hato. La nota del grupo queda ligada a cada
 * animal: la ficha de los dos la muestra. La base es una sola para toda la
 * corrida, así que los nombres son propios y nadie supone un hato vacío.
 */
test('anotar sanidad a un animal y a un grupo, y verlo en cada ficha', async ({ page }) => {
  await entrar(page)

  const uno = nombreUnico('Sanidad uno')
  const dos = nombreUnico('Sanidad dos')

  for (const nombre of [uno, dos]) {
    await darDeAltaConNombre(page, nombre)
    await page.getByRole('button', { name: 'Regresar al hato' }).click()
    await expect(page.getByRole('heading', { name: 'Hato', exact: true })).toBeVisible()
  }

  // Desde la ficha: una nota para un solo animal.
  await page.getByRole('button', { name: new RegExp(uno) }).click()
  await expect(page.getByRole('heading', { name: uno })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Sanidad', exact: true })).toBeVisible()
  await expect(page.getByText(/Todavía no se le anotó nada de sanidad/)).toBeVisible()

  const detalleUno = `Vacuna del ántrax ${String(Date.now()).slice(-5)}`
  await page.getByRole('button', { name: 'Anotar sanidad' }).click()
  const tipo = page.getByRole('radiogroup', { name: '¿Qué se anota?' })
  await expect(tipo.getByRole('radio', { name: 'Vacuna' })).not.toBeChecked()
  const visto = page.getByRole('radiogroup', { name: '¿Se vio al animal?' })
  await expect(visto.getByRole('radio', { name: 'No se vio' })).not.toBeChecked()
  await tipo.getByRole('radio', { name: 'Vacuna' }).check()
  await page.getByLabel('¿Qué se hizo o se vio?').fill(detalleUno)
  await visto.getByRole('radio', { name: 'No se vio' }).check()
  await page.getByRole('button', { name: 'Anotar sanidad', exact: true }).click()

  await expect(page.getByText('Nota de sanidad guardada.')).toBeVisible()
  await expect(page.getByText(detalleUno)).toBeVisible()

  // Desde el hato: la misma captura para los dos animales elegidos.
  await page.getByRole('button', { name: 'Regresar al hato' }).click()
  await expect(page.getByRole('heading', { name: 'Hato', exact: true })).toBeVisible()

  const detalleDos = `Baño contra la mosca ${String(Date.now()).slice(-5)}`
  await page.getByRole('button', { name: 'Anotar sanidad a varios animales' }).click()
  await page.getByRole('checkbox', { name: `Elegir a ${uno}` }).check()
  await page.getByRole('checkbox', { name: `Elegir a ${dos}` }).check()
  await page
    .getByRole('radiogroup', { name: '¿Qué se anota?' })
    .getByRole('radio', { name: 'Baño' })
    .check()
  await page.getByLabel('¿Qué se hizo o se vio?').fill(detalleDos)
  await page
    .getByRole('radiogroup', { name: '¿Se vio al animal?' })
    .getByRole('radio', { name: 'Sí se vio' })
    .check()
  await page.getByRole('button', { name: 'Anotar sanidad', exact: true }).click()

  await expect(page.getByText(/Notas de sanidad guardadas/)).toBeVisible()

  // El segundo animal tiene la nota del grupo; el primero tiene las dos.
  for (const nombre of [uno, dos]) {
    await page.getByRole('button', { name: new RegExp(nombre) }).click()
    await expect(page.getByRole('heading', { name: nombre })).toBeVisible()
    await expect(page.getByText(detalleDos)).toBeVisible()
    if (nombre === uno) {
      await expect(page.getByText(detalleUno)).toBeVisible()
    }
    await page.getByRole('button', { name: 'Regresar al hato' }).click()
    await expect(page.getByRole('heading', { name: 'Hato', exact: true })).toBeVisible()
  }
})
