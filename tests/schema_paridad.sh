#!/usr/bin/env bash
# Comprueba que «esquema anterior + migraciones» deja la MISMA estructura que el init.sql actual.
# Es lo que le pasa a la base ya desplegada (migraciones) frente a una base nueva (init.sql): si difieren,
# una de las dos rutas está mal. Las migraciones se aplican DOS veces para comprobar que son idempotentes.
#
# Uso:   tests/schema_paridad.sh <referencia git del esquema anterior>      (p. ej. origin/main o un SHA)
# Conexión: DB_HOST, DB_PORT, DB_USER, DB_PASS (por defecto 127.0.0.1:3306, root). Crea y borra dos bases temporales
# (paridad_migrada_test y paridad_nueva_test). Necesita el cliente mariadb o mysql.
set -euo pipefail
cd "$(dirname "$0")/.."

REF="${1:?Falta la referencia git del esquema anterior (p. ej. origin/main)}"
: "${DB_HOST:=127.0.0.1}" "${DB_PORT:=3306}" "${DB_USER:=root}" "${DB_PASS:=}"
export MYSQL_PWD="$DB_PASS"

CLIENTE="$(command -v mariadb || command -v mysql || true)"
[ -n "$CLIENTE" ] || { echo "ERROR: no hay cliente mariadb ni mysql" >&2; exit 2; }
SQL=("$CLIENTE" --protocol=tcp -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER")

MIGRADA=paridad_migrada_test
NUEVA=paridad_nueva_test
limpiar() { "${SQL[@]}" -e "DROP DATABASE IF EXISTS $MIGRADA; DROP DATABASE IF EXISTS $NUEVA;" || true; }
trap limpiar EXIT
limpiar
"${SQL[@]}" -e "CREATE DATABASE $MIGRADA; CREATE DATABASE $NUEVA;"

# init.sql crea y selecciona su propia base: se quitan esas dos líneas para cargarlo en la base que toque
cargar() { sed -e '/^CREATE DATABASE/d' -e '/^USE /d' | "${SQL[@]}" "$1"; }

echo "==> Esquema anterior ($REF)"
git show "$REF:database/init.sql" | cargar "$MIGRADA"

echo "==> Migraciones, dos veces cada una (deben ser idempotentes)"
for pasada in 1 2; do
  for migracion in database/migracion_*.sql; do
    echo "    pasada $pasada: $migracion"
    "${SQL[@]}" "$MIGRADA" < "$migracion"
  done
done

echo "==> Esquema actual (init.sql)"
cargar "$NUEVA" < database/init.sql

# Descripción comparable de una base: tablas, columnas, índices y restricciones CHECK. El orden de las columnas no
# cuenta (una migración las añade al final), así que todo se ordena por nombre.
describir() {
  "${SQL[@]}" -N -B -e "
    SELECT 'TABLA', table_name, engine, table_collation FROM information_schema.tables
      WHERE table_schema = '$1' ORDER BY table_name;
    SELECT 'COLUMNA', table_name, column_name, column_type, is_nullable, IFNULL(column_default, '(sin)'),
           IFNULL(generation_expression, ''), IFNULL(collation_name, ''), extra
      FROM information_schema.columns WHERE table_schema = '$1' ORDER BY table_name, column_name;
    SELECT 'INDICE', table_name, index_name, non_unique, seq_in_index, column_name
      FROM information_schema.statistics WHERE table_schema = '$1' ORDER BY table_name, index_name, seq_in_index;
    SELECT 'CHECK', table_name, check_clause FROM information_schema.check_constraints
      WHERE constraint_schema = '$1' ORDER BY table_name, check_clause;
    SELECT 'RUTINA', routine_name FROM information_schema.routines WHERE routine_schema = '$1' ORDER BY routine_name;"
}

# Guarda contra un falso verde: dos descripciones vacías serían «iguales»
[ "$(describir "$NUEVA" | wc -l)" -gt 20 ] || { echo "ERROR: no se pudo leer el esquema de $NUEVA" >&2; exit 2; }

if diff <(describir "$MIGRADA") <(describir "$NUEVA"); then
  echo "OK: las migraciones sobre el esquema anterior dan la misma estructura que init.sql"
else
  echo "ERROR: el esquema migrado y init.sql difieren (arriba: < migrado, > init.sql)" >&2
  exit 1
fi
