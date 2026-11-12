# CI/CD para Tiendas D2 Simulator

Guía paso a paso para que cada cambio (del juego o de la configuración) se pruebe solo y llegue al servidor sin repetir a mano los mismos comandos. Es una guía para que la hagas tú.

Está pensada para tu montaje real: el servidor está **detrás de la red de la universidad y Tailscale**, se publica con **Cloudflare Tunnel** y solo acepta SSH. Eso decide casi todo lo que sigue.

## 0. Conceptos

| Término | Qué es | En tu proyecto |
|---|---|---|
| **CI** (integración continua) | Cada `push` o pull request dispara pruebas automáticas en una máquina limpia | `php tests/run.php`, `node tests/js/run.mjs` y construir la imagen |
| **CD** (entrega/despliegue continuo) | Si las pruebas pasan, el cambio llega solo al servidor | `git pull` + rebuild + `up -d` en el servidor |
| **Workflow** | Archivo YAML en `.github/workflows/` que describe qué hacer y cuándo | `ci.yml`, `deploy.yml` |
| **Runner** | La máquina que ejecuta el workflow | Los de GitHub (nube) para CI; uno tuyo en el servidor para CD |
| **Secret** | Valor privado guardado en GitHub (Settings → Secrets) | Nunca va al repositorio |

Dos hechos del servidor que condicionan el CD:

1. **GitHub no puede entrar a tu servidor.** No hay puertos abiertos y está detrás de NAT. Por eso el CD no puede ser «GitHub se conecta por SSH». Tiene que ser «el servidor sale a buscar» (runner autoalojado) o «tú lanzas un script».
2. **Los secretos (`deploy/.env`) viven solo en el servidor.** Ninguna de las opciones los toca.

## 1. Plan en tres niveles

Haz uno, comprueba que funciona y pasa al siguiente. Cada nivel es útil por sí solo.

| Nivel | Qué automatiza | Esfuerzo | Riesgo |
|---|---|---|---|
| 1. CI | Pruebas y build en cada push | Bajo | Ninguno |
| 2. Script de despliegue | Un comando en el servidor hace todo y verifica | Bajo | Bajo |
| 3. CD automático | Un push a `main` con CI en verde despliega solo | Medio | Medio |

**Antes del nivel 3, haz las copias de seguridad** (sección 8 de `SERVIDOR.md` y punto 4 de `SEGURIDAD.md`). Un despliegue automático que falla a medias es mucho menos grave si tienes un respaldo.

## 2. Flujo de trabajo con ramas

CI/CD se apoya en no tocar `main` directamente.

```bash
git switch -c cambio-precios      # una rama por cambio
# ... editas y pruebas en local ...
git push -u origin cambio-precios
# abres un Pull Request en GitHub: el CI corre ahí
# si está en verde, lo fusionas a main
```

Cuando el despliegue sea automático, **`main` = lo que está en producción**. Por eso conviene proteger la rama (paso 3.5).

## 3. Nivel 1: CI con GitHub Actions

### 3.1 Qué debe comprobar

1. Sintaxis de todos los PHP.
2. Pruebas de PHP (`tests/run.php`), que necesitan una base MariaDB.
3. Pruebas de JavaScript (`tests/js/run.mjs`), que necesitan Node y PHP.
4. Que la imagen se construye (detecta un `Containerfile` roto o un `.containerignore` que excluye algo necesario: ya te pasó dos veces).

### 3.2 El workflow

Crea `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

jobs:
  pruebas:
    runs-on: ubuntu-24.04

    services:
      db:
        image: mariadb:10.11            # la misma versión que en producción
        env:
          MARIADB_ROOT_PASSWORD: ci-root
        ports: ["3306:3306"]
        options: >-
          --health-cmd="healthcheck.sh --connect --innodb_initialized"
          --health-interval=5s --health-timeout=5s --health-retries=20

    env:
      DB_HOST: 127.0.0.1
      DB_PORT: "3306"
      DB_USER: root
      DB_PASS: ci-root
      DB_NAME: supermarket_simulator
      DB_NAME_TEST: supermarket_simulator_test

    steps:
      - uses: actions/checkout@v4

      - uses: shivammathur/setup-php@v2
        with:
          php-version: "8.3"
          extensions: pdo_mysql, mbstring

      - uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Sintaxis PHP
        run: |
          find src public tests -name '*.php' -print0 | xargs -0 -n1 php -l > /dev/null

      - name: Pruebas de JavaScript
        run: node tests/js/run.mjs

      - name: Pruebas de PHP
        run: php tests/run.php

  imagen:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v4
      - name: Construir la imagen (desde la raíz del repo)
        run: docker build -f deploy/Containerfile -t d2-web:ci .
```

Notas:

- **`DB_USER: root` en CI** porque la base de pruebas se recrea en cada ejecución y necesita permiso para crear y borrar. En producción el usuario solo tiene `SELECT, INSERT, UPDATE`; en CI no importa, la base es desechable.
- Las pruebas leen la conexión de variables de entorno (`Env::get`). Si tu `Env` prioriza el `.env` sobre las variables, el CI no tiene `.env` (está en `.gitignore`), así que usará las variables. Compruébalo en el primer intento.
- `docker build` en el runner de GitHub usa el mismo `Containerfile` que Podman. Es válido.
- Si `tests/run.php` termina con «omitidas», **falla a propósito** (sin `--allow-skip`). Eso es lo que quieres en CI: un verde significa que todo se ejecutó.
- Actualiza las versiones (`@v4`, `@v2`) a las vigentes cuando lo hagas.

### 3.3 Subirlo y ver el resultado

```bash
git add .github/workflows/ci.yml
git commit -m "CI: sintaxis, pruebas de PHP y JS, build de la imagen"
git push
```

En GitHub: pestaña **Actions**. Verás cada paso en verde o rojo, con su log. Si algo falla, el log dice qué.

### 3.4 Insignia en el README (opcional)

```markdown
![CI](https://github.com/AdrianCCRS/<nombre-del-repo>/actions/workflows/ci.yml/badge.svg)
```

### 3.5 Proteger `main` (recomendado)

GitHub → Settings → Branches → Add rule para `main`:

- «Require a pull request before merging»
- «Require status checks to pass» y marca `pruebas` e `imagen`

Así no se puede fusionar código con pruebas en rojo.

## 4. Nivel 2: script de despliegue en el servidor

Es el CD «manual con un comando». Sirve de base para el nivel 3.

### 4.1 El script

En el servidor, dentro del repo, crea `deploy/desplegar.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."          # raíz del repo

echo "==> Actualizando código"
git fetch origin
git checkout main
git pull --ff-only origin main

echo "==> Construyendo imagen"
podman build -f deploy/Containerfile -t localhost/d2-web:latest .

echo "==> Reiniciando servicio web"
cd deploy
podman-compose up -d web

echo "==> Comprobando que responde"
PORT="$(grep -E '^WEB_PORT=' .env | cut -d= -f2)"
for i in $(seq 1 15); do
  CODE="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${PORT:-8090}/api/categorias.php" || true)"
  # 200 = Apache, PHP y la base responden (el catálogo se lee de la BD)
  if [ "$CODE" = "200" ]; then
    echo "OK (HTTP $CODE)"
    exit 0
  fi
  sleep 2
done
echo "ERROR: el servicio no responde tras el despliegue" >&2
podman logs --tail 30 d2-web >&2
exit 1
```

La comprobación pide `api/categorias.php`, que lee la base: un 200 confirma que Apache, PHP y MariaDB responden. Si tu endpoint exige la cabecera `X-Jugador` y devuelve 400, cambia la condición o añade `-H "X-Jugador: 11111111-1111-4111-8111-111111111111"`.

```bash
chmod +x deploy/desplegar.sh
```

Se lanza con:

```bash
cd ~/supermarkeyt-simulator && ./deploy/desplegar.sh
```

O desde tu PC, sin entrar al servidor:

```bash
ssh adrian-server '~/supermarkeyt-simulator/deploy/desplegar.sh'
```

### 4.2 Qué NO hace (a propósito)

- **No toca la base de datos.** Los scripts de `initdb` solo corren con el volumen vacío. Un cambio de esquema es otro proceso (sección 7).
- **No toca `deploy/.env`.** Los secretos y `WEB_PORT` se editan a mano en el servidor.
- **No reinicia `db`.** Solo `web`; así no hay corte de la base.

### 4.3 Volver atrás (rollback)

Si un despliegue sale mal:

```bash
cd ~/supermarkeyt-simulator
git log --oneline -5                      # elige el commit bueno
git checkout <hash-bueno>
podman build -f deploy/Containerfile -t localhost/d2-web:latest .
cd deploy && podman-compose up -d web
```

Más limpio: etiquetar la imagen con el hash del commit (`-t localhost/d2-web:$(git rev-parse --short HEAD)`) y conservar las dos últimas. Así el rollback es solo cambiar la etiqueta.

## 5. Nivel 3: CD automático con un runner autoalojado

Un runner autoalojado es un programa en **tu servidor** que pregunta a GitHub «¿hay trabajo para mí?». La conexión es **saliente**, igual que `cloudflared`, así que funciona detrás de la universidad sin abrir puertos.

### 5.1 Seguridad: léelo antes de instalarlo

Un runner ejecuta el código de tus workflows en tu servidor. Si alguien consigue que corra un workflow malicioso, tiene ejecución de código en tu servidor. Reglas:

- **Repositorio privado, o públicos sin runners autoalojados en pull requests.** En repos públicos, un PR de un desconocido podría ejecutar código en tu servidor. Configura Settings → Actions → «Fork pull request workflows»: exigir aprobación, y el workflow de despliegue solo con `on: push` a `main` o `workflow_dispatch`.
- El job de despliegue se ejecuta **solo en `main`**, nunca en pull requests.
- Instálalo con un **usuario sin sudo**, el mismo que ejecuta Podman rootless, y no como root.
- Etiqueta el runner (`d2-prod`) y usa `runs-on: [self-hosted, d2-prod]` solo en el job de despliegue.

### 5.2 Instalar el runner

En GitHub: repo → Settings → Actions → Runners → **New self-hosted runner** → Linux. Te muestra los comandos exactos (con un token de un solo uso). En el servidor, con el usuario que usa Podman:

```bash
mkdir -p ~/actions-runner && cd ~/actions-runner
# 1) descarga y descomprime el paquete (comandos de la página de GitHub)
# 2) registra el runner:
./config.sh --url https://github.com/AdrianCCRS/<repo> --token <TOKEN> --labels d2-prod
# 3) instálalo como servicio:
sudo ./svc.sh install <tu-usuario>
sudo ./svc.sh start
```

En Settings → Actions → Runners debe aparecer **Idle** (verde). Si no, revisa `sudo ./svc.sh status`.

> El servicio del runner usa systemd del sistema pero ejecuta los jobs como tu usuario. Si Podman rootless no encuentra el entorno, asegúrate de `loginctl enable-linger <usuario>` (ya lo tienes del paso de persistencia).

### 5.3 El workflow de despliegue

Crea `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  workflow_run:
    workflows: ["CI"]
    branches: [main]
    types: [completed]
  workflow_dispatch:            # botón manual en la pestaña Actions

jobs:
  desplegar:
    # solo si el CI terminó en verde (o si se lanzó a mano)
    if: ${{ github.event_name == 'workflow_dispatch' || github.event.workflow_run.conclusion == 'success' }}
    runs-on: [self-hosted, d2-prod]
    concurrency: produccion      # nunca dos despliegues a la vez
    steps:
      - name: Desplegar
        run: ~/supermarkeyt-simulator/deploy/desplegar.sh
```

Lo que hace: cuando el CI de `main` termina en verde, el runner del servidor ejecuta el script del nivel 2. El código sale de `git pull` en el propio servidor; GitHub solo da la orden.

### 5.4 Probar

1. Lanza el workflow a mano: Actions → Deploy → **Run workflow**.
2. Haz un cambio pequeño (por ejemplo, un texto), fusiónalo a `main` y mira cómo CI y Deploy se encadenan.
3. Abre https://adrianccrs.me y comprueba el cambio.

### 5.5 Alternativa sin runner: imagen en un registro

En vez de construir en el servidor:

1. GitHub Actions construye la imagen y la publica en `ghcr.io`.
2. El servidor la descarga (`podman pull`) con un temporizador de systemd o con Watchtower.

Es más «correcto» (se despliega exactamente lo que se probó), pero añade un registro, credenciales y más piezas. Para un proyecto de este tamaño, el runner autoalojado es más simple.

## 6. Qué tipo de cambio sigue qué camino

| Cambias... | Qué pasa | Acción extra |
|---|---|---|
| JS, CSS, HTML, imágenes del juego | CI → build → deploy. La imagen incluye `public/` | Ninguna. Recarga con Ctrl+F5 si el navegador cachea |
| PHP (`src/`, `public/api/`) | Igual que arriba | Ninguna |
| `Containerfile`, `apache.conf`, `php.ini` | Igual; el build los aplica | Revisa que el CI de build esté en verde |
| `deploy/compose.yaml` | El script hace `up -d web`, que aplica cambios del servicio web | Para cambios en `db`, a mano y con respaldo previo |
| `deploy/.env` (puerto, tokens) | **No** está en git | Editar en el servidor y `podman-compose up -d` |
| Catálogo o precios (`productos_juego.sql`, `precios_cop.sql`) | Solo afecta a una base nueva | Para una base existente, un `UPDATE` o migración manual |
| Esquema (`init.sql`) | No se aplica a una base existente | Script de migración y `./deploy/migrar.sh` antes de desplegar, ver sección 7 |
| Cloudflare (WAF, rate limit) | Fuera de git; se cambia en el panel | Anótalo en `SERVIDOR.md` |

## 7. Cambios en la base de datos

Es la parte que no se automatiza a ciegas.

1. Escribe un script **idempotente** (que se pueda repetir), como `database/migracion_multijugador.sql`.
2. Pruébalo en CI. Ya está hecho: `tests/schema_paridad.sh` carga el `init.sql` de la versión anterior (base del PR, o el commit previo en un push), aplica todas las migraciones **dos veces** y compara tablas, columnas, índices y restricciones con el `init.sql` actual. Si añades una migración, actualiza también `init.sql`; el CI falla si no dan lo mismo.
3. En el servidor: **primero respaldo**, después la migración. `./deploy/migrar.sh` lo hace todo: respaldo (y comprueba que terminó bien), y aplica `database/migracion_*.sql` en orden. A mano sería:

```bash
podman exec d2-db mariadb-dump -u root -p"$DB_ROOT_PASS" supermarket_simulator > ~/respaldo-$(date +%F).sql
podman exec -i d2-db mariadb -u root -p"$DB_ROOT_PASS" supermarket_simulator < database/migracion_x.sql
```

4. Solo después, despliega el código que usa el esquema nuevo con `./deploy/desplegar.sh`. El script comprueba antes que la base tenga las tablas que el código necesita; si faltan, aborta sin tocar el servicio en marcha. (Cuando una migración nueva sea imprescindible, añade su comprobación a ese bloque.)

**Versión de los scripts del juego:** `index.html` carga sus JS con `?v=VERSION`. `desplegar.sh` pasa el commit actual como `--build-arg VERSION=...` y el `Containerfile` lo escribe en la imagen, así el navegador no usa JS viejo tras desplegar. No hay que editar nada a mano.

Orden seguro: **migración compatible hacia atrás → desplegar código → (más adelante) limpiar lo viejo.** Así, si el código falla, el esquema sigue valiendo para la versión anterior.

## 8. Qué NO poner nunca en CI/CD

- `deploy/.env`, `ADMIN_TOKEN`, contraseñas de la base: no van al repositorio ni a logs. Si los necesitas en un workflow, usa **Secrets**.
- El token del túnel de Cloudflare.
- `set -x` o `echo` de variables sensibles en los scripts.
- Despliegues desde pull requests de gente que no eres tú.

## 9. Resolución de problemas

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| CI: la base no conecta | El servicio `db` aún no estaba sano | Revisa el `health-cmd` y `DB_HOST: 127.0.0.1` |
| CI: «pruebas omitidas» y falla | Falta `pdo_mysql` o `mbstring`, o la base no responde | Revisa `extensions:` en `setup-php` |
| CI: `docker build` no encuentra `deploy/apache.conf` | Contexto distinto de la raíz, o `.containerignore` demasiado agresivo | Construir con `.` desde la raíz; revisa exclusiones |
| Runner en «Offline» | Servicio parado o sin salida a internet | `sudo ./svc.sh status`, `journalctl -u actions.runner.*` |
| Deploy: `podman: command not found` | El PATH del servicio del runner no incluye Podman | Pon la ruta completa o define `PATH` en el workflow |
| Deploy: permisos de Podman | El runner corre con otro usuario | Instalarlo con el usuario dueño de los contenedores |
| El script termina «ERROR: no responde» | El contenedor no arrancó | `podman logs d2-web`, y haz rollback (4.3) |
| Desplegué y el sitio sigue con el código viejo (p. ej. `ranking.php` da 404) | Se construyó la imagen nueva, pero `podman-compose` arrancó el contenedor `d2-web` **antiguo** («the container name is already in use… podman start d2-web») | `desplegar.sh` ya recrea la web y comprueba que corre la imagen nueva. En un servidor con el script viejo: `podman rm -f d2-web && cd deploy && podman-compose up -d web` |
| Tras reiniciar el servidor, no hay juego (`Exited (0)`) | Podman sin root: `restart: always` no basta sin _linger_ | `sudo loginctl enable-linger $USER` y `systemctl --user enable --now podman-restart.service` |
| Cambié CSS y no se ve | Caché del navegador o de Cloudflare | Ctrl+F5; en Cloudflare, Caching → Purge |

## 10. Autoevaluación

1. ¿Por qué GitHub no puede desplegar por SSH en tu servidor, y cómo lo resuelve un runner autoalojado?
2. ¿Qué diferencia hay entre CI y CD? ¿Cuál de las dos es segura de automatizar desde el primer día?
3. ¿Por qué el CI usa el usuario `root` de la base y producción solo `SELECT, INSERT, UPDATE`?
4. ¿Por qué el script de despliegue no reinicia la base ni toca `deploy/.env`?
5. Quieres añadir una columna a una tabla. ¿En qué orden haces respaldo, migración y despliegue, y por qué?
6. ¿Por qué un runner autoalojado en un repositorio público es un riesgo, y qué lo mitiga?

## 11. Orden recomendado

1. Respaldos con `cron` (pendiente en `SEGURIDAD.md`).
2. Nivel 1: `ci.yml` y proteger `main`.
3. Nivel 2: `desplegar.sh`, probado a mano.
4. Nivel 3: runner y `deploy.yml`.
