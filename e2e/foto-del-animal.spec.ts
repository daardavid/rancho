import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { expect, test } from '@playwright/test'

import { darDeAltaConNombre, entrarAlHato, irA, nombreUnico } from './ayudas'

const RETRATO = join(dirname(fileURLToPath(import.meta.url)), 'retrato.png')

/**
 * La foto se agrega en la ficha y la lista del hato muestra la miniatura.
 *
 * El archivo es una imagen sintética, no un animal del rancho.
 */
test('la foto de la ficha se ve en el hato', async ({ page }) => {
  await entrarAlHato(page)
  const nombre = nombreUnico('Retrato')
  await darDeAltaConNombre(page, nombre)

  await page.getByLabel('Agregar foto').setInputFiles(RETRATO)
  const enLaFicha = page.locator('.ficha__foto')
  await expect(enLaFicha).toBeVisible()
  const srcFicha = await enLaFicha.getAttribute('src')

  await irA(page, 'Hato')
  const fila = page.getByRole('button', { name: new RegExp(nombre) })
  const enLaLista = fila.locator('img')
  await expect(enLaLista).toBeVisible()
  await expect(enLaLista).toHaveAttribute('src', /\/api\/evidencia\//)
  const srcLista = await enLaLista.getAttribute('src')
  expect(srcLista).not.toBe(srcFicha)
})
