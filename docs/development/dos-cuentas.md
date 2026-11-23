# Dos cuentas de GitHub en la misma laptop, al mismo tiempo

Guía para correr en paralelo, en Windows, el trabajo de Homie (`davidabreu-homie`) y lo personal (`daardavid`, este repo), cada uno con su propia fábrica.

## Por qué salía `daardavid` en los repos de Homie

GitHub atribuye cada commit por el **correo del autor**, no por la cuenta que hace el push. Tu `git config --global user.email` es tu correo personal, y ese correo está verificado en `daardavid`. Por eso los commits de `accounting_visualization` salen a nombre de `daardavid` aunque el push y los PR se hagan con `davidabreu-homie`.

La solución es que la identidad dependa de la carpeta donde está el repo, no de una configuración global.

| Qué | Lo decide | Cómo se separa |
| --- | --- | --- |
| Autor de los commits (lo que ves como contributor) | `user.name` y `user.email` de git | `includeIf` por carpeta |
| Credencial para `git push` | El administrador de credenciales de Git (GCM) | `credential.username` por carpeta |
| Cuenta de `gh` (PRs, comentarios, merge de la fábrica) | La carpeta de configuración de `gh` | `GH_CONFIG_DIR` por terminal |
| Suscripciones de IA (Cursor, Codex, Claude, Gemini) | Tu sesión en cada CLI | Son las mismas para las dos fábricas: **comparten cuota** |

## 1. Una carpeta raíz por cuenta

```powershell
mkdir C:\dev\homie, C:\dev\personal
```

Mueve (o vuelve a clonar) los repos:

- `C:\dev\homie\`: `automation`, `accounting_visualization`, `sat_manager`, `revisor_cfdi` y cualquier repo de `davidabreu-homie`.
- `C:\dev\personal\`: `rancho` y cualquier repo de `daardavid`.

Los archivos de carga que hoy están en `C:\finanzas_datos` no cambian de lugar.

## 2. Identidad de git por carpeta

**Atajo válido: configuración local en cada repo.** Si prefieres no mover carpetas, configura cada repo por separado (la configuración local manda sobre la global y sobre `includeIf`):

```powershell
# En cada repo de Homie (por ejemplo C:\Code\accounting_visualization)
git config user.name "David Abreu"
git config user.email david.abreu@homie.mx
git config credential.https://github.com.username davidabreu-homie

# En rancho
git config user.name "David Armando Abreu Rosique"
git config user.email 93949861+daardavid@users.noreply.github.com
git config credential.https://github.com.username daardavid
```

Para que GitHub atribuya los commits a `davidabreu-homie`, `david.abreu@homie.mx` debe estar agregado y verificado en esa cuenta (Settings → Emails). Si está verificado en `daardavid`, vuelven a salir a su nombre. La desventaja del atajo es que cada repo nuevo o clon nuevo arranca con la identidad global hasta que lo configures; `includeIf` lo resuelve por carpeta:

Agrega esto al final de `%USERPROFILE%\.gitconfig` (ábrelo con `notepad $HOME\.gitconfig`):

```ini
[includeIf "gitdir/i:C:/dev/homie/"]
    path = ~/.gitconfig-homie
[includeIf "gitdir/i:C:/dev/personal/"]
    path = ~/.gitconfig-personal
```

Crea `%USERPROFILE%\.gitconfig-homie`:

```ini
[user]
    name = David Armando Abreu Rosique
    email = ID+davidabreu-homie@users.noreply.github.com
[credential "https://github.com"]
    helper =
    helper = manager
    username = davidabreu-homie
```

El correo exacto lo copias de GitHub, entrando con `davidabreu-homie`: **Settings → Emails → "Keep my email addresses private"**. Ahí aparece la dirección `…@users.noreply.github.com`. También puedes usar tu correo de Homie si lo verificas en esa cuenta.

Crea `%USERPROFILE%\.gitconfig-personal`:

```ini
[user]
    name = David Armando Abreu Rosique
    email = 93949861+daardavid@users.noreply.github.com
[credential "https://github.com"]
    helper =
    helper = manager
    username = daardavid
```

`helper =` vacío borra cualquier otro helper global (por ejemplo, el de `gh auth setup-git`). Así el push siempre usa el administrador de credenciales de Windows, y este elige la cuenta por `username`. La primera vez que hagas push en cada carpeta se abre el navegador para iniciar sesión con esa cuenta. Después ya no lo vuelve a pedir.

Si en algún repo dejaste un `user.email` local, bórralo para que mande la carpeta: `git config --unset user.email`.

## 3. `gh` con una sesión por terminal

```powershell
$env:GH_CONFIG_DIR = "$HOME\.gh-homie";    gh auth login   # inicia sesión como davidabreu-homie
$env:GH_CONFIG_DIR = "$HOME\.gh-personal"; gh auth login   # inicia sesión como daardavid
```

Agrega dos atajos a tu perfil de PowerShell (`notepad $PROFILE`; si no existe, créalo):

```powershell
function homie {
    $env:GH_CONFIG_DIR = "$HOME\.gh-homie"
    $Host.UI.RawUI.WindowTitle = "HOMIE - davidabreu-homie"
    Set-Location C:\dev\homie
}
function personal {
    $env:GH_CONFIG_DIR = "$HOME\.gh-personal"
    $Host.UI.RawUI.WindowTitle = "PERSONAL - daardavid"
    Set-Location C:\dev\personal
}
```

Desde ahora:

- Terminal 1: `homie`, luego `cd accounting_visualization` y `python fabrica/correr.py --hito`.
- Terminal 2: `personal`, luego `cd rancho` y `python fabrica/correr.py --hito`.

Cursor, Codex, Claude y Antigravity se lanzan desde la fábrica de cada terminal, así que heredan su `GH_CONFIG_DIR`. Los commits que hace Cursor toman el autor de la carpeta.

No uses `gh auth switch`. Cambia la cuenta de toda la carpeta de configuración y, con dos fábricas corriendo, una le movería la cuenta a la otra.

## 4. Comprobar antes de correr

En cada repo:

```powershell
git config user.email          # homie: …davidabreu-homie… / personal: …daardavid…
git config credential.https://github.com.username
gh api user --jq .login        # davidabreu-homie / daardavid
python fabrica/correr.py --verificar
```

La fábrica de este repo revisa la cuenta de `gh` y el correo de git contra lo que dice `fabrica/config.toml` (`[repo] cuenta_gh` y `correo_contiene`). Si no coinciden, no arranca. Conviene llevar esa misma revisión del correo a la fábrica de `accounting_visualization`.

## 5. Cuota compartida entre las dos fábricas

Las dos fábricas gastan de las mismas suscripciones. Para que no se acaben a la vez:

- La fábrica de este repo usa solo a Gemini (Antigravity, `agy`) como orquestador y revisor; ChatGPT (Codex) queda para la de Homie. Se cambia en `fabrica/config.toml` (`[revisor]` y `[chatgpt] activo`).
- Cursor usa DeepSeek v4.1 Flash en las tareas normales de Rancho, así casi no compite con el Grok de la fábrica de Homie.
- Cursor y Claude sí se comparten. Si una fábrica se topa con el límite, se detiene sola con el motivo en la bitácora. Vuelves a correrla cuando se renueve la cuota.
- Si quieres darle prioridad a Homie, corre la fábrica de Rancho de noche.

## 6. Los commits pasados de `accounting_visualization`

Hasta hoy, los commits están a nombre de `daardavid`. Corregirlos implica reescribir el historial y hacer *force push* en `main` y en todas las ramas. Eso rompe los PR abiertos y las copias de tus dos laptops. La recomendación es dejarlos así y corregir de aquí en adelante. Si de todos modos lo quieres limpio, hazlo en un momento sin fábricas corriendo y vuelve a clonar en ambas laptops.
