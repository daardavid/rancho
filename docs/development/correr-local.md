# Correr RANCHO en una laptop

Cómo levantar la app en una laptop. El camino de todos los días es `npm run local`:
no pide PostgreSQL ni Docker, guarda los datos en `.datos/` y dice la dirección
para abrirla desde el celular en la misma WiFi. El resto de esta página es el
camino con un PostgreSQL de servidor, para trabajar contra esa base.

## En un comando

Hace falta Node.js (`^20.19.0` o `>=22.12.0`) y npm. Nada más.

```bash
npm install
npm run local
```

La primera vez:

- crea `.datos/` si no está (git la ignora; ahí vive la base);
- genera `SESSION_SECRET` con `crypto` si `.env` no tiene uno, y lo guarda;
- pregunta el nombre del rancho si `RANCH_NAME` no está, y lo guarda;
- aplica las mismas migraciones que un PostgreSQL de servidor;
- si no hay ninguna cuenta, pide usuario y contraseña (la contraseña no se
  muestra) y crea una cuenta con rol `support`, que es con la que David usa
  esta instalación ([INC-002](../product/increments/INC-002-todo-en-local.md)).
  El rol `owner` se crea después, con `cuenta:crear`, cuando el propietario
  vaya a usarla;
- construye la web y la API si falta la construcción o el código es más nuevo;
- arranca y escucha en la red local.

En la consola salen dos direcciones: una para esta máquina y otra para el
celular, en la misma WiFi. La primera vez Windows puede pedir permiso en el
firewall para Node; sin eso el celular no llega.

Es HTTP en la red de la casa. La cookie de sesión no lleva `Secure`, para que
el celular la guarde. El arranque lo dice. Con `NODE_ENV=production` la cookie
lleva `Secure` sin excepción, y el proceso se niega a arrancar si además está
`MODO=local`.

Correrlo otra vez no regenera el secreto, no crea otro rancho, no crea otra
cuenta y no borra datos. Si ya hay cuenta, dice el usuario. Si ya hay un
`npm run local` abierto, el segundo no puede usar la misma carpeta: ciérralo
antes. Lo mismo vale para el respaldo, la restauración y el cambio de
contraseña: la carpeta la usa un solo proceso.

`npm run local` no usa el `DATABASE_URL` del `.env`. La base embebida se queda
en esta máquina (`127.0.0.1`); lo que se abre a la red es la app. La decisión
está en [ADR-015](../architecture/adr/ADR-015-local-embedded-postgresql.md).

## Si olvidaste tu usuario o contraseña

No hace falta apartar `.datos/` ni empezar con una base nueva.

Cuando ya hay una cuenta, `npm run local` dice cuál:

```text
Ya hay una cuenta: usuario <el usuario>
```

Si hay varias, las lista. No imprime la contraseña ni su hash.

Para poner una contraseña nueva, con el servidor detenido:

```bash
npm run contrasena
```

Abre `.datos/pglite`, la misma carpeta que `npm run local`. Pide la contraseña
nueva sin mostrarla. Si hay varias cuentas, pregunta cuál. Al cambiarla:

- la contraseña anterior deja de servir;
- se cierran las sesiones abiertas de esa cuenta;
- se quita el bloqueo por intentos fallidos.

Se niega si `NODE_ENV=production`, en el proceso o en el `.env`, igual que
`npm run local`. No recupera la cuenta por correo ni por teléfono: es para
esta laptop. No crea una cuenta si no hay ninguna; para la primera sigue
siendo `npm run local`.

## Lo que hace falta para el camino con servidor

| Qué | Versión | Para qué |
| --- | --- | --- |
| Node.js | `^20.19.0` o `>=22.12.0` (el repo se armó con 24 LTS) | Todo |
| npm | El que viene con Node | Instalar y correr |
| PostgreSQL | 17, o Docker, solo en este camino | La base de servidor. `npm run local` no lo usa |
| Una terminal | PowerShell en Windows, la que sea en macOS o Linux | Comandos |

Docker es opcional y solo para este camino: si no lo tienes, apunta
`DATABASE_URL` a cualquier PostgreSQL alcanzable. Es el mismo motor, no dos
bases distintas. Para no instalar ninguno, usa `npm run local` (arriba).

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
  # Cryptography.RandomNumberGenerator, no Get-Random: el secreto firma las
  # cookies de sesión. `Create()`/`GetBytes()` funciona en Windows PowerShell
  # 5.1 y en pwsh 7; `Fill()` solo existe de .NET Core 3.0 en adelante.
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  $bytes = [byte[]]::new(32)
  $rng.GetBytes($bytes)
  $rng.Dispose()
  [Convert]::ToBase64String($bytes)
  ```

  La salida son 44 caracteres base64, que pasan el mínimo de 32 del proceso.

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
`http://127.0.0.1` los navegadores tratan al host como seguro y la aceptan. En
el celular, por `http://192.168.x.x`, una cookie `Secure` no se guarda: por eso
`npm run local` pone `MODO=local` y la cookie va sin `Secure`. En producción
(`NODE_ENV=production`) la cookie lleva `Secure` sin excepción, y las dos
variables juntas no arrancan.

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
`TEST_DATABASE_URL`, cada archivo de pruebas crea su propia base en ese servidor
(`rancho_test_` más un id), le aplica las migraciones y la borra al terminar. Por
eso la conexión tiene que poder `CREATE DATABASE`, y al final del `npm test` no
queda ninguna base `rancho_test_*`.

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
| `GET /api/health/ready` contesta 503 | El proceso vive pero no llega a PostgreSQL | Revisa `DATABASE_URL` y que la base esté arriba; si ya está bien, arranca el proceso de nuevo |
| `NODE_ENV=production` no puede combinarse con el modo local | Están las dos puestas, en `npm run local` o en `npm run contrasena` | Quita `NODE_ENV=production`. En producción la cookie lleva `Secure`, y estos comandos son de la base local |
| El celular no abre la dirección | El firewall bloqueó Node, o no es la misma WiFi | Permite Node en el firewall y usa la IP que imprimió la consola |
| `No pude abrir la base en .datos` | Ya hay un `npm run local` usando esa carpeta | Ciérralo y vuelve a correr. El respaldo y la restauración también la necesitan libre |
| `npm run respaldo y npm run restaurar no corren cuando NODE_ENV=production` | El proceso o el `.env` están en producción | Estos comandos son de la base local. No los uses contra producción |
| `No hay base local en .datos/` | Todavía no corriste `npm run local` | Arráncalo una vez antes de respaldar |
| `No se restauró nada` | No escribiste `RESTAURAR` | La base no cambió. Vuelve a correr el comando si sí querías reemplazarla |
| `El archivo no es un respaldo de RANCHO` | El archivo no es SQL de `pg_dump` | Usa un archivo de `respaldos/` |

Hay dos endpoints de salud: `GET /api/health` dice que el proceso responde;
`GET /api/health/ready` pregunta si además llega a PostgreSQL y contesta `503`
con `{"ok":false,"base":"no_responde"}` cuando no. Eso es lo que mira un
despliegue antes de mandarle tráfico. Ninguno imprime cadenas de conexión ni
secretos.

## Respaldo y restauración

La base de `npm run local` vive en `.datos/`. Eso no es un respaldo: es la
base en uso. El respaldo es un archivo SQL, el de `pg_dump`, en `respaldos/`
(git la ignora). Trae los esquemas `herd`, `growth`, `identity` y `drizzle`,
con sus datos, y la tabla `public.command_idempotency`. No borra el esquema
`public`.

Los dos comandos usan esa base embebida, no el `DATABASE_URL` del `.env`. Se
niegan cuando `NODE_ENV=production`, en el proceso o en el `.env`.

Cierra `npm run local` antes. Si está abierto, la carpeta no se puede leer.

```bash
npm run respaldo
```

Escribe `respaldos/rancho-AAAA-MM-DD-HHMMSS-mmm.sql`. La hora es la de
`America/Mexico_City`. El archivo sirve para volver a esta laptop y para
cargar la misma base en un PostgreSQL de servidor.

```bash
npm run restaurar -- respaldos/rancho-2026-11-23-223045-123.sql
```

Avisa que **reemplaza** lo que hay en `.datos/` y pide que escribas
`RESTAURAR`. Otra respuesta no cambia nada. Si ya había base, primero guarda
una copia en `respaldos/` y después carga el archivo. Antes de cargarlo borra
los esquemas `herd`, `growth`, `identity` y `drizzle` (aunque tengan tablas
que el archivo no trae) y la tabla `public.command_idempotency`, en la misma
transacción: si algo falla, la base queda como estaba. Así un respaldo
anterior entra en una base local que ya migró a tablas nuevas. La ruta del
archivo es relativa a la carpeta desde donde corriste npm (por ejemplo la
raíz del repo), no a `apps/api`. Hay que correrlo en una terminal: sin ella
no pregunta y no restaura.

Para pasar ese archivo a un PostgreSQL vacío, sin instalar `psql`, apunta
`DATABASE_URL` a esa base en la terminal (no lo dejes en `.env` si esa base
es la publicada) y corre:

```bash
npm run cargar-respaldo -- respaldos/rancho-2026-11-23-223045-123.sql
```

Pide que escribas `CARGAR`. Reemplaza los esquemas de la app en esa base, en
una transacción. Si la respuesta es otra, no cambia nada. Hay que correrlo en
una terminal. La base publicada usa este mismo comando; los pasos, de las
cuentas al celular, están en [publicar.md](publicar.md).

El motor embebido es PostgreSQL 18 y el SQL carga en el PostgreSQL 17 de este
repo. Si ya tienes `psql`, es el mismo archivo:

```bash
psql "postgres://usuario:clave@127.0.0.1:5432/rancho" -v ON_ERROR_STOP=1 --single-transaction -f respaldos/rancho-2026-11-23-223045-123.sql
```

`--single-transaction` hace que, si una sentencia falla, no quede a medias.
La base de destino puede estar vacía: el archivo crea los esquemas. Si ya
tenía los de la app, los reemplaza. El archivo no borra tablas de más que
una migración posterior haya agregado en el servidor: para eso, cárgalo en
una base vacía. En `.datos/` ese borrado lo hace `npm run restaurar`. No
hace falta correr las migraciones antes. El archivo trae el diario de
`drizzle`, así que el siguiente `db:migrate` contra esa base no vuelve a
crear lo que ya está. Lo mismo pasa al restaurar en `.datos/`: el siguiente
`npm run local` ve las migraciones ya aplicadas.

Después apunta `DATABASE_URL` a esa base y arranca con `npm start`, no con
`npm run local`. `npm run local` sigue usando `.datos/`.

## Datos

- No subas datos reales del rancho al repo: ni nombres de animales reales, ni
  aretes reales, ni fotos de cuadernos. Las pruebas usan datos sintéticos.
- `.env` nunca se sube. Está en `.gitignore`.
- `.datos/` tampoco se sube. Ahí está la base de `npm run local`.
- `respaldos/` tampoco se sube. Ahí están los archivos de `npm run respaldo`.
- La base de desarrollo y la de las pruebas son distintas. `db:reset` solo toca
  la de desarrollo, y solo en esta máquina. `npm run local` no usa esa base.
