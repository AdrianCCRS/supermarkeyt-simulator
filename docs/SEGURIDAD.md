# Informe de seguridad básico: adrianccrs.me

Escaneo pasivo y sin cambios del sitio publicado (https://adrianccrs.me) y del servidor. Se revisaron archivos expuestos, cabeceras, entradas inválidas a la API y la configuración del servidor en solo lectura. Es un servidor propio y el fin es académico.

## Urgentes

| # | Hallazgo | Riesgo | Arreglo |
|---|---|---|---|
| 1 | **(Corregido en el repo; falta desplegar)** `/server-status` es público y responde 200 (módulo `mod_status` de Apache). Muestra versión exacta, tiempo en marcha, carga y peticiones en curso | Fuga de información que ayuda a elegir ataques | En el `Containerfile` añadir `a2dismod status`, reconstruir la imagen y `podman-compose up -d`. Mientras tanto, regla WAF en Cloudflare: `starts_with(http.request.uri.path, "/server-status")` → Block |
| 2 | SSH con contraseña y `root` permitido (`passwordauthentication yes`, `permitrootlogin yes`), sin `authorized_keys`. Además la contraseña se escribió en un chat | Quien la vea puede entrar si llega al puerto 22. Hoy el riesgo es bajo (detrás de la universidad, 0 intentos fallidos en 24 h) | (a) `passwd` ya. (b) `ssh-keygen -t ed25519` y `ssh-copy-id adrian-server`. (c) Comprobar que entras con la llave en otra terminal. (d) Solo entonces `PasswordAuthentication no` y `PermitRootLogin no` en `/etc/ssh/sshd_config.d/` y `sudo systemctl reload ssh`. En ese orden o te quedas fuera |
| 3 | 29 actualizaciones de seguridad pendientes, sin `unattended-upgrades` | Vulnerabilidades conocidas sin parchear | `sudo apt update && sudo apt upgrade`, reiniciar si lo pide, `sudo apt install unattended-upgrades` |
| 4 | Sin copias de seguridad (sin `cron`, sin `.sql`) | Si se daña el volumen de la base, se pierde todo | `mariadb-dump` de la sección 8 de `docs/SERVIDOR.md`, con `cron` y copia fuera del servidor |

## Medios

| # | Hallazgo | Detalle y arreglo |
|---|---|---|
| 5 | Crear jugadores es gratis y deja datos: cada UUID nuevo que abre jornada crea 108 filas en `stock_jugador` (deducido del código, no probado) | Se podría inflar la base. El límite de peticiones lo frena en parte. Mitigar con el SQL de limpieza de `docs/PUBLICAR.md` por `cron` y, si hace falta, un tope por IP en la aplicación |
| 6 | HSTS apagado | Descomentar la línea en `public/.htaccess` cuando HTTPS esté estable |
| 7 | Sin `fail2ban` | Pierde sentido al pasar SSH a llaves. Opcional |
| 8 | Los montos del cierre (pérdida, sobrecobro, faltantes) y los puntos los manda el cliente | Un jugador puede hacer trampa en lo suyo. Con el ranking, además, puede inflar su puesto: el servidor recorta los puntos de cada jornada a 100 por venta completada (tope absoluto de 10 000) y nunca menos de 0, lo que frena un `curl` con `puntos: 999999` pero no a quien juegue de verdad o automatice ventas. Riesgo conocido y aceptado (es un juego para compartir). Calcularlos en el servidor está descrito en la sección «Futuro» de `docs/TAREAS_RANKING.md` |
| 9 | El ranking publica apodos elegidos por los jugadores | Se muestran siempre como texto (nunca HTML), pasan por un filtro corto de palabras bloqueadas y no se expone ningún identificador. Para borrar uno ofensivo, ver la última sección de este documento |
| 10 | `apodo.php` y `ranking.php` escriben en la base en cada petición (contador por IP, 10 y 120 por minuto) | Frena el abuso sin dependencias externas. Detrás de Cloudflare la IP sale de `CF-Connecting-IP`, y solo se confía en ella si la conexión directa es local o privada. Sigue valiendo añadir un límite en Cloudflare para los demás endpoints |

## Bajos

- Cabeceras duplicadas (`referrer-policy`, `x-content-type-options`): las ponen Apache y PHP. Inofensivo.
- `cloudflared.service` con permisos 644 y el token del túnel dentro. Restringir a 600 o rotar el token si se pierde la confianza en el servidor.
- `x11forwarding yes` en SSH: no se usa, se puede quitar.
- Certificado de Let's Encrypt antiguo con renovación manual: `sudo certbot delete --cert-name adrianccrs.me`.

## Lo que está bien

- `/.env`, `/.git`, `/src`, `/database` y `/tests` no se pueden pedir (403 o 404).
- CSP estricta, `X-Frame-Options: DENY`, `nosniff`, sin CORS abierto.
- TLS solo 1.2 o superior. HTTP redirige a HTTPS (301).
- `TRACE`, `PUT`, `DELETE` y `OPTIONS` rechazados con 405.
- API: identificadores inválidos dan 400, jornadas y ventas de otro jugador dan 404 (sin IDOR), inyecciones SQL y scripts no producen 500, cuerpo enorme da 413.
- Administración bloqueada desde internet por Cloudflare (403).
- Límite de peticiones probado: 600 en paralelo, 107 pasan y 493 reciben 429.
- Contenedores sin root, web en solo lectura, capacidades recortadas, `no-new-privileges`.
- Usuario de la base limitado a `SELECT, INSERT, UPDATE`. Consultas preparadas.
- `deploy/.env` con permisos 600 y fuera de git.
- Sin puertos entrantes abiertos salvo SSH; el tráfico entra por Cloudflare Tunnel.

## Qué no se cubrió

Denegación de servicio real, fuerza bruta, vulnerabilidades por versión de PHP, Apache o MariaDB, y la lógica del juego en el navegador.

## Para decir al mostrarlo

«El servidor no expone puertos, todo entra por un túnel cifrado, la API valida cada entrada, el aislamiento es por jugador y la administración solo es accesible por SSH.» Y para lo pendiente: el #1 y el #2 se arreglan en minutos.

## Moderación del ranking: borrar un apodo ofensivo

Los apodos pasan por un filtro corto de palabras bloqueadas (`RankingService`), pero no es infalible. Para quitar uno desde la base (con el usuario administrador; el usuario web no puede borrar, pero sí actualizar). El jugador conserva sus puntos y deja de salir en el ranking hasta que elija otro apodo. Busca primero con `SELECT id, apodo, puntos_total FROM jugadores WHERE apodo LIKE '%texto%';` y luego:

```sql
UPDATE jugadores SET apodo = NULL, apodo_cambiado = NULL WHERE apodo = 'ApodoOfensivo';
```

Con `apodo_cambiado = NULL` puede elegir otro enseguida, sin esperar las 24 horas. Para dejarlo sin ranking del todo, pon además `puntos_total = 0`. Para ampliar la lista de palabras bloqueadas, edita las constantes `BLOQUEADAS_*` de `src/Services/RankingService.php`.
