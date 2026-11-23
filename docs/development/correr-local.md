# Correr RANCHO en una laptop

Cómo levantar todo de cero en una laptop: la base, el rancho, la cuenta del
propietario y el proceso que sirve la API y la web. Es la guía para probar
INC-001 a mano; la aplicación no se despliega en ningún lado todavía (eso es
INC-002).

Si solo quieres ver que las cosas pasan, la sección "En dos comandos" alcanza.
El resto explica qué hace cada paso y qué hacer cuando algo falla.

## Lo que hace falta

| Qué | Versión | Para qué |
| --- | --- | --- |
| Node.js | `^20.19.0` o `>=22.12.0` (el repo se armó con 24 LTS) | Todo |
| npm | El que viene con Node | Instalar y correr |
| PostgreSQL | 17, o Docker si prefieres no instalarlo | La base de desarrollo |
| Una terminal | PowerShell en Windows, la que sea en macOS o Linux | Comandos |

Docker es opcional: si no lo tienes, apunta `DATABASE_URL` a cualquier
PostgreSQL alcanzable. Es el mismo motor, no dos bases distintas.

## En dos comandos

```bash
npm install
cp .env.example .env
```

Edita `.env`:

- `DATABASE_URL` con tu PostgreSQL.
- `RANCH_NAME` con el nombre del rancho. La semilla **no inventa** un nombre;
  si falta, se niega.
- `SESSION_SECRET` con un secreto del largo que pide. Genéralo:

  ```bash
  openssl rand -base64 32
  ```

  En PowerShell sin OpenSSL:

  ```powershell
  [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
  ```

Después, ya con la base arriba:

```bash
npm run db:migrate -w @rancho/api
npm run db:seed -w @rancho/api
npm run cuenta:crear -w @rancho/api -- --rol owner --usuario propietario
npm run build
npm start
```

Abre [http://127.0.0.1:3000/](http://127.0.0.1:3000/) y entra con el usuario y
la contraseña que acabas de crear.

## Paso por paso

### 1. La base

Con Docker, desde la raíz del repo:

```bash
docker compose up -d
```

Eso levanta PostgreSQL 17 en `127.0.0.1:5432` con usuario, contraseña y base de
marcador (`rancho` / `rancho` / `rancho`). Son marcadores locales, no secretos:
están en `docker-compose.yml` a la vista y no sirven para nada más.

Sin Docker, crea una base en tu PostgreSQL y pon su cadena en `DATABASE_URL`.
No hace falta ningún esquema: las migraciones lo crean.

### 2. Las migraciones

```bash
npm run db:migrate -w @rancho/api
```

Aplica la secuencia de `apps/api/drizzle/`. Es un comando explícito y aparte:
**el servidor nunca migra al arrancar**. En un despliegue, la migración va antes
de levantar el proceso nuevo ([deployment-strategy.md](../architecture/deployment-strategy.md)).

Si ya migraste y quieres empezar de cero, `npm run db:reset -w @rancho/api`
tira los esquemas de esta tarea y vuelve a aplicar las migraciones. Se niega
contra un host que no sea esta máquina y cuando `NODE_ENV=production`.

### 3. El rancho

```bash
npm run db:seed -w @rancho/api
```

Crea el único rancho con el nombre que diga `RANCH_NAME`. Si ya hay uno, no lo
renombra ni crea otro: dice cuál encontró. `RANCH_NAME` no tiene valor por
omisión porque el nombre del rancho es un dato de David, no algo que el código
pueda adivinar.

### 4. La cuenta del propietario

```bash
npm run cuenta:crear -w @rancho/api -- --rol owner --usuario propietario
```

Pide la contraseña sin mostrarla y la hashea con Argon2id. El largo mínimo es 8.
No hay registro público: la cuenta se crea una vez, aquí.

El rol `owner` es el del rancho; `support` es una cuenta de los desarrolladores,
y sus escrituras quedan a nombre de esa cuenta, no del propietario
([ADR-010](../architecture/adr/ADR-010-authentication.md)).

> Pasar argumentos con `--` y banderas funciona en `npm.cmd` desde PowerShell o
> `cmd`. Si usas `pwsh` 7 y las banderas se pierden, llama al archivo directo:
>
> ```bash
> cd apps/api
> npx tsx src/infrastructure/identity/cli-cuenta.ts --rol owner --usuario propietario
> ```

### 5. Construir

```bash
npm run build
```

Construye la web (`apps/web/dist`) y la API (`apps/api/dist/main.js`). La API
sale como un solo archivo ESM; la web, como archivos con hash en el nombre.

### 6. Arrancar

```bash
npm start
```

El mismo proceso de Fastify sirve:

- la API en `/api`,
- la web en `/`.

Un solo origen es lo que hace que la cookie de sesión sea de primera parte. El
proceso lee estas variables:

| Variable | Obligatoria | Qué hace |
| --- | --- | --- |
| `DATABASE_URL` | Sí | A qué PostgreSQL se conecta |
| `SESSION_SECRET` | Sí, al menos 32 caracteres | Firma la huella de las cookies de sesión |
| `PORT` | No, omite `3000` | En qué puerto escucha |
| `HOST` | No, omite `127.0.0.1` | En qué interfaz escucha. En un contenedor, `0.0.0.0` |
| `DB_POOL` | No, omite `10` | Conexiones del pool. Bájalo a `1` solo si tu base atiende una conexión a la vez |
| `WEB_DIST` | No | Dónde está la web construida, si no es `apps/web/dist` |
| `NODE_ENV` | No | Con `production`, la cookie lleva `Secure` y el log baja de nivel |

Si falta `DATABASE_URL` o `SESSION_SECRET`, o si el secreto es más corto de 32
caracteres, el proceso **no arranca** y dice exactamente qué falta. No hay
valores de relleno: un proceso de producción con un secreto inventado es peor
que uno que no arranca.

`Secure` significa que el navegador solo manda la cookie por HTTPS. En
`http://127.0.0.1` los navegadores tratan al host como seguro y la aceptan, así
que la prueba local funciona; en un despliegue de verdad hace falta HTTPS.

## Modo desarrollo

Para trabajar en el código, con recarga al guardar, son dos terminales:

```bash
npm run dev:api    # API en http://127.0.0.1:3000
npm run dev:web    # web en http://localhost:5173
```

Vite sirve la web y manda `/api` a la API, así que no hay URL que configurar ni
CORS. En este modo la API no sirve la web: no hay `apps/web/dist` que servir, o
la que haya es de un build viejo. Abre `http://localhost:5173/`.

## Las pruebas

```bash
npm run lint        # oxlint en todos los workspaces
npm run typecheck   # tsc --noEmit en la API, la web y los contratos
npm test            # Vitest en los tres
npm run test:e2e    # Playwright contra lo construido
```

`npm test` **no necesita Docker ni una base levantada**: las pruebas de
persistencia arrancan PGlite en el proceso (ADR-014). Si defines
`TEST_DATABASE_URL`, usan ese PostgreSQL.

`npm run test:e2e` construye primero y después corre los flujos de Playwright
contra la aplicación construida, en `http://127.0.0.1:4310`. Levanta su propia
base desechable con PGlite, así que tampoco necesita Docker ni tocar la base de
desarrollo. Al terminar, esa base desaparece.

Los flujos cubiertos son los del incremento: entrar y salir, dar de alta un
animal con todo en «No sé», una vuelta de tres animales con un hueco, corregir
un peso y ver la ganancia en crecimiento.

Si `npm run test:e2e` falla diciendo que el puerto `4310` está ocupado, quedó un
servidor de una corrida anterior. Ciérralo antes de volver a probar: si no, las
pruebas pasarían contra ese proceso y no contra lo recién construido.

## Lo que suele fallar

| Síntoma | Qué pasa | Qué hacer |
| --- | --- | --- |
| `Falta DATABASE_URL` | No hay `.env` o no tiene la variable | Copia `.env.example` a `.env` y complétalo |
| `Falta SESSION_SECRET` | Igual, con el secreto | Genera uno con `openssl rand -base64 32` |
| `SESSION_SECRET tiene N caracteres…` | El secreto es corto | Genera uno nuevo; no lo alargues a mano |
| `No hay un rancho sembrado…` | Se creó la cuenta antes de la semilla | Corre `db:seed` y vuelve a crear la cuenta |
| `Falta RANCH_NAME…` | La semilla no inventa el nombre | Ponlo en `.env` |
| `db:reset solo corre contra una base local` | Apuntaste a un host que no es esta máquina | Es a propósito; usa una base local |
| El navegador dice que no hay conexión | La API no está arriba, o está en otro puerto | Revisa la terminal del proceso; `GET /api/health` debe responder `{"ok":true}` |

Hay dos endpoints de salud: `GET /api/health` dice que el proceso responde;
`GET /api/health/ready` revisa PostgreSQL. Ninguno imprime cadenas de conexión
ni secretos.

## Datos

- No subas datos reales del rancho al repo: ni nombres de animales reales, ni
  aretes reales, ni fotos de cuadernos. Las pruebas usan datos sintéticos.
- `.env` nunca se sube. Está en `.gitignore`.
- La base de desarrollo y la de las pruebas son distintas. `db:reset` solo toca
  la de desarrollo, y solo en esta máquina.
