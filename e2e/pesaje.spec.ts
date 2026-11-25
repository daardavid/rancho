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
  await expect(page.getByRole('heading', { name: 'Pesaje', exact: true })).toBeVisible()

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

  await page.getByRole('button', { name: 'Guardar pesaje (3)' }).click()
  await expect(page.getByRole('heading', { name: /Pesaje del/ })).toBeVisible()
  await expect(page.locator('.subtitulo')).toContainText('3 pesados')
  await expect(page.getByText('180.5 kg')).toBeVisible()

  // La vuelta 2: un mes después. La app propone a los tres de la vuelta
  // anterior; el tercero se esperaba y no pasó.
  await page.getByRole('button', { name: 'Pesaje de otra vuelta' }).click()
  await expect(page.getByRole('heading', { name: 'Pesaje', exact: true })).toBeVisible()

  // Los tres vienen propuestos, con los kilos vacíos.
  await expect(page.getByText('0 de 3 pesados')).toBeVisible()
  await expect(page.getByText('3 faltan')).toBeVisible()

  await escribirKilos(page, primero, '215.5')
  await tomarFoto(page, primero)
  await escribirKilos(page, segundo, '188')

  // El tercero se esperaba y no pasó: hueco, no un peso cero.
  await escribirKilos(page, tercero, '')
  const renglonTercero = renglonDe(page, tercero)
  await renglonTercero.getByRole('button', { name: 'No se pesó' }).click()
  await expect(page.getByRole('button', { name: new RegExp(escapeRegex(tercero)) })).toContainText(
    'No se pesó',
  )

  await page.getByRole('button', { name: 'Guardar pesaje (2)' }).click()
  await expect(page.getByRole('heading', { name: /Pesaje del/ })).toBeVisible()

  // Dos pesados y un hueco: el hueco se ve como «No se pesó», no como una baja.
  await expect(page.locator('.subtitulo')).toContainText('2 pesados')
  await expect(page.locator('.subtitulo')).toContainText('1 no se pesó')
  await expect(page.getByText('215.5 kg')).toBeVisible()
  await expect(page.getByRole('img', { name: 'Foto de la báscula' })).toBeVisible()

  // La ganancia del primero: 215.5 − 180.5 = 35 kg. Las dos vueltas son del
  // mismo día, así que no hay kilos por día: se ve el texto que calculó el
  // servidor, no un número armado en el navegador.
  await irA(page, 'Crecimiento')
  await expect(page.getByRole('heading', { name: 'Crecimiento', exact: true })).toBeVisible()

  const tarjetaDelPrimero = page.getByRole('listitem').filter({ hasText: primero })
  await expect(tarjetaDelPrimero).toContainText('35 kg')

  // El que no se pesó sale en «Revisar primero» y lo dice, sin haber salido del hato.
  const tarjetaDelTercero = page.getByRole('listitem').filter({ hasText: tercero })
  await expect(tarjetaDelTercero).toContainText('No se pesó')
  await expect(page.getByRole('region', { name: 'Revisar primero' })).toContainText(tercero)
})

test('corregir un peso mal anotado guarda el valor anterior en la historia', async ({ page }) => {
  await entrar(page)
  const nombre = nombreUnico('Becerro a corregir')
  await darDeAltaConNombre(page, nombre)
  await irA(page, 'Pesaje')
  await quitarPropuestas(page)

  await agregarAlPesaje(page, nombre)
  await escribirKilos(page, nombre, '201')
  await page.getByRole('button', { name: 'Guardar pesaje (1)' }).click()
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
  // La historia de cada peso se ve con el peso: es de ese hecho, no de la ficha.
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
  await renglon.getByRole('button', { name: 'Medido en la báscula' }).click()
  await renglon.getByRole('radio', { name: 'Me lo dijeron' }).click()

  await page.getByRole('button', { name: 'Guardar pesaje (1)' }).click()
  await expect(page.getByRole('heading', { name: /Pesaje del/ })).toBeVisible()

  // Medido y declarado no se mezclan: el peso dice cómo se obtuvo.
  await expect(page.getByText('Me lo dijeron')).toBeVisible()
  await expect(page.getByText('Medido en la báscula')).toBeHidden()
})

test('cerrar sesión tira la vuelta a medias de este celular', async ({ page }) => {
  await entrar(page)
  await irA(page, 'Pesaje')
  await expect(page.getByRole('heading', { name: 'Pesaje', exact: true })).toBeVisible()

  await quitarPropuestas(page)
  await page.getByRole('button', { name: 'Agregar otro animal' }).click()
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
  await expect(page.getByRole('heading', { name: 'Pesaje', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Agregar otro animal' }).click()
  await expect(page.getByLabel('Buscar', { exact: true })).toHaveValue('')
})

/** Busca el animal en el pesaje y lo agrega a la vuelta. */
async function agregarAlPesaje(
  page: import('@playwright/test').Page,
  nombre: string,
): Promise<void> {
  const buscar = page.getByLabel('Buscar', { exact: true })
  if (!(await buscar.isVisible())) {
    await page.getByRole('button', { name: 'Agregar otro animal' }).click()
  }
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
  await expect(page.getByRole('heading', { name: 'Pesaje', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Agregar otro animal' })).toBeVisible()

  const quitar = page.getByRole('button', { name: 'Quitar', exact: true })
  // Solo la tarjeta activa tiene «Quitar», así que el conteo se queda en 1
  // hasta sacar al último. El tope evita un ciclo si el botón dejara de quitar.
  for (let i = 0; i < 30 && (await quitar.count()) > 0; i += 1) {
    await quitar.first().click()
  }
  await expect(quitar).toHaveCount(0)
}

/** El renglón de un animal dentro de la vuelta: la tarjeta activa o la fila. */
function renglonDe(page: import('@playwright/test').Page, nombre: string) {
  return page.locator('.pesaje__renglon').filter({ hasText: nombre })
}

async function escribirKilos(
  page: import('@playwright/test').Page,
  nombre: string,
  kilos: string,
): Promise<void> {
  const campo = page.getByRole('textbox', { name: `Kilos de ${nombre}` })
  if (kilos === '') {
    await page.getByRole('button', { name: new RegExp(escapeRegex(nombre)) }).click()
    await expect(renglonDe(page, nombre).getByRole('button', { name: 'No se pesó' })).toBeVisible()
    return
  }
  if (!(await campo.isVisible())) {
    await page.getByRole('button', { name: new RegExp(escapeRegex(nombre)) }).click()
  }
  await campo.fill(kilos)
}

/** Una foto mínima del indicador. No cambia la calidad del peso. */
async function tomarFoto(page: import('@playwright/test').Page, nombre: string): Promise<void> {
  await renglonDe(page, nombre).getByLabel('Foto de la báscula', { exact: true }).setInputFiles({
    name: 'bascula.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.from(
      '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA//2Q==',
      'base64',
    ),
  })
  await expect(page.getByRole('button', { name: /Guardar pesaje/ })).toBeEnabled()
}

function escapeRegex(texto: string): string {
  return texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
