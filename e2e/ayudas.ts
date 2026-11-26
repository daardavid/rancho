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

/**
 * Entra con la cuenta de la prueba y espera Inicio.
 *
 * `#/` es Inicio desde INC-005: al abrir la app se ve lo que hay que revisar.
 * Las pruebas que necesitan el hato navegan con `irA(page, 'Hato')`.
 */
export async function entrar(page: Page): Promise<void> {
  await page.goto('/')
  await page.getByLabel('Usuario').fill(USUARIO_DE_PRUEBA)
  await page.getByLabel('Contraseña').fill(CONTRASENA_DE_PRUEBA)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Inicio', exact: true })).toBeVisible()
}

/** Entra y se queda en el hato, que es donde viven las capturas de animales. */
export async function entrarAlHato(page: Page): Promise<void> {
  await entrar(page)
  await irA(page, 'Hato')
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

/**
 * Da de alta un animal con nombre y tipo, y regresa al hato.
 *
 * El tipo importa para las capturas que separan becerros de vacas: «Agregar los
 * becerros activos» mira la categoría, no la edad.
 */
export async function darDeAltaComo(
  page: Page,
  nombre: string,
  categoria: 'Becerro' | 'Vaca' | 'Toro',
): Promise<void> {
  await abrirAlta(page)
  await page.getByLabel('Nombre o seña').fill(nombre)
  await page.getByRole('radio', { name: categoria, exact: true }).check()
  await guardarAlta(page)
  await expect(page.getByRole('heading', { name: nombre })).toBeVisible()
  await page.getByRole('button', { name: 'Regresar al hato' }).click()
  await expect(page.getByRole('heading', { name: 'Hato', exact: true })).toBeVisible()
}

/**
 * Da de baja un animal desde su ficha, con el motivo en «No sé».
 *
 * Un animal dado de baja no está en el hato activo: es lo que prueba que el
 * pesaje no lo vuelve a proponer.
 */
export async function darDeBaja(page: Page, nombre: string): Promise<void> {
  await page.getByRole('button', { name: new RegExp(escapeRegex(nombre)) }).click()
  await expect(page.getByRole('heading', { name: nombre })).toBeVisible()
  await page.getByRole('button', { name: 'Dar de baja' }).click()
  await page.getByRole('button', { name: 'Dar de baja', exact: true }).click()
  await expect(page.getByText('Ya no está en el hato')).toBeVisible()
}

/**
 * El borrador del pesaje que vive en este navegador: la captura tal como quedó.
 *
 * Es la lectura más precisa de qué animales entraron a la sesión, y no depende
 * de cómo se pinten los renglones.
 */
export async function filasDelBorrador(page: Page): Promise<readonly string[]> {
  return page.evaluate(() => {
    const guardado = window.localStorage.getItem('rancho.pesaje.borrador')
    if (guardado === null) {
      return []
    }
    const borrador = JSON.parse(guardado) as { filas?: { animalId?: string }[] }
    return (borrador.filas ?? []).map((fila) => fila.animalId ?? '')
  })
}

/** Los animales que la API considera activos, y los que ya salieron. */
export async function animalesDeLaApi(page: Page): Promise<{
  activos: { id: string; categoria: string; nombre: string | null }[]
  salidas: { id: string; categoria: string; nombre: string | null }[]
}> {
  return page.evaluate(async () => {
    const activos = (await (await fetch('/api/animals')).json()) as {
      animales: { id: string; categoria: string; nombre: string | null }[]
    }
    const salidas = (await (await fetch('/api/animals?estado=salidas')).json()) as {
      animales: { id: string; categoria: string; nombre: string | null }[]
    }
    return { activos: activos.animales, salidas: salidas.animales }
  })
}

export function escapeRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Va a una pantalla de la barra de abajo. */
export async function irA(
  page: Page,
  pantalla: 'Inicio' | 'Hato' | 'Pesaje' | 'Crecimiento',
): Promise<void> {
  await page
    .getByRole('navigation', { name: 'Pantallas del rancho' })
    .getByRole('link', { name: pantalla, exact: true })
    .click()
}

/**
 * Cierra la sesión desde el menú ☰ del encabezado.
 *
 * Las cuatro pestañas llevan el mismo encabezado y el mismo menú, así que
 * «Salir» está siempre en el mismo sitio y no se repite suelto en la pantalla.
 */
export async function salirDesdeElMenu(page: Page): Promise<void> {
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
