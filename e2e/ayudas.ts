import { expect, type Page } from '@playwright/test'

import { CONTRASENA_DE_PRUEBA, USUARIO_DE_PRUEBA } from './aplicacion'

/**
 * Lo que comparten los flujos: entrar, dar de alta animales y moverse.
 *
 * Se escribe aquí y no en cada prueba porque el login y el alta son el mismo
 * camino en todas; lo que cambia es lo que se hace después. Los selectores
 * siguen el texto que ve el dueño, no los `id` que el navegador inventa: si una
 * pantalla cambia de palabras, la prueba falla, y eso es lo que se quiere.
 *
 * La base es una sola para toda la corrida, así que cada prueba crea sus
 * propios animales con nombres propios y no supone que el hato esté vacío. Es
 * lo que pasa en el rancho: el hato no se vacía entre una vuelta y otra.
 */

/** Entra con la cuenta de la prueba y espera el hato. */
export async function entrar(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByLabel('Usuario').fill(USUARIO_DE_PRUEBA)
  await page.getByLabel('Contraseña').fill(CONTRASENA_DE_PRUEBA)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Hato', exact: true })).toBeVisible()
}

/**
 * Abre el formulario de alta desde el hato.
 *
 * En un hato con animales la única entrada es el «+» del encabezado; en el hato
 * vacío la única invitación es la tarjeta del primer animal. Nunca están las dos
 * en pantalla: la acción no se repite.
 */
export async function abrirAlta(page: Page): Promise<void> {
  await page
    .getByRole('link', { name: 'Dar de alta un animal' })
    .or(page.getByRole('button', { name: 'Dar de alta el primer animal' }))
    .click()
  await expect(page.getByRole('heading', { name: 'Nuevo animal' })).toBeVisible()
}

/** Guarda el alta que está abierta, sin quedarse a capturar otro. */
export async function guardarAlta(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Guardar', exact: true }).click()
}

/** Abre «Más datos», donde viven la otra categoría, la participación y las notas. */
export async function abrirMasDatos(page: Page): Promise<void> {
  await page.getByRole('button', { name: /Más datos/ }).click()
}

/**
 * Da de alta un animal dejando todo en «No sé».
 *
 * Es el caso que el incremento pide: lo único que se crea es la identidad
 * interna; nombre, sexo, categoría, tenencia y participación quedan
 * desconocidos, y el «No sé» se ve como una opción más, no como un error.
 */
export async function darDeAltaSinSaber(page: Page): Promise<void> {
  await abrirAlta(page)
  // Los campos ya vienen contestados con «No sé» ([UX-04](../../docs/product/ux-principles.md)):
  // no se toca ninguno y se guarda.
  await guardarAlta(page)
  await expect(page.getByRole('heading', { name: 'Sin nombre o seña' })).toBeVisible()
}

/** Da de alta un animal con nombre, para poder distinguirlo en el pesaje. */
export async function darDeAltaConNombre(page: Page, nombre: string): Promise<void> {
  await abrirAlta(page)
  await page.getByLabel('Nombre o seña').fill(nombre)
  await guardarAlta(page)
  await expect(page.getByRole('heading', { name: nombre })).toBeVisible()
}

/** Va a una pantalla de la barra de abajo. */
export async function irA(page: Page, pantalla: 'Hato' | 'Pesaje' | 'Crecimiento'): Promise<void> {
  await page
    .getByRole('navigation', { name: 'Pantallas del rancho' })
    .getByRole('link', { name: pantalla, exact: true })
    .click()
}

/**
 * Cierra la sesión desde el hato.
 *
 * «Salir» vive en el menú del encabezado, para no repetir acciones en la
 * pantalla. En las demás pantallas sigue en su barra de sesión.
 */
export async function salirDesdeElHato(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Menú' }).click()
  await page.getByRole('button', { name: 'Salir' }).click()
  await expect(page.getByRole('heading', { name: 'Entra para ver tu hato' })).toBeVisible()
}

/**
 * Un nombre único por prueba.
 *
 * Las pruebas comparten la base y el hato no se vacía entre una y otra; con
 * nombres propios cada una encuentra lo suyo y no depende del orden.
 */
export function nombreUnico(base: string): string {
  return `${base} ${String(Date.now()).slice(-6)}-${String(Math.floor(Math.random() * 1000))}`
}
