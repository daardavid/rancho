import { expect, test } from '@playwright/test'

import { darDeAltaConNombre, entrar, nombreUnico } from './ayudas'

/**
 * Potreros y lugar esperado, de punta a punta.
 *
 * El potrero se nombra desde su pantalla; en el hato se eligen varios animales
 * y se mueven a la vez. Después, la misma pantalla cuenta cuántos se esperan
 * ahí, el hato filtra por potrero y la ficha del animal muestra su lugar
 * vigente con la historia.
 *
 * La base es una sola para toda la corrida, así que los nombres son propios y
 * los conteos se leen dentro de la fila del potrero que esta prueba creó.
 */
test('un potrero, un grupo movido y el lugar vigente en la ficha', async ({ page }) => {
  await entrar(page)

  const potrero = nombreUnico('Potrero')
  const uno = nombreUnico('Mueve uno')
  const dos = nombreUnico('Mueve dos')

  for (const nombre of [uno, dos]) {
    await darDeAltaConNombre(page, nombre)
    await page.getByRole('button', { name: 'Regresar al hato' }).click()
    await expect(page.getByRole('heading', { name: 'Hato', exact: true })).toBeVisible()
  }

  // El potrero se crea desde su pantalla, que se abre desde el menú del hato.
  await page.getByRole('button', { name: 'Menú' }).click()
  await page.getByRole('button', { name: 'Potreros' }).click()
  await expect(page.getByRole('heading', { name: 'Potreros' })).toBeVisible()

  // En el encabezado hay un «+» para agregar; la tarjeta del hato vacío ofrece lo
  // mismo. Se usa el del encabezado, que existe con o sin potreros.
  await page.getByRole('button', { name: 'Agregar un potrero' }).click()
  await page.getByLabel('Nombre del potrero').fill(potrero)
  await page.getByRole('button', { name: 'Agregar potrero' }).click()

  const filaDelPotrero = page.getByRole('listitem').filter({ hasText: potrero })
  await expect(filaDelPotrero).toBeVisible()
  await expect(filaDelPotrero).toContainText('No se espera a nadie aquí')

  // De regreso al hato, se eligen los dos animales y se mueven una sola vez.
  await page.getByRole('button', { name: 'Regresar al hato' }).click()
  await expect(page.getByRole('heading', { name: 'Hato', exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Mover animales a un potrero' }).click()
  await page.getByRole('checkbox', { name: `Elegir a ${uno}` }).check()
  await page.getByRole('checkbox', { name: `Elegir a ${dos}` }).check()
  await page
    .getByRole('radiogroup', { name: '¿A qué potrero?' })
    .getByRole('radio', { name: potrero })
    .check()
  await page.getByRole('button', { name: 'Mover a…', exact: true }).click()

  // El conteo del potrero es una consulta: se ve al volver a su pantalla.
  await page.getByRole('button', { name: 'Menú' }).click()
  await page.getByRole('button', { name: 'Potreros' }).click()
  const conLosDos = page.getByRole('listitem').filter({ hasText: potrero })
  await expect(conLosDos).toContainText('Se esperan 2 animales')

  // El hato filtra por ese potrero.
  await page.getByRole('button', { name: 'Regresar al hato' }).click()
  await page
    .getByRole('radiogroup', { name: 'Filtrar por potrero' })
    .getByRole('radio', { name: new RegExp(potrero) })
    .check()
  await expect(page.getByRole('button', { name: new RegExp(uno) })).toBeVisible()
  await expect(page.getByRole('button', { name: new RegExp(dos) })).toBeVisible()

  // La ficha dice dónde se le espera y que no es una observación.
  await page.getByRole('button', { name: new RegExp(uno) }).click()
  await expect(page.getByRole('heading', { name: uno })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Dónde se le espera' })).toBeVisible()
  await expect(page.getByText(potrero, { exact: true })).toBeVisible()
  await expect(page.getByText(/no una observación/)).toBeVisible()
})
