#!/usr/bin/env bash
# Aplica a la base del servidor las migraciones de database/migracion_*.sql, con respaldo previo.
# Todas son idempotentes (se pueden repetir sin problema), así que este script también se puede repetir.
# Orden seguro de un cambio con esquema nuevo:  ./deploy/migrar.sh  →  ./deploy/desplegar.sh
# La migración es compatible con el código anterior, así que mientras tanto el juego sigue funcionando.
#
# Uso: ./deploy/migrar.sh            (desde cualquier carpeta; usa deploy/.env y el contenedor d2-db)
# Los respaldos van a ~/respaldos-d2/ (cambia el sitio con RESPALDOS=/ruta), con permisos solo para ti.
set -euo pipefail

cd "$(dirname "$0")/.."          # raíz del repo
ENV=deploy/.env
[ -f "$ENV" ] || { echo "ERROR: falta $ENV" >&2; exit 1; }

DB_ROOT_PASS="$(grep -E '^DB_ROOT_PASS=' "$ENV" | cut -d= -f2-)"
DB_NAME="$(grep -E '^DB_NAME=' "$ENV" | cut -d= -f2-)"
DB_NAME="${DB_NAME:-supermarket_simulator}"
[ -n "$DB_ROOT_PASS" ] || { echo "ERROR: DB_ROOT_PASS vacío en $ENV" >&2; exit 1; }

CONTENEDOR_DB="${CONTENEDOR_DB:-d2-db}"     # nombre del contenedor de la base (solo se cambia para pruebas)

# La contraseña viaja por variable de entorno (MYSQL_PWD), no como argumento: no se ve en la lista de procesos
db() { podman exec -i -e MYSQL_PWD="$DB_ROOT_PASS" "$CONTENEDOR_DB" "$@"; }

shopt -s nullglob
MIGRACIONES=(database/migracion_*.sql)
[ "${#MIGRACIONES[@]}" -gt 0 ] || { echo "No hay migraciones en database/"; exit 0; }

echo "==> Respaldo de $DB_NAME"
DESTINO="${RESPALDOS:-$HOME/respaldos-d2}"
umask 077
mkdir -p "$DESTINO"
ARCHIVO="$DESTINO/${DB_NAME}-$(date +%F-%H%M%S).sql"
db mariadb-dump -u root --single-transaction --routines "$DB_NAME" > "$ARCHIVO"
# Un respaldo vacío o cortado no sirve: se comprueba antes de tocar nada
if ! tail -n 1 "$ARCHIVO" | grep -q "Dump completed"; then
  echo "ERROR: el respaldo no terminó bien ($ARCHIVO). No se aplicó ninguna migración." >&2
  exit 1
fi
echo "    $ARCHIVO ($(du -h "$ARCHIVO" | cut -f1))"

for f in "${MIGRACIONES[@]}"; do
  echo "==> Aplicando $f"
  db mariadb -u root "$DB_NAME" < "$f"
done

echo "OK. Para volver atrás: podman exec -i $CONTENEDOR_DB mariadb -u root -p \"$DB_NAME\" < $ARCHIVO"
echo "Ahora puedes ejecutar ./deploy/desplegar.sh"
