# Publicar, cuando tú lo decidas

Deja la app en internet para que en el rancho la abran desde el celular, sin
tu laptop. Nada de esto se publica solo. Tú creas las cuentas y tú dices
cuándo.

Lo local no cambia: `npm run local`, el respaldo y la restauración siguen
igual. El celular en la casa, por el Wi-Fi, sigue siendo ese camino
([correr-local.md](correr-local.md)).

Son dos cuentas gratis:

- [Neon](https://neon.tech) guarda la base.
- [Render](https://render.com) corre la app y le pone HTTPS.

Por qué esta pareja, y qué pasa si se acaba el plan gratis, está en
[ADR-016](../architecture/adr/ADR-016-publicacion.md). Ahí también está lo
que quedó «por confirmar».

No pegues contraseñas ni cadenas de conexión en el repo, en un chat ni en
el `.env` de todos los días.

## 1. La base en Neon

1. Crea la cuenta en Neon.
2. Crea un proyecto en **AWS US East (Ohio)**, la región `aws-us-east-2`.
   La región no se cambia después. No elijas la base gratis de Render: esa
   caduca a los 30 días.
3. Copia la cadena **directa**. El host no lleva `-pooler`. La cadena ya
   trae `sslmode`. Guárdala en un lugar tuyo, fuera del repo.

Cuando ya haya datos de verdad, en el panel de Neon toma el snapshot
manual. En el plan gratis hay uno. No es la copia de siete días: es la que
este plan da.

## 2. Pasar lo de la laptop

Cierra `npm run local` si está abierto. En la raíz del repo:

```bash
npm run respaldo
```

Escribe `respaldos/rancho-….sql`. Esa carpeta no se sube a git.

Abre PowerShell en la raíz. La cadena vale solo en esa ventana.

Si vas a llevar los animales de la laptop, carga el archivo y después migra.
`cargar-respaldo` reemplaza el diario `drizzle.__drizzle_migrations` con el
del archivo. `db:migrate` a continuación aplica las migraciones que ese
diario todavía no tiene.

```powershell
$env:DATABASE_URL = "pega-aqui-la-cadena-de-neon"
npm run cargar-respaldo -- respaldos\rancho-AAAA-MM-DD-HHMMSS-mmm.sql
npm run db:migrate -w @rancho/api
```

`cargar-respaldo` pide que escribas `CARGAR` y reemplaza los esquemas
`herd`, `growth`, `identity`, `evidence` y `drizzle` con el archivo. Otra
respuesta no cambia nada. Hay que correrlo en una terminal. `db:migrate` no
lo hace el proceso que después atiende el celular.

Si Neon va a empezar vacío, sin los animales de la laptop, no corras
`cargar-respaldo`. Corre solo la migración; el rancho y la cuenta van en la
sección 3:

```powershell
$env:DATABASE_URL = "pega-aqui-la-cadena-de-neon"
npm run db:migrate -w @rancho/api
```

Las fotos no van en el archivo. En el celular no se van a abrir. El disco
del servicio gratis se borra cuando la app se duerme.

`npm run respaldo` lee la laptop (`.datos/`), no Neon. Lo que después se
anote en el celular no vuelve solo a la laptop.

## 3. La cuenta del dueño

`npm run local` crea la primera cuenta con rol `support`. Un respaldo de
esa laptop trae esa cuenta. El familiar entra con rol `owner`
([ADR-010](../architecture/adr/ADR-010-authentication.md)). Con la misma
ventana y la misma `DATABASE_URL`, crea esa cuenta, salvo que en el
respaldo ya exista una cuenta `owner` (porque ya la habías creado con
`cuenta:crear` en la laptop):

```bash
npm run cuenta:crear -w @rancho/api -- --rol owner --usuario propietario
```

Pide la contraseña y no la muestra. El rol `owner` es el del rancho. El
rol `support` es el de quien mantiene la app. Si el respaldo ya trae la
cuenta `owner`, entra con ese usuario y esa contraseña.

Si la base está vacía, la cuenta no inventa el rancho. Después de
`db:migrate` y antes de `cuenta:crear`, en la misma ventana:

```powershell
$env:RANCH_NAME = "Nombre del rancho"
npm run db:seed -w @rancho/api
npm run cuenta:crear -w @rancho/api -- --rol owner --usuario propietario
```

`db:seed` usa `RANCH_NAME`. Si falta, se niega. Si el rancho ya existe, no
crea otro.

Al terminar, quita la cadena y el nombre de la ventana para no tocar Neon
sin querer. `RANCH_NAME` solo está si sembraste el rancho vacío:

```powershell
Remove-Item Env:DATABASE_URL
if (Test-Path Env:RANCH_NAME) { Remove-Item Env:RANCH_NAME }
```

## 4. La app en Render

Render lee el repo en GitHub. Elige la rama que ya tenga este código (cuando
la hayas integrado, `main`).

1. Crea la cuenta en Render y conecta GitHub.
2. **New → Blueprint** y elige este repositorio. Render lee `render.yaml`.
   No trae secretos.
3. Región **Ohio**, plan **Free**.
4. Cuando pida `DATABASE_URL`, pega la cadena directa de Neon.
5. Cuando pida `SESSION_SECRET`, genera uno y pégalo solo en el panel:

   ```bash
   openssl rand -base64 32
   ```

   En PowerShell, sin OpenSSL:

   ```powershell
   $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
   $bytes = [byte[]]::new(32)
   $rng.GetBytes($bytes)
   $rng.Dispose()
   [Convert]::ToBase64String($bytes)
   ```

   No reutilices el secreto de la laptop. No lo escribas en el repo.

6. Espera a que el deploy termine. El arranque no migra. Si más adelante el
   código trae tablas nuevas, otra vez desde la laptop, con `DATABASE_URL`
   de Neon:

   ```bash
   npm run db:migrate -w @rancho/api
   ```

   y después deja que Render publique esa versión.

7. Abre `https://….onrender.com`. La primera vez después de un rato en
   silencio tarda como un minuto: el plan gratis se duerme a los 15 minutos
   sin visitas, y Render muestra una página de espera. Luego abre Neon, que
   también se duerme.

8. Entra a `https://….onrender.com/api/health/ready`. Tiene que decir
   `"ok": true` y `"base": "responde"`. Si dice `no_responde`, la base no
   contestó.

En el celular, abre esa misma dirección `https`. La cookie de sesión solo
viaja por HTTPS. Puedes dejar el acceso en la pantalla de inicio.

## 5. Volver a lo local

En la laptop:

```bash
npm run local
```

Usa `.datos/`. No lee Neon y no baja lo que se capturó en el celular. El
celular en el rancho no llega a la laptop. La dirección de Render sigue
sirviendo lo que está en Neon.

Son dos copias. Para guardar lo de Neon, usa el snapshot del panel. Para
dejar de publicar, suspende el servicio en Render. No borres el proyecto de
Neon si todavía quieres los datos.

`NODE_ENV=production` no va con `npm run local`. Si el `.env` lo tiene, el
modo local se niega a arrancar.

## Si no arranca

| Qué ves | Qué hacer |
| --- | --- |
| `Falta DATABASE_URL` o `Falta SESSION_SECRET` | Faltan en el panel de Render. El proceso no inventa un secreto y no arranca. |
| La página tarda un minuto | El servicio estaba dormido. Espera. |
| `base` dice `no_responde` | Revisa la cadena de Neon. Si Neon avisa que se acabaron las horas del mes, hay que esperar al siguiente periodo o cambiar de plan. Los datos no se borran por eso. |
| Pide `CARGAR` y no estás seguro del host | El comando imprime el host y el nombre de la base, sin la contraseña. Si no es Neon, no confirmes. |
