import { expect, test } from '@playwright/test'

import { entrar, salirDesdeElHato } from './ayudas'

/**
 * Entrar y salir.
 *
 * Lo que protege: que la cuenta del propietario abra el hato, que la cookie
 * viaje sola en las peticiones siguientes y que cerrar sesión la invalide de
 * verdad (la fila se borra, no solo la cookie).
 */
test('el propietario entra, ve su hato y sale', async ({ page, context }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Entra para ver tu hato' })).toBeVisible()

  await page.getByLabel('Usuario').fill('propietario-e2e')
  await page.getByLabel('Contraseña').fill('contrasena-de-prueba-e2e')
  await page.getByRole('button', { name: 'Entrar' }).click()

  await expect(page.getByRole('heading', { name: 'Hato', exact: true })).toBeVisible()
  await expect(page.getByText('RANCHO').first()).toBeVisible()

  // La cookie de sesión es de primera parte, `HttpOnly` y `Secure`: el
  // navegador no la puede leer, y solo viaja por el mismo origen.
  const cookies = await context.cookies()
  const sesion = cookies.find((cookie) => cookie.name === 'rancho_sesion')
  expect(sesion).toBeDefined()
  expect(sesion?.httpOnly).toBe(true)
  expect(sesion?.secure).toBe(true)
  expect(sesion?.sameSite).toBe('Lax')

  await salirDesdeElHato(page)

  // La fila de la sesión se borró: la cookie que quedó ya no sirve.
  const quedan = (await context.cookies()).filter((cookie) => cookie.name === 'rancho_sesion')
  expect(quedan).toHaveLength(0)
})

test('sin sesión, la aplicación pide entrar y no enseña el hato', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Entra para ver tu hato' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Hato', exact: true })).toBeHidden()
})

test('una contraseña mal puesta no abre la sesión y lo dice', async ({ page }) => {
  await page.goto('/')
  await page.getByLabel('Usuario').fill('propietario-e2e')
  await page.getByLabel('Contraseña').fill('esta-no-es-la-contrasena')
  await page.getByRole('button', { name: 'Entrar' }).click()

  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Hato', exact: true })).toBeHidden()
})

test('al volver a entrar después de salir, la sesión se abre otra vez', async ({ page }) => {
  await entrar(page)
  await salirDesdeElHato(page)

  await entrar(page)
  await expect(page.getByRole('heading', { name: 'Hato', exact: true })).toBeVisible()
})
