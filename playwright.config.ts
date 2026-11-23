import { defineConfig, devices } from '@playwright/test'

/**
 * Las pruebas de punta a punta del rancho.
 *
 * Corren contra la aplicación construida: el mismo proceso de Fastify de
 * producción (web y API en un solo origen, cookie `Secure`) sobre una base de
 * prueba desechable. No usan el servidor de desarrollo: lo que se prueba es lo
 * que se despliega.
 *
 * `npm run test:e2e` construye antes de probar. Si falta `dist`, el servidor de
 * prueba no arranca y lo dice con un mensaje claro
 * ([`e2e/servidor.ts`](e2e/servidor.ts)), en vez de probar contra un camino que
 * nadie usa.
 *
 * `workers: 1`: las pruebas comparten la base y el proceso, y los flujos de la
 * fábrica son pocos; en paralelo se pisarían el hato y las sesiones que unos y
 * otros cuentan.
 */

const PUERTO = 4310

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  forbidOnly: true,
  retries: 0,
  reporter: [['list']],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  globalSetup: './e2e/preparar.ts',
  globalTeardown: './e2e/terminar.ts',
  use: {
    baseURL: `http://127.0.0.1:${String(PUERTO)}`,
    viewport: { width: 430, height: 932 },
    locale: 'es-MX',
    timezoneId: 'America/Mexico_City',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 430, height: 932 } },
    },
  ],
})
