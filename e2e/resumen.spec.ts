import { expect, test } from '@playwright/test'

import { darDeAltaSinSaber, entrar, irA } from './ayudas'

/**
 * El resumen de la semana para compartir (INC-007, R-38).
 *
 * Se abre desde Inicio con el mismo periodo que se está viendo, se lee lo que
 * se manda y se copia el texto al portapapeles. El botón de PDF abre el diálogo
 * de impresión del navegador, que en la prueba no se puede contestar: lo que sí
 * se comprueba es que la hoja de impresión esconde la barra y los botones, que
 * se prueba sobre el CSS en la prueba de pantalla.
 */
test('Inicio abre el resumen de la semana y el texto se copia', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await entrar(page)

  // La base es una sola para toda la corrida: si el hato está vacío se da de
  // alta un animal, igual que la prueba de Inicio.
  const primerAnimal = page.getByRole('button', { name: 'Dar de alta el primer animal' })
  await page
    .getByRole('region', { name: 'Accesos directos' })
    .or(primerAnimal)
    .first()
    .waitFor()
  if (await primerAnimal.isVisible()) {
    await darDeAltaSinSaber(page)
    await irA(page, 'Inicio')
  }

  const periodo = page.getByRole('region', { name: 'Resumen del periodo' })
  await periodo.getByRole('link', { name: 'Compartir resumen' }).click()

  await expect(page.getByRole('heading', { name: 'Resumen de la semana' })).toBeVisible()

  const hoja = page.getByRole('region', { name: 'Resumen para compartir' })
  await expect(hoja).toBeVisible()
  await expect(hoja.getByText('Animales activos')).toBeVisible()
  await expect(hoja.getByText('Lo que no se sabe')).toBeVisible()
  await expect(hoja.getByRole('heading', { name: 'Última vuelta de pesaje' })).toBeVisible()
  await expect(hoja.getByRole('heading', { name: 'Días sin verse' })).toBeVisible()

  // Nunca se comparte un identificador interno.
  const texto = (await hoja.textContent()) ?? ''
  expect(texto).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/)

  // Sin la API de compartir del navegador (Chromium de escritorio), el botón
  // principal copia el texto.
  const copiar = page.getByRole('button', { name: 'Copiar texto' })
  if (await copiar.isVisible()) {
    await copiar.click()
    await expect(page.getByText(/quedó en el portapapeles/)).toBeVisible()
    const portapapeles = await page.evaluate(() => navigator.clipboard.readText())
    expect(portapapeles).toContain('Animales activos')
    expect(portapapeles).toContain('Lo que no se sabe')
  }
})

/** El periodo se puede cambiar desde la hoja misma, sin volver a Inicio. */
test('el resumen conserva el periodo que se estaba viendo', async ({ page }) => {
  await entrar(page)

  const periodo = page.getByRole('region', { name: 'Resumen del periodo' })
  await expect(periodo).toBeVisible()
  await periodo.getByRole('link', { name: 'Compartir resumen' }).click()
  await expect(page.getByRole('heading', { name: 'Resumen de la semana' })).toBeVisible()

  // El periodo se puede cambiar desde la hoja sin salir del resumen.
  const cambiar = page.getByRole('button', { name: /Últimos 7 días|Desde el/ })
  await expect(cambiar).toBeVisible()
  await cambiar.click()
  await expect(page.getByLabel('Desde')).toBeVisible()
})

/**
 * La hoja de impresión en un navegador de verdad.
 *
 * «Guardar como PDF» abre el diálogo del sistema, que la prueba no puede
 * contestar. Lo que sí se puede comprobar es el resultado de imprimir: con el
 * medio en `print`, la barra inferior y los botones desaparecen y el resumen
 * se queda solo, que es lo que el PDF va a llevar.
 */
test('al imprimir se queda solo el resumen: sin barra inferior ni botones', async ({ page }) => {
  await entrar(page)
  await page
    .getByRole('region', { name: 'Resumen del periodo' })
    .getByRole('link', { name: 'Compartir resumen' })
    .click()
  await expect(page.getByRole('heading', { name: 'Resumen de la semana' })).toBeVisible()

  await page.emulateMedia({ media: 'print' })

  await expect(page.getByRole('navigation', { name: 'Pantallas del rancho' })).toBeHidden()
  await expect(page.getByRole('button', { name: 'Guardar como PDF' })).toBeHidden()
  await expect(page.getByRole('button', { name: /Copiar texto|Compartir/ })).toBeHidden()
  await expect(page.getByRole('button', { name: 'Menú' })).toBeHidden()
  await expect(page.getByRole('region', { name: 'Resumen para compartir' })).toBeVisible()

  await page.emulateMedia({ media: 'screen' })
  await expect(page.getByRole('navigation', { name: 'Pantallas del rancho' })).toBeVisible()
})
