#!/bin/bash
# Se ejecuta una vez, al crear la base, DESPUÉS de importar el esquema.
# El juego solo necesita leer, insertar y actualizar: se le quita todo lo demás (ver docs/PUBLICAR.md).
set -e
mariadb -uroot -p"$MARIADB_ROOT_PASSWORD" <<SQL
REVOKE ALL PRIVILEGES ON \`${MARIADB_DATABASE}\`.* FROM '${MARIADB_USER}'@'%';
GRANT SELECT, INSERT, UPDATE ON \`${MARIADB_DATABASE}\`.* TO '${MARIADB_USER}'@'%';
FLUSH PRIVILEGES;
SQL
