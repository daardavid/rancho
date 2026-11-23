import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
  type ArchivoFuente,
  revisarArchivo,
  revisarFronteras,
} from './import-boundaries'

const RAIZ_SRC = fileURLToPath(new URL('../../src', import.meta.url))

function listarFuentes(directorio: string): ArchivoFuente[] {
  const archivos: ArchivoFuente[] = []

  for (const entrada of readdirSync(directorio, { withFileTypes: true })) {
    const ruta = join(directorio, entrada.name)

    if (entrada.isDirectory()) {
      archivos.push(...listarFuentes(ruta))
      continue
    }

    if (!/\.(?:ts|tsx|mts|cts)$/.test(entrada.name)) {
      continue
    }

    archivos.push({
      ruta: relative(RAIZ_SRC, ruta).split(sep).join('/'),
      contenido: readFileSync(ruta, { encoding: 'utf-8' }),
    })
  }

  return archivos
}

function ejemplo(ruta: string, contenido: string): ArchivoFuente {
  return { ruta, contenido }
}

describe('prueba de fronteras sobre el código real', () => {
  it('no deja pasar un import que rompa las reglas de ADR-012', () => {
    const archivos = listarFuentes(RAIZ_SRC)
    const hallazgos = revisarFronteras(archivos)

    expect(
      hallazgos.map((hallazgo) => `${hallazgo.archivo}:${hallazgo.linea ?? '?'} ${hallazgo.detalle}`),
    ).toEqual([])
  })

  it('revisa archivos de verdad y no una lista vacía', () => {
    // Si la prueba recorriera cero archivos pasaría en verde sin proteger nada.
    expect(listarFuentes(RAIZ_SRC).length).toBeGreaterThan(5)
  })
})

describe('regla 1: fuera de un módulo solo se entra por su index.ts', () => {
  it('falla cuando http/ importa el domain/ de un módulo', () => {
    const hallazgos = revisarArchivo(
      ejemplo(
        'http/routes/animales.ts',
        ["import { Animal } from '../../modules/herd/domain/animal'", 'export const x = Animal'].join(
          '\n',
        ),
      ),
    )

    expect(hallazgos).toHaveLength(1)
    expect(hallazgos[0]?.regla).toBe('solo-el-index-publico')
    expect(hallazgos[0]?.linea).toBe(1)
  })

  it('falla cuando http/ importa la aplicación interna de un módulo', () => {
    const hallazgos = revisarArchivo(
      ejemplo(
        'http/routes/animales.ts',
        "import { registrar } from '../../modules/herd/application/registrar-animal'",
      ),
    )

    expect(hallazgos.map((hallazgo) => hallazgo.regla)).toEqual(['solo-el-index-publico'])
  })

  it('falla cuando un orquestador importa la persistencia de un módulo', () => {
    const hallazgos = revisarArchivo(
      ejemplo(
        'application/registrar-venta.ts',
        "import { tablaAnimales } from '../modules/herd/persistence/tablas'",
      ),
    )

    expect(hallazgos.map((hallazgo) => hallazgo.regla)).toEqual(['tablas-ajenas'])
  })

  it('falla cuando http/ importa la persistencia de un módulo', () => {
    const hallazgos = revisarArchivo(
      ejemplo(
        'http/routes/animales.ts',
        "import { tablaAnimales } from '../../modules/herd/persistence/tablas'",
      ),
    )

    expect(hallazgos.map((hallazgo) => hallazgo.regla)).toEqual(['tablas-ajenas'])
  })

  it('falla cuando un módulo entra al domain/ de otro módulo', () => {
    const hallazgos = revisarArchivo(
      ejemplo(
        'modules/growth/application/pesar.ts',
        "import { Animal } from '../../herd/domain/animal'",
      ),
    )

    expect(hallazgos.map((hallazgo) => hallazgo.regla)).toEqual(['solo-el-index-publico'])
  })

  it('pasa cuando un módulo entra por el index.ts público del otro', () => {
    const hallazgos = revisarArchivo(
      ejemplo(
        'modules/growth/application/pesar.ts',
        "import { buscarActivos } from '../../herd'",
      ),
    )

    expect(hallazgos).toEqual([])
  })

  it('pasa cuando un módulo usa sus propias carpetas internas', () => {
    const hallazgos = revisarArchivo(
      ejemplo(
        'modules/herd/application/registrar-animal.ts',
        [
          "import { Animal } from '../domain/animal'",
          "import { tablaAnimales } from '../persistence/tablas'",
        ].join('\n'),
      ),
    )

    expect(hallazgos).toEqual([])
  })

  it('pasa cuando read-models/ lee una tabla ajena para un SELECT', () => {
    const hallazgos = revisarArchivo(
      ejemplo(
        'read-models/hato-activo.ts',
        "import { tablaAnimales } from '../modules/herd/persistence/tablas'",
      ),
    )

    expect(hallazgos).toEqual([])
  })

  it('falla con un import dinámico que salta la frontera', () => {
    const hallazgos = revisarArchivo(
      ejemplo(
        'http/routes/animales.ts',
        "const modulo = await import('../../modules/herd/domain/animal')",
      ),
    )

    expect(hallazgos.map((hallazgo) => hallazgo.regla)).toEqual(['solo-el-index-publico'])
  })

  it('falla con un export ... from que salta la frontera', () => {
    const hallazgos = revisarArchivo(
      ejemplo(
        'read-models/index.ts',
        "export { Animal } from '../modules/herd/domain/animal'",
      ),
    )

    expect(hallazgos.map((hallazgo) => hallazgo.regla)).toEqual(['solo-el-index-publico'])
  })
})

describe('regla 2: el dominio no conoce HTTP, persistencia, autenticación ni la web', () => {
  it('falla cuando domain/ importa Fastify', () => {
    const hallazgos = revisarArchivo(
      ejemplo(
        'modules/herd/domain/animal.ts',
        "import type { FastifyInstance } from 'fastify'",
      ),
    )

    expect(hallazgos.map((hallazgo) => hallazgo.regla)).toEqual([
      'dominio-sin-infraestructura',
    ])
  })

  it('falla cuando domain/ importa Drizzle', () => {
    const hallazgos = revisarArchivo(
      ejemplo(
        'modules/herd/domain/animal.ts',
        "import { pgTable } from 'drizzle-orm/pg-core'",
      ),
    )

    expect(hallazgos.map((hallazgo) => hallazgo.regla)).toEqual([
      'dominio-sin-infraestructura',
    ])
  })

  it('falla cuando domain/ importa una librería de autenticación', () => {
    const hallazgos = revisarArchivo(
      ejemplo(
        'modules/herd/domain/animal.ts',
        "import { betterAuth } from 'better-auth'",
      ),
    )

    expect(hallazgos.map((hallazgo) => hallazgo.regla)).toEqual([
      'dominio-sin-infraestructura',
    ])
  })

  it('falla cuando domain/ importa código de la web', () => {
    const hallazgos = revisarArchivo(
      ejemplo(
        'modules/herd/domain/animal.ts',
        "import { useQuery } from '@tanstack/react-query'",
      ),
    )

    expect(hallazgos.map((hallazgo) => hallazgo.regla)).toEqual([
      'dominio-sin-infraestructura',
    ])
  })

  it('falla cuando domain/ importa el domain/ de otro módulo', () => {
    const hallazgos = revisarArchivo(
      ejemplo(
        'modules/growth/domain/peso.ts',
        "import { Animal } from '../../herd/domain/animal'",
      ),
    )

    expect(hallazgos.map((hallazgo) => hallazgo.regla)).toEqual([
      'dominio-sin-otro-modulo',
      'solo-el-index-publico',
    ])
  })

  it('falla cuando domain/ entra por el index.ts de otro módulo', () => {
    // El index público es el camino correcto para un orquestador o una ruta, no
    // para el dominio de otro módulo: un dominio no conoce a su vecino.
    const hallazgos = revisarArchivo(
      ejemplo(
        'modules/growth/domain/peso.ts',
        "import { buscarActivos } from '../../herd'",
      ),
    )

    expect(hallazgos.map((hallazgo) => hallazgo.regla)).toEqual(['dominio-sin-otro-modulo'])
  })

  it('pasa cuando domain/ importa el núcleo compartido', () => {
    const hallazgos = revisarArchivo(
      ejemplo(
        'modules/herd/domain/animal.ts',
        "import { type AnimalId } from '../../../shared-kernel/ids'",
      ),
    )

    expect(hallazgos).toEqual([])
  })

  it('pasa con un paquete cuyo nombre solo se parece a Fastify', () => {
    const hallazgos = revisarArchivo(
      ejemplo(
        'modules/herd/domain/animal.ts',
        "import { ordenar } from 'fastify-plugin-helper-no'",
      ),
    )

    expect(hallazgos).toEqual([])
  })
})

describe('regla 4: ningún módulo importa la librería de autenticación', () => {
  it.each([
    'modules/herd/application/registrar.ts',
    'modules/herd/persistence/cuentas.ts',
  ])('falla cuando %s importa la librería de contraseñas', (ruta) => {
    const hallazgos = revisarArchivo(
      ejemplo(ruta, "import { hash } from '@node-rs/argon2'"),
    )

    expect(hallazgos.map((hallazgo) => hallazgo.regla)).toEqual(['modulo-sin-autenticacion'])
  })

  it('pasa cuando infrastructure/identity importa la librería de contraseñas', () => {
    const hallazgos = revisarArchivo(
      ejemplo(
        'infrastructure/identity/contrasena.ts',
        "import { hash } from '@node-rs/argon2'",
      ),
    )

    expect(hallazgos).toEqual([])
  })
})

describe('regla 3: el núcleo compartido no conoce módulos', () => {
  it('falla cuando shared-kernel importa un módulo', () => {
    const hallazgos = revisarArchivo(
      ejemplo(
        'shared-kernel/animal-id.ts',
        "import type { Animal } from '../modules/herd/domain/animal'",
      ),
    )

    expect(hallazgos.map((hallazgo) => hallazgo.regla)).toEqual([
      'nucleo-sin-modulos',
      'solo-el-index-publico',
    ])
  })
})
