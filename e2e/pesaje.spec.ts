import { expect, test } from '@playwright/test'

import { darDeAltaConNombre, entrar, irA, nombreUnico } from './ayudas'

/**
 * La vuelta por la báscula y lo que se ve después en crecimiento.
 *
 * Es el flujo central del incremento: tres animales, uno que se queda sin
 * pesar (un hueco), se guarda en un solo comando, se corrige un peso mal
 * anotado y la ganancia del intervalo aparece en crecimiento.
 *
 * Lo que se cuida aquí y no en una prueba de unidad:
 *
 * - El hueco **no** da de baja al animal ni se convierte en un peso cero.
 * - La calidad de cada peso queda asentada y se ve.
 * - Corregir no borra: el valor anterior queda en la historia.
 * - La ganancia la calcula el servidor sobre `numeric`; la pantalla la lee
 *   como texto, nunca como un `number`.
 */
test('una vuelta de 3 animales con un hueco, una corrección y la ganancia en crecimiento', async ({
  page,
}) => {
  await entrar(page)

  // Tres becerros con nombre propio. El nombre es único por corrida porque la
  // base es una sola y el hato no se vacía entre pruebas.
  const primero = nombreUnico('Becerro Uno')
  const segundo = nombreUnico('Becerro Dos')
  const tercero = nombreUnico('Becerro Tres')

  for (const nombre of [primero, segundo, tercero]) {
    await darDeAltaConNombre(page, nombre)
    await irA(page, 'Hato')
  }

  /** La vuelta 1: los tres con su peso. */
  await irA(page, 'Pesaje')
  await expect(page.getByRole('heading', { name: 'La vuelta por la báscula' })).toBeVisible()

  // Sin vuelta anterior no se propone a nadie (`OQ-OWN-003`): se buscan. Si
  // otra prueba ya guardó una vuelta, se quitan los propuestos y se arma la de
  // esta prueba con sus tres animales.
  await quitarPropuestas(page)

  await agregarAlPesaje(page, primero)
  await agregarAlPesaje(page, segundo)
  await agregarAlPesaje(page, tercero)

  await escribirKilos(page, primero, '180.500')
  await escribirKilos(page, segundo, '175')
  await escribirKilos(page, tercero, '190')

  await page.getByRole('button', { name: 'Guardar la sesión' }).click()
  await expect(page.getByRole('heading', { name: /Pesaje del/ })).toBeVisible()
  await expect(page.locator('.subtitulo')).toContainText('3 pesados')
  await expect(page.getByText('180.5 kg')).toBeVisible()

  // La vuelta 2: un mes después. La app propone a los tres de la vuelta
  // anterior; el tercero se esperaba y no pasó.
  await page.getByRole('button', { name: 'Pesaje de otra vuelta' }).click()
  await expect(page.getByRole('heading', { name: 'La vuelta por la báscula' })).toBeVisible()

  // Los tres vienen propuestos, con los kilos vacíos.
  await expect(page.getByText('3 animales · 0 capturados')).toBeVisible()

  await escribirKilos(page, primero, '215.5')
  await escribirKilos(page, segundo, '188')

  // El tercero se esperaba y no pasó: hueco, no un peso cero.
  const renglonTercero = renglonDe(page, tercero)
  await renglonTercero.getByRole('button', { name: 'No se pesó' }).click()
  await expect(renglonTercero.getByText('No se pesó.')).toBeVisible()

  await page.getByRole('button', { name: 'Guardar la sesión' }).click()
  await expect(page.getByRole('heading', { name: /Pesaje del/ })).toBeVisible()

  // Dos pesados y un hueco: el hueco se ve como «No se pesó», no como una baja.
  await expect(page.locator('.subtitulo')).toContainText('2 pesados')
  await expect(page.locator('.subtitulo')).toContainText('1 no se pesó')
  await expect(page.getByText('215.5 kg')).toBeVisible()

  // La ganancia del primero: 215.5 − 180.5 = 35 kg. Se ve en la ficha, no en
  // una columna editable.
  await irA(page, 'Crecimiento')
  await expect(page.getByRole('heading', { name: 'Quién va bien y quién va atrás' })).toBeVisible()

  const filaDelPrimero = page.getByRole('row', { name: new RegExp(primero) })
  await expect(filaDelPrimero).toContainText('35 kg')

  // El que no se pesó va primero y lo dice, sin haber salido del hato.
  const filaDelTercero = page.getByRole('row', { name: new RegExp(tercero) })
  await expect(filaDelTercero).toContainText('No se pesó en la última')
})

test('corregir un peso mal anotado guarda el valor anterior en la historia', async ({ page }) => {
  await entrar(page)
  const nombre = nombreUnico('Becerro a corregir')
  await darDeAltaConNombre(page, nombre)
  await irA(page, 'Pesaje')
  await quitarPropuestas(page)

  await agregarAlPesaje(page, nombre)
  await escribirKilos(page, nombre, '201')
  await page.getByRole('button', { name: 'Guardar la sesión' }).click()
  await expect(page.getByRole('heading', { name: /Pesaje del/ })).toBeVisible()
  await expect(page.getByText('201 kg')).toBeVisible()

  await page.getByRole('button', { name: 'Corregir este peso' }).click()

  // El formulario dice qué había antes y pide el motivo.
  await expect(page.getByText(/antes decía 201 kg/)).toBeVisible()

  await page.getByLabel('Kilos').fill('205.250')
  await page.getByLabel('¿Por qué se corrige?').fill('Se anotó mal en el cuaderno.')
  await page.getByRole('button', { name: 'Guardar corrección' }).click()

  // El peso quedó corregido. La sesión enseña el hecho vigente; la historia de
  // la corrección se lee en la ficha del animal, que es donde vive el peso con
  // su valor anterior, quién lo cambió y por qué.
  await expect(page.getByText('205.25 kg')).toBeVisible()

  await page.getByRole('button', { name: '← Hato' }).click()
  await expect(page.getByRole('heading', { name: 'Hato', exact: true })).toBeVisible()
  await page.getByRole('button', { name: new RegExp(nombre) }).click()

  await expect(page.getByRole('heading', { name: nombre })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Pesos' })).toBeVisible()
  await expect(page.getByText(/antes decía «201 kg»/)).toBeVisible()
  await expect(page.getByText(/Se anotó mal en el cuaderno\./)).toBeVisible()
})

test('un peso con calidad «me lo dijeron» se guarda y se ve distinto de uno medido', async ({
  page,
}) => {
  await entrar(page)
  const nombre = nombreUnico('Becerro declarado')
  await darDeAltaConNombre(page, nombre)
  await irA(page, 'Pesaje')
  await quitarPropuestas(page)

  await agregarAlPesaje(page, nombre)
  await escribirKilos(page, nombre, '150')

  const renglon = renglonDe(page, nombre)
  await renglon.getByLabel('¿Cómo se obtuvo?').selectOption('declared')

  await page.getByRole('button', { name: 'Guardar la sesión' }).click()
  await expect(page.getByRole('heading', { name: /Pesaje del/ })).toBeVisible()

  // Medido y declarado no se mezclan: el peso dice cómo se obtuvo.
  await expect(page.getByText('Me lo dijeron')).toBeVisible()
  await expect(page.getByText('Medido en la báscula')).toBeHidden()
})

test('cerrar sesión tira la vuelta a medias de este celular', async ({ page }) => {
  await entrar(page)
  await irA(page, 'Pesaje')
  await expect(page.getByRole('heading', { name: 'La vuelta por la báscula' })).toBeVisible()

  await quitarPropuestas(page)
  await page.getByLabel('Buscar', { exact: true }).fill('no-hay-nadie')
  // Basta con que exista un borrador: lo que se mira es que salir lo borre.
  await expect(page.getByText('Ningún animal coincide o ya está en la sesión.')).toBeVisible()

  const antes = await page.evaluate(() => window.localStorage.getItem('rancho.pesaje.borrador'))
  expect(antes).not.toBeNull()

  await page.getByRole('button', { name: 'Salir' }).click()
  await expect(page.getByRole('heading', { name: 'Entra para ver tu hato' })).toBeVisible()

  const despues = await page.evaluate(() => window.localStorage.getItem('rancho.pesaje.borrador'))
  expect(despues).toBeNull()

  // Al volver a entrar, el pesaje empieza limpio: nadie hereda la captura ajena.
  await entrar(page)
  await irA(page, 'Pesaje')
  await expect(page.getByRole('heading', { name: 'La vuelta por la báscula' })).toBeVisible()
  await expect(page.getByLabel('Buscar', { exact: true })).toHaveValue('')
})

/** Busca el animal en el pesaje y lo agrega a la vuelta. */
async function agregarAlPesaje(
  page: import('@playwright/test').Page,
  nombre: string,
): Promise<void> {
  const buscar = page.getByLabel('Buscar', { exact: true })
  await buscar.fill(nombre)
  await page.getByRole('button', { name: new RegExp(`\\+ ${escapeRegex(nombre)}`) }).click()
  await expect(renglonDe(page, nombre)).toBeVisible()
}

/**
 * Quita los renglones que trajo la propuesta.
 *
 * La app propone a los animales de la última vuelta anterior, que es lo que
 * hace en el rancho. En una prueba que solo mira un animal, esos renglones
 * sobran y dejarían la sesión a medias; se quitan a mano, como haría el dueño.
 *
 * Espera a que la vuelta esté armada antes de contar: mientras las consultas
 * están en vuelo la pantalla dice «Armando la sesión de pesaje…» y no hay
 * renglones que quitar.
 */
async function quitarPropuestas(page: import('@playwright/test').Page): Promise<void> {
  await expect(page.getByRole('heading', { name: 'Los animales de esta vuelta' })).toBeVisible()

  const quitar = page.getByRole('button', { name: 'Quitar' })
  let quedan = await quitar.count()
  while (quedan > 0) {
    await quitar.first().click()
    const ahora = await quitar.count()
    if (ahora === quedan) {
      break
    }
    quedan = ahora
  }
  await expect(quitar).toHaveCount(0)
}

/** El renglón de un animal dentro de la vuelta. */
function renglonDe(page: import('@playwright/test').Page, nombre: string) {
  return page.locator('.renglon').filter({ hasText: nombre })
}

async function escribirKilos(
  page: import('@playwright/test').Page,
  nombre: string,
  kilos: string,
): Promise<void> {
  await renglonDe(page, nombre).getByLabel('Kilos').fill(kilos)
}

function escapeRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
