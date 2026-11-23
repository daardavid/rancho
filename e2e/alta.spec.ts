import { expect, test } from '@playwright/test'

import {
  abrirAlta,
  darDeAltaConNombre,
  darDeAltaSinSaber,
  entrar,
  guardarAlta,
  irA,
  nombreUnico,
} from './ayudas'

/**
 * Dar de alta un animal con todo en «No sé».
 *
 * Lo que protege es la verdad del rancho: lo único que se crea es la identidad
 * interna del animal. Nombre, sexo, categoría, tenencia y participación quedan
 * desconocidos y se ven como «No sé», no como un error ni como un dato
 * inventado ([UX-04](../../docs/product/ux-principles.md)).
 */
test('con todo en «No sé» el animal existe y la ficha no inventa nada', async ({ page }) => {
  await entrar(page)
  await darDeAltaSinSaber(page)

  await expect(page.getByRole('heading', { name: 'Qué se sabe' })).toBeVisible()

  const datos = page.locator('.datos')
  await expect(datos).toContainText('Sin nombre o seña')
  await expect(datos).toContainText('No sé')

  // Nada de esto se inventó: no hay nota del arreglo y no hay parte calculada.
  await expect(datos).not.toContainText('Nota del arreglo')
  await expect(page.getByText('%')).toHaveCount(0)

  // Y el alta quedó asentada: el hato la trae al volver a pedirla.
  const animales = await page.evaluate(async () => {
    const respuesta = await fetch('/api/animals')
    return (await respuesta.json()) as { animales: { nombre: string | null }[] }
  })
  expect(animales.animales.some((animal) => animal.nombre === null)).toBe(true)
})

test('«No sé» se pinta como una opción y no como un error', async ({ page }) => {
  await entrar(page)
  await abrirAlta(page)

  // Tres preguntas de opción en el alta: sexo, categoría y tenencia. Las tres
  // vienen contestadas con «No sé», que es lo que se ve marcado.
  await expect(page.getByRole('radio', { name: 'No sé', checked: true })).toHaveCount(3)

  // Ninguna se marca como inválida.
  await expect(page.locator('[aria-invalid="true"]')).toHaveCount(0)
  await expect(page.locator('.campo__error')).toHaveCount(0)

  await guardarAlta(page)
  await expect(page.getByRole('heading', { name: 'Sin nombre o seña' })).toBeVisible()
})

test('«a la parte» es una tenencia con nota verbal y no calcula ninguna parte', async ({ page }) => {
  await entrar(page)
  await abrirAlta(page)

  await page.getByRole('radio', { name: 'A la parte' }).check()
  await page.getByLabel('Nota del arreglo').fill('Arreglo verbal con el vecino, sin papeles.')

  await guardarAlta(page)
  await expect(page.getByRole('heading', { name: 'Sin nombre o seña' })).toBeVisible()

  const datos = page.locator('.datos')
  await expect(datos).toContainText('A la parte')
  await expect(datos).toContainText('Arreglo verbal con el vecino, sin papeles.')
  // La nota es lo que hay; ningún porcentaje se deriva de ella (`OQ-OWN-001`).
  await expect(datos).not.toContainText('%')
})

test('el hato busca por nombre y lo encuentra', async ({ page }) => {
  await entrar(page)
  const nombre = nombreUnico('Becerro de la Loma')
  await darDeAltaConNombre(page, nombre)

  await irA(page, 'Hato')
  await page.getByLabel('Buscar').fill(nombre.toLowerCase())
  await expect(page.getByRole('button', { name: new RegExp(nombre) })).toBeVisible()

  await page.getByLabel('Buscar').fill('ningun-animal-se-llama-asi')
  await expect(page.getByRole('heading', { name: 'Ningún animal coincide' })).toBeVisible()
})

test('el alta guarda dos animales distintos y el hato cuenta a los dos', async ({ page }) => {
  await entrar(page)
  const primero = nombreUnico('Animal Uno')
  const segundo = nombreUnico('Animal Dos')

  await darDeAltaConNombre(page, primero)
  await irA(page, 'Hato')
  await darDeAltaConNombre(page, segundo)

  await irA(page, 'Hato')
  await page.getByLabel('Buscar').fill(primero)
  await expect(page.getByRole('button', { name: new RegExp(primero) })).toBeVisible()
  await expect(page.getByRole('button', { name: new RegExp(segundo) })).toBeHidden()

  await page.getByLabel('Buscar').fill(segundo)
  await expect(page.getByRole('button', { name: new RegExp(segundo) })).toBeVisible()
})
