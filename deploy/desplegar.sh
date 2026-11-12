#!/usr/bin/env bash
# Despliegue en el servidor: actualiza el código, reconstruye la imagen web y la reinicia.
# No toca la base de datos ni deploy/.env. Uso: ./deploy/desplegar.sh (desde cualquier carpeta)
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
for _ in $(seq 1 15); do
  CODE="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${PORT:-8090}/api/categorias.php" || true)"
  if [ "$CODE" = "200" ]; then
    echo "OK (HTTP $CODE)"
    exit 0
  fi
  sleep 2
done
echo "ERROR: el servicio no responde tras el despliegue" >&2
podman logs --tail 30 d2-web >&2
exit 1
