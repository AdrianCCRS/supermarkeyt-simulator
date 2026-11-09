# Publicar el juego para jugar con amigos

El juego es PHP + MySQL + archivos estáticos. No hay cuentas: cada navegador genera un identificador anónimo y tiene su
propia jornada y su propio stock (ver [API_FRONTEND.md](API_FRONTEND.md)), así que varios jugadores pueden jugar a la vez.

## Qué necesita el hosting
- PHP 8.2 o superior con las extensiones `pdo_mysql` y `mbstring`.
- Una base MySQL/MariaDB (MySQL 8.0.16+ o MariaDB 10.2+: usa columnas generadas y restricciones `CHECK`).
- Poder poner la **raíz web en la carpeta `public/`**. Es lo importante: `src/`, `database/`, `.env` y `tests/` deben quedar
  **fuera** de lo que el servidor publica. Si el hosting solo te da una carpeta `public_html`, sube el contenido de `public/` ahí
  y deja `src/` y `database/` **al lado** de `public_html` (el código los busca con `../../src`, así que `public_html/api/` debe quedar
  dos niveles por debajo de la carpeta que contiene `src/`; ajusta si tu estructura difiere).
- HTTPS (casi todos los hostings lo dan gratis). Sin él el navegador no ofrece `crypto.randomUUID`; el juego usa un respaldo, pero igual conviene.

## Pasos
1. **Base de datos:** crea una base y un usuario con permisos solo sobre ella. Importa `database/init.sql` (quita las dos primeras líneas
   `CREATE DATABASE` / `USE` si tu hosting ya te da la base creada) y luego `database/seed.sql` para el catálogo
   (**el seed hace `TRUNCATE`**: solo en una base vacía).
2. **Configuración:** define estas variables de entorno en el panel del hosting, o crea un `.env` fuera de la raíz web (el código lo
   busca en la raíz del proyecto):

   | Variable | Para qué |
   |---|---|
   | `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS` | Conexión a la base |
   | `ADMIN_TOKEN` | Token largo y aleatorio para `producto_reponer` y `producto_estado`. Sin él quedan deshabilitados (403) |

3. **Archivos:** sube el proyecto (sin `tests/`, `assets-src/` ni `.git`; esas carpetas no hacen falta).
4. **Comprueba:** abre `https://tu-dominio/api/productos.php` (debe devolver JSON con los productos) y luego el juego.

## Seguridad
Hay una revisión completa en [SEGURIDAD.md](SEGURIDAD.md), con la lista de comprobaciones antes de publicar. Lo imprescindible:
HTTPS, raíz web en `public/`, `ADMIN_TOKEN`, un usuario de MySQL solo con `SELECT, INSERT, UPDATE` y el `public/.htaccess` activo
(Apache; en nginx, las mismas cabeceras en su configuración).

## Lo que hay que tener presente
- **El servidor confía en el navegador para los importes del cierre** (pérdidas y sobrecobros): quien abra la consola puede
  falsearlos. No hay ranking ni cuentas, así que solo afecta a su propia partida.
- **El identificador es una llave, no una identidad:** vive en el `localStorage` del navegador. Si el jugador borra los datos del sitio,
  empieza como uno nuevo (su jornada anterior queda abierta en la base, sin dueño que la use). Quien tuviera su UUID podría actuar
  como él; con un UUID aleatorio no se puede adivinar.
- **Crece la base:** cada jugador guarda ~110 filas de stock más sus jornadas y ventas. Para limpiar jornadas abandonadas:
  `UPDATE jornadas SET estado = 'cerrada', fecha_fin = NOW() WHERE estado = 'abierta' AND fecha_inicio < NOW() - INTERVAL 7 DAY;`
- **Copias de seguridad:** haz un `mysqldump` de vez en cuando; el progreso en el navegador (puntos y récords) no está en la base.
- **Sin límite de peticiones:** si lo vas a compartir más allá de amigos, añade limitación en el servidor o el hosting.
