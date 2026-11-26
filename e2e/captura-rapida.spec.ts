import { expect, test, type Page } from '@playwright/test'

import {
  animalesDeLaApi,
  darDeAltaComo,
  darDeAltaConNombre,
  darDeBaja,
  entrarAlHato,
  escapeRegex,
  filasDelBorrador,
  irA,
  nombreUnico,
} from './ayudas'

/**
 * La captura más corta y los detalles visuales de la prueba de INC-005.
 *
 * Lo que se cuida aquí es lo que David encontró usando la app: la vuelta de la
 * manga se arma de un toque, el potrero se crea sin salir de «Mover a…», la
 * madre se busca como se busca un animal en el pesaje, y ninguna pantalla abre
 * a media altura ni deja un control sin nombre para el lector de pantalla.
 */

/** Quita los renglones de la vuelta anterior para armar la sesión de esta prueba. */
async function quitarPropuestas(page: Page): Promise<void> {
  await expect(page.getByRole('button', { name: 'Agregar otro animal' })).toBeVisible()
  const quitar = page.getByRole('button', { name: 'Quitar', exact: true })
  for (let i = 0; i < 40 && (await quitar.count()) > 0; i += 1) {
    await quitar.first().click()
  }
  await expect(quitar).toHaveCount(0)
}

/**
 * Los controles visibles que un lector de pantalla anunciaría sin nombre.
 *
 * Se evalúa dentro de la página, así que la función se escribe sola: no puede
 * usar nada de este archivo. La regla es la del navegador, simplificada a lo que
 * hay en estas pantallas: `aria-label`, `aria-labelledby`, el `label` asociado
 * por `for`, el `label` que envuelve, y el texto visible del propio control.
 */
async function controlesSinNombre(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    function nombreAccesible(nodo: Element): string {
      const aria = nodo.getAttribute('aria-label')
      if (aria !== null && aria.trim() !== '') {
        return aria.trim()
      }
      const referenciado = nodo.getAttribute('aria-labelledby')
      if (referenciado !== null) {
        const texto = referenciado
          .split(/\s+/)
          .map((id) => document.getElementById(id)?.textContent ?? '')
          .join(' ')
          .trim()
        if (texto !== '') {
          return texto
        }
      }
      const id = nodo.getAttribute('id')
      if (id !== null) {
        const etiqueta = document.querySelector(`label[for="${CSS.escape(id)}"]`)
        const texto = etiqueta?.textContent?.trim() ?? ''
        if (texto !== '') {
          return texto
        }
      }
      const envoltorio = nodo.closest('label')
      const delEnvoltorio = envoltorio?.textContent?.trim() ?? ''
      if (delEnvoltorio !== '') {
        return delEnvoltorio
      }
      return (nodo.textContent ?? '').trim()
    }

    const controles = Array.from(
      document.querySelectorAll(
        'button, a[href], input[type="checkbox"], input[type="radio"], input[type="file"]',
      ),
    )
    const sinNombre: string[] = []
    for (const control of controles) {
      const elemento = control as HTMLElement
      if (elemento.closest('[aria-hidden="true"]') !== null) {
        continue
      }
      // Lo oculto no se anuncia: campos de archivo escondidos y pestañas que no
      // están en pantalla quedan fuera.
      if (elemento.offsetParent === null) {
        continue
      }
      if (nombreAccesible(control) === '') {
        sinNombre.push(control.outerHTML.slice(0, 220))
      }
    }
    return sinNombre
  })
}

test('«Agregar los becerros activos» llena la sesión con becerros y no con vacas ni bajas', async ({
  page,
}) => {
  await entrarAlHato(page)

  const becerroUno = nombreUnico('Becerro Manga Uno')
  const becerroDos = nombreUnico('Becerro Manga Dos')
  const vaca = nombreUnico('Vaca Manga')
  const becerroQueSalió = nombreUnico('Becerro Que Salió')

  for (const nombre of [becerroUno, becerroDos]) {
    await darDeAltaComo(page, nombre, 'Becerro')
  }
  await darDeAltaComo(page, vaca, 'Vaca')
  await darDeAltaComo(page, becerroQueSalió, 'Becerro')

  // El becerro dado de baja no vuelve: no está en el hato activo.
  await darDeBaja(page, becerroQueSalió)
  await irA(page, 'Hato')

  const { activos, salidas } = await animalesDeLaApi(page)
  const idDe = (nombre: string): string | undefined =>
    activos.find((animal) => animal.nombre === nombre)?.id
  // El que salió se busca por nombre: la base es una sola y puede haber otras
  // bajas de otras pruebas.
  const idDelQueSalió = salidas.find((animal) => animal.nombre === becerroQueSalió)?.id
  expect(idDelQueSalió).toBeDefined()
  expect(idDe(becerroQueSalió)).toBeUndefined()

  await irA(page, 'Pesaje')
  await expect(page.getByRole('heading', { name: 'Pesaje', exact: true })).toBeVisible()
  await quitarPropuestas(page)

  await page.getByRole('button', { name: 'Agregar otro animal' }).click()
  const atajo = page.getByRole('button', {
    name: /Agregar (el becerro activo|los \d+ becerros activos)/,
  })
  await expect(atajo).toBeVisible()
  await atajo.click()

  // Lo que de verdad entró a la sesión se lee del borrador del celular: es la
  // captura, no el dibujo de los renglones.
  const enLaSesion = await filasDelBorrador(page)
  expect(enLaSesion.length).toBeGreaterThan(0)

  const porId = new Map(activos.map((animal) => [animal.id, animal]))
  for (const animalId of enLaSesion) {
    const animal = porId.get(animalId)
    expect(animal, `El animal ${animalId} de la sesión no está activo`).toBeDefined()
    // La categoría, no la edad: la vuelta de la manga es de becerros.
    expect(animal?.categoria).toBe('calf')
  }

  expect(enLaSesion).toContain(idDe(becerroUno))
  expect(enLaSesion).toContain(idDe(becerroDos))
  expect(enLaSesion).not.toContain(idDe(vaca))
  expect(enLaSesion).not.toContain(idDelQueSalió)

  // Y la pantalla lo dice: la vaca no tiene renglón en la sesión.
  await expect(page.locator('.pesaje__renglon').filter({ hasText: vaca })).toHaveCount(0)
})

test('marcar varios en la lista los agrega de una sola vez', async ({ page }) => {
  await entrarAlHato(page)
  const uno = nombreUnico('En lote Uno')
  const dos = nombreUnico('En lote Dos')
  for (const nombre of [uno, dos]) {
    await darDeAltaComo(page, nombre, 'Becerro')
  }

  await irA(page, 'Pesaje')
  await expect(page.getByRole('heading', { name: 'Pesaje', exact: true })).toBeVisible()
  await quitarPropuestas(page)

  await page.getByRole('button', { name: 'Agregar otro animal' }).click()
  await page.getByLabel('Buscar', { exact: true }).fill('En lote')
  await page.getByRole('checkbox', { name: `Elegir a ${uno}` }).check()
  await page.getByRole('checkbox', { name: `Elegir a ${dos}` }).check()
  await page.getByRole('button', { name: 'Agregar 2 animales' }).click()

  await expect(page.locator('.pesaje__renglon').filter({ hasText: uno })).toBeVisible()
  await expect(page.locator('.pesaje__renglon').filter({ hasText: dos })).toBeVisible()
  expect(await filasDelBorrador(page)).toHaveLength(2)
})

test('crear el potrero desde «Mover a…» y mover dos animales en una sola pasada', async ({
  page,
}) => {
  await entrarAlHato(page)
  const uno = nombreUnico('Mueve Rápido Uno')
  const dos = nombreUnico('Mueve Rápido Dos')
  for (const nombre of [uno, dos]) {
    await darDeAltaConNombre(page, nombre)
    await page.getByRole('button', { name: 'Regresar al hato' }).click()
    await expect(page.getByRole('heading', { name: 'Hato', exact: true })).toBeVisible()
  }

  const potrero = nombreUnico('Potrero Nuevo')
  await page.getByRole('button', { name: 'Mover animales a un potrero' }).click()
  await page.getByRole('checkbox', { name: `Elegir a ${uno}` }).check()
  await page.getByRole('checkbox', { name: `Elegir a ${dos}` }).check()

  // El potrero se crea dentro del mismo panel: no hay que ir al menú.
  await page.getByRole('button', { name: 'Crear un potrero nuevo' }).click()
  await page.getByLabel('Nombre del potrero nuevo').fill(potrero)
  await page.getByRole('button', { name: 'Agregar potrero' }).click()

  // Queda elegido y el botón dice el destino.
  await expect(
    page.getByRole('radiogroup', { name: '¿A qué potrero?' }).getByRole('radio', { name: potrero }),
  ).toBeChecked()
  await page.getByRole('button', { name: `Mover 2 a ${potrero}` }).click()

  // Los dos quedaron ahí en una sola captura.
  await page.getByRole('button', { name: 'Menú' }).click()
  await page.getByRole('button', { name: 'Potreros' }).click()
  await expect(page.getByRole('heading', { name: 'Potreros' })).toBeVisible()
  await expect(page.getByRole('listitem').filter({ hasText: potrero })).toContainText(
    'Se esperan 2 animales',
  )
})

test('el buscador de la madre no ofrece machos ni animales dados de baja', async ({ page }) => {
  await entrarAlHato(page)
  const toro = nombreUnico('Toro Buscado')
  const vaca = nombreUnico('Vaca Buscada')
  const vacaQueSalió = nombreUnico('Vaca Que Salió')

  await darDeAltaComo(page, toro, 'Toro')
  await darDeAltaComo(page, vaca, 'Vaca')
  await darDeAltaComo(page, vacaQueSalió, 'Vaca')
  await darDeBaja(page, vacaQueSalió)
  await irA(page, 'Hato')

  await page.getByRole('button', { name: 'Menú' }).click()
  await page.getByRole('button', { name: 'Registrar nacimiento' }).click()
  await expect(page.getByRole('heading', { name: 'Nacimiento' })).toBeVisible()

  const buscar = page.getByLabel('Buscar la madre')

  // Una vaca activa sí aparece y se elige con un toque.
  await buscar.fill(vaca)
  await page.getByRole('button', { name: new RegExp(escapeRegex(vaca)) }).click()
  await expect(page.getByRole('button', { name: 'Quitar' })).toBeVisible()
  await page.getByRole('button', { name: 'Quitar' }).click()

  // Un macho no se ofrece.
  await buscar.fill(toro)
  await expect(page.getByText(/Ninguna hembra activa coincide/)).toBeVisible()
  await expect(page.getByRole('button', { name: new RegExp(escapeRegex(toro)) })).toHaveCount(0)

  // Un animal dado de baja tampoco.
  await buscar.fill(vacaQueSalió)
  await expect(page.getByText(/Ninguna hembra activa coincide/)).toBeVisible()
  await expect(
    page.getByRole('button', { name: new RegExp(escapeRegex(vacaQueSalió)) }),
  ).toHaveCount(0)
})

test('en Pesaje y en el hato ningún control queda sin nombre', async ({ page }) => {
  await entrarAlHato(page)
  const becerro = nombreUnico('Nombres Uno')
  const vaca = nombreUnico('Nombres Vaca')
  await darDeAltaComo(page, becerro, 'Becerro')
  await darDeAltaComo(page, vaca, 'Vaca')

  // El hato con sus dos filtros.
  await expect(page.getByRole('heading', { name: 'Hato', exact: true })).toBeVisible()
  expect(await controlesSinNombre(page)).toEqual([])

  // El modo de mover, con el panel abierto.
  await page.getByRole('button', { name: 'Mover animales a un potrero' }).click()
  await page.getByRole('checkbox', { name: `Elegir a ${becerro}` }).check()
  expect(await controlesSinNombre(page)).toEqual([])
  await page.getByRole('button', { name: 'Cancelar' }).click()

  // El modo de sanidad, con su formulario abierto.
  await page.getByRole('button', { name: 'Anotar sanidad a varios animales' }).click()
  await page.getByRole('checkbox', { name: `Elegir a ${becerro}` }).check()
  expect(await controlesSinNombre(page)).toEqual([])
  await page.getByRole('button', { name: 'Cancelar' }).click()

  // El pesaje con la lista de «Agregar» abierta.
  await irA(page, 'Pesaje')
  await expect(page.getByRole('heading', { name: 'Pesaje', exact: true })).toBeVisible()
  await quitarPropuestas(page)
  await page.getByRole('button', { name: 'Agregar otro animal' }).click()
  expect(await controlesSinNombre(page)).toEqual([])

  await page.getByLabel('Buscar', { exact: true }).fill('Nombres')
  expect(await controlesSinNombre(page)).toEqual([])
})

test('Potreros abre arriba y el botón flotante no tapa la lista', async ({ page }) => {
  // Una pantalla corta: así el hato se puede desplazar de verdad y el regreso
  // al inicio se comprueba, no se supone.
  await page.setViewportSize({ width: 430, height: 400 })
  await entrarAlHato(page)
  for (const nombre of [nombreUnico('Arriba Uno'), nombreUnico('Arriba Dos')]) {
    await darDeAltaComo(page, nombre, 'Becerro')
  }

  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight)
  })
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0)

  await page.getByRole('button', { name: 'Menú' }).click()
  await page.getByRole('button', { name: 'Potreros' }).click()
  await expect(page.getByRole('heading', { name: 'Potreros' })).toBeInViewport()
  expect(await page.evaluate(() => window.scrollY)).toBe(0)

  // De vuelta al hato, al final de la lista, la última fila queda por encima
  // del botón flotante.
  await page.getByRole('button', { name: 'Regresar al hato' }).click()
  await expect(page.getByRole('heading', { name: 'Hato', exact: true })).toBeVisible()
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight)
  })
  const flotante = await page.getByRole('link', { name: 'Registrar pesaje' }).boundingBox()
  const ultima = await page.locator('.hato__lista > li').last().boundingBox()
  expect(flotante).not.toBeNull()
  expect(ultima).not.toBeNull()
  if (flotante !== null && ultima !== null) {
    expect(ultima.y + ultima.height).toBeLessThanOrEqual(flotante.y)
  }

  // Y lo mismo con el panel de «Mover a…» abierto: su último botón tampoco
  // queda debajo del flotante.
  await page.getByRole('button', { name: 'Mover animales a un potrero' }).click()
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight)
  })
  const flotanteEnMover = await page.getByRole('link', { name: 'Registrar pesaje' }).boundingBox()
  const cancelar = await page.getByRole('button', { name: 'Cancelar' }).boundingBox()
  expect(flotanteEnMover).not.toBeNull()
  expect(cancelar).not.toBeNull()
  if (flotanteEnMover !== null && cancelar !== null) {
    expect(cancelar.y + cancelar.height).toBeLessThanOrEqual(flotanteEnMover.y)
  }

  // Y con el panel de sanidad, que es el otro que se abre desde el hato.
  await page.getByRole('button', { name: 'Cancelar' }).click()
  await page.getByRole('button', { name: 'Anotar sanidad a varios animales' }).click()
  await page.getByRole('checkbox', { name: /Elegir a Arriba/ }).first().check()
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight)
  })
  const flotanteEnSanidad = await page.getByRole('link', { name: 'Registrar pesaje' }).boundingBox()
  const cancelarSanidad = await page.getByRole('button', { name: 'Cancelar' }).boundingBox()
  expect(flotanteEnSanidad).not.toBeNull()
  expect(cancelarSanidad).not.toBeNull()
  if (flotanteEnSanidad !== null && cancelarSanidad !== null) {
    expect(cancelarSanidad.y + cancelarSanidad.height).toBeLessThanOrEqual(flotanteEnSanidad.y)
  }
})

test('al abrir el formulario de potrero nuevo, la tarjeta de «Empieza con un potrero» se va', async ({
  page,
}) => {
  await entrarAlHato(page)
  await page.getByRole('button', { name: 'Menú' }).click()
  await page.getByRole('button', { name: 'Potreros' }).click()
  await expect(page.getByRole('heading', { name: 'Potreros' })).toBeVisible()

  // Con potreros ya anotados la invitación no existe; se usa el «+» o la
  // tarjeta, el que esté.
  const agregar = page
    .getByRole('button', { name: 'Agregar el primer potrero' })
    .or(page.getByRole('button', { name: 'Agregar un potrero' }))
  await agregar.first().click()

  await expect(page.getByRole('heading', { name: 'Nuevo potrero' })).toBeVisible()
  await expect(page.getByText('Empieza con un potrero')).toHaveCount(0)
})
