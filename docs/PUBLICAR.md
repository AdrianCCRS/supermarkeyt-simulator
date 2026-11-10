# Publicar el juego

Pasos en orden para ponerlo en internet y jugarlo con amigos, y qué cuidar para no abrirle puertas a nadie.
El juego es PHP + MySQL + archivos estáticos; no hay cuentas (cada navegador genera un identificador anónimo con su propia jornada y stock), así que varios jugadores pueden jugar a la vez.

**Veredicto de la revisión de seguridad (nov 2026):** apto para publicarlo y jugarlo con amigos **si se cumplen los pasos marcados A**. Para abrirlo a cualquiera en internet falta limitar peticiones (nivel B). Niveles: **A** = obligatorio · **B** = si lo compartes más allá de amigos · **C** = recomendable.
Se revisó el código, el navegador (CSP probada en Chrome sin violaciones), la base y la configuración; no se probó en un hosting real, ni con carga alta, ni con ataques automatizados.

## 1. Qué necesita el hosting
- PHP 8.2 o superior con `pdo_mysql` y `mbstring`.
- MySQL 8.0.16+ o MariaDB 10.2+ (columnas generadas y restricciones `CHECK`).
- Poder poner la **raíz web en `public/`**: `src/`, `database/`, `tests/`, `.env` deben quedar fuera de lo que se publica.
- HTTPS (casi todos los hostings lo dan gratis). Sin él, el identificador del jugador viaja en claro.

## 2. Pasos
1. **Base de datos:** crea una base y un usuario con permisos solo sobre ella. Importa `database/init.sql` (quita las dos primeras líneas `CREATE DATABASE` / `USE` si el hosting ya te da la base) y luego `database/seed.sql` para el catálogo (**el seed hace `TRUNCATE`**: solo en una base vacía).
   Si tu base ya existía de antes del multijugador: `mysql -u <admin> -p <base> < database/migracion_multijugador.sql` (se puede repetir sin problema; haz antes un `mysqldump`). Sin ella, `jornada_actual.php` y `productos.php` responden 500.
2. **Configuración:** variables de entorno en el panel del hosting, o un `.env` fuera de la raíz web:

   | Variable | Para qué |
   |---|---|
   | `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS` | Conexión a la base (si falta `DB_USER` no conecta) |
   | `ADMIN_TOKEN` | Token largo y aleatorio para `producto_reponer` y `producto_estado`. Sin él quedan deshabilitados (403) |

3. **Archivos:** sube el proyecto sin `tests/`, `assets-src/`, `.git`, `.claude/` ni `.codex/`.
4. **Comprueba:** `https://tu-dominio/api/productos.php` debe devolver JSON y luego abre el juego. Sigue con los apartados siguientes.

## 2b. En un servidor compartido con Podman

Para un servidor que usas para varias cosas: el juego y su base van en dos contenedores, con red y volumen propios, y el juego solo escucha en `127.0.0.1` (delante va tu proxy inverso con HTTPS). Los archivos están en `deploy/` y la guía paso a paso, con los conceptos explicados, en [SERVIDOR.md](SERVIDOR.md). Después sigue con las comprobaciones de las secciones 5 y 6.

## 3. Servidor y archivos (A)

- [ ] **Raíz web = `public/`.** Fuera de ella quedan `src/`, `database/`, `tests/`, `tools/`, `assets-src/`, `docs/`, `.env`, `.git`, `.claude/`, `.codex/`.
  Si el hosting solo ofrece `public_html`: sube el *contenido* de `public/` ahí y el resto en la carpeta de al lado (el código busca `src/` con `../../src`: `public_html/api/` debe quedar dos niveles por debajo de la carpeta que contiene `src/`; ajusta si tu estructura difiere).
- [ ] **No subas** `.git`, `tests/`, `assets-src/`, `.claude/`, `.codex/` ni ningún `.env` de desarrollo.
- [ ] **HTTPS activo** (Let's Encrypt o el que dé el hosting) y redirección de `http://` a `https://`.
- [ ] **HSTS:** con HTTPS ya funcionando, quita el `#` de la línea `Strict-Transport-Security` de [public/.htaccess](../public/.htaccess).
- [ ] **PHP:** versión 8.2 o superior con parches al día. En `php.ini` (o el panel): `display_errors=Off`, `expose_php=Off`, `log_errors=On`.
- [ ] **nginx en vez de Apache:** el `.htaccess` no se lee. Pon esto en el bloque `server` (ajusta rutas y socket de PHP):

```nginx
root /var/www/juego/public;
index index.html;
autoindex off;

add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; media-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "no-referrer" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=()" always;
add_header Strict-Transport-Security "max-age=31536000" always;   # solo con HTTPS ya funcionando

location ~ /\.(?!well-known) { deny all; }
location ~ \.php$ {
    fastcgi_pass unix:/run/php/php8.2-fpm.sock;
    include fastcgi_params;
    fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
}
```

> `add_header` dentro de un `location` anula los del `server`: si añades otros `location` con sus propias cabeceras, repítelas.

## 4. Secretos y base de datos (A)

- [ ] **`ADMIN_TOKEN`** aleatorio y largo, solo en las variables del servidor (o en un `.env` fuera de la raíz web):
  ```bash
  openssl rand -hex 32
  ```
  El juego no lo usa; solo protege `producto_reponer` y `producto_estado`. Sin token esos endpoints responden 403.
- [ ] **Usuario de MySQL exclusivo del juego**, sin `root` y con los permisos mínimos:
  ```sql
  CREATE USER 'juego'@'localhost' IDENTIFIED BY '<contraseña larga y aleatoria>';
  GRANT SELECT, INSERT, UPDATE ON supermarket_simulator.* TO 'juego'@'localhost';
  FLUSH PRIVILEGES;
  ```
  El juego no necesita `DELETE`, `DROP`, `ALTER`, `CREATE` ni `FILE`. (Importa `init.sql`, `seed.sql` y la migración con un usuario administrador aparte, no con este.)
  Comprueba que realmente funciona con ese usuario: abre una jornada y cobra una venta.
- [ ] **MySQL no expuesto a internet:** `bind-address = 127.0.0.1` (o el firewall del hosting cierra el 3306).
- [ ] **Contraseñas distintas** a las de tu entorno local, y el `.env` con permisos `600`.
- [ ] **Migración aplicada** si tu base viene de antes del multijugador:
  ```bash
  mysql -u <admin> -p <base> < database/migracion_multijugador.sql
  ```
  Haz antes un `mysqldump` (ver «Operación»).

## 5. Comprobación desde fuera (A)

Con la web ya publicada, sustituye `TU-DOMINIO` y ejecuta desde cualquier equipo:

```bash
D=https://TU-DOMINIO

# 1) Cabeceras de seguridad presentes (CSP, nosniff, X-Frame-Options, Referrer-Policy, HSTS)
curl -sI $D/ | grep -iE 'content-security|x-content-type|x-frame|referrer|strict-transport'

# 2) Lo privado NO se sirve (todos deben dar 403 o 404, nunca 200)
for p in .env .git/config src/Config/Database.php database/init.sql tests/run.php composer.json; do
  printf '%-28s %s\n' "$p" "$(curl -s -o /dev/null -w '%{http_code}' $D/$p)"
done

# 3) Sin listado de carpetas (no debe verse un índice de archivos)
curl -s $D/assets/ | head -5

# 4) La API responde bien y sin detalles internos
curl -s $D/api/productos.php | head -c 200; echo
curl -s -o /dev/null -w 'admin sin token: %{http_code}\n' -X POST -H 'Content-Type: application/json' \
  -d '{"sku":"FRU-001","cantidad":1}' $D/api/producto_reponer.php        # esperado: 403
curl -s -o /dev/null -w 'http -> https: %{http_code} %{redirect_url}\n' http://TU-DOMINIO/   # esperado: 301 a https
```

Además, abre el juego en el navegador con las herramientas de desarrollo (pestaña Consola): no debe haber errores «Refused to…» de la CSP.
Pega la URL en <https://securityheaders.com> para una nota rápida de cabeceras.

## 6. Si lo compartes más allá de amigos (B)

Esta es la parte que el código no cubre: **no hay limitación de peticiones**. Cada identificador nuevo que abre una jornada crea ~110 filas.

- [ ] **Limita peticiones delante del servidor.** La opción más sencilla es poner **Cloudflare** (plan gratuito) delante del dominio:
  - *Security → WAF → Rate limiting rules*: por ejemplo, `URI Path contains "/api/"` → máximo 60 peticiones por minuto por IP, acción *Block* 10 minutos.
  - Una regla más estricta para `jornada_abrir.php`: máximo 5 por minuto por IP. Es el único endpoint que crea filas en bloque.
  - Activa *Bot Fight Mode*.
  - Si usas Cloudflare, deja que el servidor acepte solo sus IPs o, al menos, no te fíes de la IP del cliente para nada dentro del código (ahora no se usa).
- [ ] **Sin Cloudflare, en nginx:**
  ```nginx
  limit_req_zone $binary_remote_addr zone=api:10m rate=5r/s;
  limit_req_zone $binary_remote_addr zone=abrir:10m rate=5r/m;
  location /api/ { limit_req zone=api burst=20 nodelay; }
  location = /api/jornada_abrir.php { limit_req zone=abrir burst=3 nodelay; }
  ```
  (en Apache: `mod_evasive` o `mod_security`; en hostings compartidos, el panel suele ofrecer protección contra fuerza bruta/bots).
- [ ] **Limpieza periódica** de jornadas abandonadas y de lo que dejan atrás (cron diario o semanal, con un usuario con permiso de `DELETE`, no el del juego):
  ```sql
  UPDATE jornadas SET estado='cerrada', fecha_fin=NOW()
   WHERE estado='abierta' AND fecha_inicio < NOW() - INTERVAL 7 DAY;
  ```
  Si quieres borrar también el stock de jugadores que no vuelven, hazlo solo para jugadores sin jornada abierta y con jornadas de más de 30 días; revísalo antes con un `SELECT`.
- [ ] **Cuota de disco y alertas:** pon aviso del hosting si la base supera un tamaño razonable (p. ej. 500 MB).

## 7. Operación (C)

- [ ] **Copias de seguridad:** `mysqldump` diario o semanal a un sitio distinto del servidor.
  ```bash
  mysqldump --single-transaction -u <admin> -p supermarket_simulator | gzip > respaldo-$(date +%F).sql.gz
  ```
  Haz una prueba de restauración al menos una vez.
- [ ] **Revisa el log de errores** de PHP y del servidor de vez en cuando; ahí aparece cualquier intento raro (los errores internos van al log, no al navegador).
- [ ] **Actualizaciones:** PHP y MySQL al día; jQuery 3.7.1 y Phaser 3.90 están incluidos en `public/assets/js/vendor/`, revisa sus avisos de seguridad una o dos veces al año.
- [ ] **Si se filtra el `ADMIN_TOKEN` o la contraseña de la base:** cámbialos en el servidor y reinicia PHP. No hay sesiones que invalidar.
- [ ] **Aviso a los jugadores** (opcional): el progreso vive en su navegador; si borran los datos del sitio, empiezan de cero.

---

## Resumen de una línea por nivel
- **A (publicar con amigos):** HTTPS, raíz en `public/`, `ADMIN_TOKEN`, usuario MySQL mínimo, `.htaccess`/cabeceras activos, comprobación desde fuera.
- **B (abrirlo al público):** limitación de peticiones + limpieza periódica de jornadas.
- **C (mantenerlo):** copias de seguridad, revisar logs, actualizar.

## 8. Riesgos aceptados (no se arreglan en el código)
- **Sin limitación de peticiones:** cualquiera puede inventar identificadores sin parar y cada jornada abierta crea ~110 filas de stock. Con amigos no pasa; en abierto llenaría la base (ver apartado 6).
- **Los importes del cierre los manda el navegador** (pérdidas, sobrecobros, faltantes y sobrantes): con la consola se pueden falsear. Solo afecta a la partida de ese jugador; no hay ranking ni premios. Si algún día hay ranking, hay que recalcularlos en el servidor.
- **El identificador es una llave, no una identidad:** vive en el `localStorage`. Quien lo robe (por HTTP sin cifrar o con acceso al navegador) actúa como ese jugador; con 122 bits aleatorios no se puede adivinar. Si el jugador borra los datos del sitio, empieza como uno nuevo y su jornada anterior queda abierta en la base.
- **Sin cuentas ni recuperación** (decisión de diseño) y **sin registro de actividad** más allá del log de errores del servidor.

## 9. Qué se comprobó
SQL con sentencias preparadas (nada concatenado) · sin `innerHTML`, `eval` ni `document.write`, y CSP estricta · sin cookies ni sesiones, y cabecera propia que fuerza *preflight* (otros sitios no pueden llamar a la API) · jornada, cobro, cierre y ventas comprueban que sean del jugador (404 si no) · `.env` ignorado y nunca estuvo en el historial · errores internos genéricos, con `display_errors` apagado · cuerpo máx. 64 KB, tipos estrictos, importes con formato fijo, UUID validado · sin subida de archivos · jQuery y Phaser incluidos localmente (sin CDN). Corregido en la revisión: la conexión caía a `root` sin contraseña si faltaba `DB_USER`; consultar el catálogo con un identificador cualquiera escribía ~110 filas (ahora es solo lectura); faltaban las cabeceras de seguridad.
