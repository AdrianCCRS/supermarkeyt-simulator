#!/usr/bin/env bash
# Despliegue en el servidor: actualiza el código, reconstruye la imagen web y la reinicia.
# No toca la base de datos ni deploy/.env: si el código nuevo necesita una migración, se aplica ANTES con
# ./deploy/migrar.sh (hace respaldo y la aplica) y este script lo comprueba antes de cambiar nada.
# Uso: ./deploy/desplegar.sh (desde cualquier carpeta)
set -euo pipefail

cd "$(dirname "$0")/.."          # raíz del repo

echo "==> Actualizando código"
git fetch origin
git checkout main
git pull --ff-only origin main

echo "==> Comprobando que la base tiene el esquema que necesita este código"
# Una comprobación por cada migración que el código necesite. Si falta, se aborta SIN tocar el servicio en marcha:
# con el código nuevo y sin migrar, el cierre de jornada fallaría.
DB_ROOT_PASS="$(grep -E '^DB_ROOT_PASS=' deploy/.env | cut -d= -f2-)"
DB_NAME="$(grep -E '^DB_NAME=' deploy/.env | cut -d= -f2-)"
FALTA="$(podman exec -e MYSQL_PWD="$DB_ROOT_PASS" "${CONTENEDOR_DB:-d2-db}" mariadb -u root -N -B -e \
  "SELECT 3 - COUNT(*) FROM information_schema.columns WHERE table_schema = '${DB_NAME:-supermarket_simulator}'
     AND ((table_name = 'jornadas' AND column_name = 'puntos')
       OR (table_name = 'jugadores' AND column_name = 'apodo')
       OR (table_name = 'limite_peticiones' AND column_name = 'ventana'))" 2>/dev/null || echo "?")"
if [ "$FALTA" != "0" ]; then
  echo "ERROR: la base no tiene las tablas del ranking (o no se pudo consultar: '$FALTA')." >&2
  echo "       Ejecuta ./deploy/migrar.sh y vuelve a lanzar este script. No se ha tocado el servicio en marcha." >&2
  exit 1
fi

echo "==> Construyendo imagen"
podman build -f deploy/Containerfile --build-arg VERSION="$(git rev-parse --short HEAD)" -t localhost/d2-web:latest .

echo "==> Reiniciando servicio web"
cd deploy
# La web no guarda datos (viven en la base), así que se recrea siempre. Es necesario: si el contenedor d2-web ya existe,
# esta versión de podman-compose falla al crearlo y arranca el VIEJO, con la imagen antigua, aunque la nueva esté
# construida. El despliegue parecía bien y seguía sirviendo el código anterior.
podman rm -f d2-web >/dev/null 2>&1 || true
# podman-compose imprime el comando completo, con contraseñas y token: se tapan para poder pegar la salida sin filtrarlos
podman-compose up -d web 2>&1 | sed -E 's/((PASS|PASSWORD|TOKEN)=)[^ ]+/\1***/g'

echo "==> Comprobando que corre la imagen nueva"
if [ "$(podman image inspect -f '{{.Id}}' localhost/d2-web:latest)" != "$(podman inspect -f '{{.Image}}' d2-web)" ]; then
  echo "ERROR: d2-web no usa la imagen recién construida (sigue sirviendo el código anterior)." >&2
  exit 1
fi

echo "==> Comprobando que responde"
PORT="$(grep -E '^WEB_PORT=' .env | cut -d= -f2)"
for _ in $(seq 1 15); do
  CODE="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${PORT:-8090}/api/categorias.php" || true)"
  RANKING="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${PORT:-8090}/api/ranking.php" || true)"
  if [ "$CODE" = "200" ] && [ "$RANKING" = "200" ]; then
    echo "OK (HTTP $CODE)"
    exit 0
  fi
  sleep 2
done
echo "ERROR: el servicio no responde tras el despliegue" >&2
podman logs --tail 30 d2-web >&2
exit 1
