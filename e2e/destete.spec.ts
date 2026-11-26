import { expect, test } from '@playwright/test'

import { darDeAltaConNombre, entrarAlHato, irA, nombreUnico } from './ayudas'

/**
 * El destete se anota y la cría se queda en el hato.
 *
 * Desde la ficha, con día y peso. Desde el hato, el mismo día para dos crías
 * y sin copiar un peso. Ninguna aparece en Salidas por haberse destetado.
 */
test('destetar no saca del hato, ni desde la ficha ni en grupo', async ({ page }) => {
  await entrarAlHato(page)

  const conPeso = nombreUnico('Destete con peso')
  const enGrupo = nombreUnico('Destete en grupo')
  const otro = nombreUnico('Destete otro')
  for (const nombre of [conPeso, enGrupo, otro]) {
    await darDeAltaConNombre(page, nombre)
    await page.getByRole('button', { name: 'Regresar al hato' }).click()
    await expect(page.getByRole('heading', { name: 'Hato', exact: true })).toBeVisible()
  }

  await page.getByRole('button', { name: new RegExp(conPeso) }).click()
  await expect(page.getByRole('heading', { name: 'Destete', exact: true })).toBeVisible()
  await expect(page.getByText('Sin destete anotado.')).toBeVisible()

  await page.getByRole('button', { name: 'Anotar destete' }).click()
  const dia = page.getByRole('radiogroup', { name: '¿Qué día se destetó?' })
  await expect(dia.getByRole('radio', { name: 'Fecha exacta' })).not.toBeChecked()
  await expect(dia.getByRole('radio', { name: 'No sé' })).not.toBeChecked()
  await dia.getByRole('radio', { name: 'Fecha exacta' }).check()
  await page.getByLabel('Día del destete').fill('2024-08-01')
  await page.getByLabel('Peso al destete, si se pesó').fill('200')
  const calidad = page.getByRole('radiogroup', { name: '¿Cómo se obtuvo el peso?' })
  await expect(calidad.getByRole('radio', { name: 'Medido' })).not.toBeChecked()
  await calidad.getByRole('radio', { name: 'Medido' }).check()
  await page.getByRole('button', { name: 'Guardar destete' }).click()

  await expect(page.getByText('Destetado el 1 ago 2024.')).toBeVisible()
  await expect(page.getByText('200 kg, Medido en la báscula.')).toBeVisible()
  await expect(page.getByText('Sigue en el hato, salvo que tenga su propia salida.')).toBeVisible()

  await page.getByRole('button', { name: 'Regresar al hato' }).click()
  await expect(page.getByRole('heading', { name: 'Hato', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Anotar destete a varios' }).click()
  await page.getByRole('checkbox', { name: `Elegir a ${enGrupo}` }).check()
  await page.getByRole('checkbox', { name: `Elegir a ${otro}` }).check()
  await expect(page.getByText(/no se copia un solo número/)).toBeVisible()
  await expect(page.getByLabel('Peso al destete, si se pesó')).toHaveCount(0)
  await page
    .getByRole('radiogroup', { name: '¿Qué día se destetó?' })
    .getByRole('radio', { name: 'Aproximada' })
    .check()
  await page.getByLabel('Día del destete').fill('2024-09-01')
  await page.getByRole('button', { name: 'Guardar destete' }).click()

  await expect(page.getByText('Destete guardado. Siguen en el hato.')).toBeVisible()
  await expect(page.getByRole('button', { name: new RegExp(conPeso) })).toBeVisible()
  await expect(page.getByRole('button', { name: new RegExp(enGrupo) })).toBeVisible()
  await expect(page.getByRole('button', { name: new RegExp(otro) })).toBeVisible()

  await page.getByRole('button', { name: new RegExp(enGrupo) }).click()
  await expect(page.getByText('Destetado el 1 sep 2024, aproximado.')).toBeVisible()
  await expect(page.getByText('Sin peso al destete.')).toBeVisible()

  await page.getByRole('button', { name: 'Regresar al hato' }).click()
  await expect(page.getByRole('heading', { name: 'Hato', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Menú' }).click()
  await page.getByRole('button', { name: 'Salidas' }).click()
  await expect(page.getByRole('heading', { name: 'Salidas', exact: true })).toBeVisible()
  const buscador = page.getByLabel('Buscar en salidas')
  if (await buscador.count()) {
    await buscador.fill(conPeso)
  }
  await expect(page.getByRole('button', { name: new RegExp(conPeso) })).toHaveCount(0)
  await irA(page, 'Hato')
  await expect(page.getByRole('button', { name: new RegExp(conPeso) })).toBeVisible()
})
