# Revisión de seguridad

Revisión del código y de la configuración antes de publicar el juego (8 nov 2026). Alcance: PHP (`src/`, `public/api/`), JavaScript
del navegador, base de datos, configuración del servidor y repositorio. No incluye el hosting concreto ni pruebas de carga.

**Veredicto:** apto para publicarlo y jugarlo con amigos **si se cumple la lista de abajo**. Para abrirlo a internet en general
falta limitar peticiones (ver «Riesgos aceptados»).

## Lista antes de publicar
1. HTTPS activo. Sin él, el identificador del jugador viaja en claro.
2. Raíz web = `public/`; `src/`, `database/`, `.env`, `tests/`, `tools/`, `assets-src/`, `.claude/`, `.codex/` fuera de ella (o sin subir).
3. `ADMIN_TOKEN` largo y aleatorio (p. ej. `openssl rand -hex 32`) en las variables del servidor.
4. Usuario de MySQL propio, con permisos solo `SELECT, INSERT, UPDATE` sobre la base del juego (sin `DROP`, `ALTER`, `FILE` ni acceso a otras bases).
5. `public/.htaccess` activo (Apache con `mod_headers`); en nginx, las mismas cabeceras en su configuración. Con HTTPS ya funcionando, descomenta HSTS.
6. PHP actualizado, con `display_errors=Off` en producción (la API ya lo fuerza) y `expose_php=Off`.

## Qué se comprobó y cómo está

| Tema | Resultado |
|---|---|
| **Inyección SQL** | Bien. Todas las consultas usan sentencias preparadas. Lo único interpolado son el tope de stock (constante entera) y la lista de `?` de los SKUs. |
| **XSS** | Bien. No hay `innerHTML`, `.html()`, `eval` ni `document.write`; los textos del servidor y los nombres de cliente se muestran con `.text()`/`textContent` o dentro del lienzo de Phaser. Además hay una CSP estricta (probada en Chrome: el juego corre sin violaciones). |
| **CSRF / CORS** | Bien. No hay cookies ni sesiones. Las peticiones llevan JSON y una cabecera propia (`X-Jugador`), lo que fuerza *preflight*; el servidor no emite CORS, así que otros sitios no pueden llamar a la API desde un navegador. |
| **Autorización** | Bien tras el cambio a varios jugadores: jornada, cobro, cierre, ventas y cancelaciones comprueban que sean del jugador (404 si no, para no revelar que existen). Los endpoints de administración exigen `X-Admin-Token` (comparación en tiempo constante). |
| **Identificador del jugador** | UUID aleatorio (122 bits): no se puede adivinar. Es una llave, no una identidad: quien lo robe (por HTTP sin cifrar, o con acceso al navegador) actúa como ese jugador. No da acceso a nada más. |
| **Secretos** | Bien. `.env` está en `.gitignore` y nunca estuvo en el historial; `.env.example` no tiene valores. |
| **Configuración de la BD** | Corregido: antes, si faltaba `DB_USER`, se conectaba como `root` sin contraseña. Ahora no conecta y escribe el motivo en el log. |
| **Fugas de información** | Bien. Los errores internos responden un mensaje genérico (el detalle va al log); `display_errors` apagado. |
| **Entrada** | Bien. Cuerpo máx. 64 KB, JSON de profundidad 8, tipos estrictos, importes con formato fijo, UUID validado por expresión regular. No hay subida de archivos. |
| **Cabeceras** | Corregido: la API envía `Cache-Control: no-store`, `nosniff` y `Referrer-Policy`; `public/.htaccess` añade CSP, `X-Frame-Options`, `Permissions-Policy` y bloquea archivos ocultos y listado de carpetas. |
| **Escrituras desde peticiones anónimas** | Corregido: consultar el catálogo con un identificador cualquiera creaba ~110 filas. Ahora es solo lectura; las filas se crean al abrir una jornada. |
| **Dependencias** | jQuery 3.7.1 (con SRI) y Phaser 3.90 van incluidos en `public/assets/js/vendor/`, sin CDN. Sin avisos conocidos al momento de la revisión; conviene revisarlos de vez en cuando. |

## Riesgos aceptados (no se arreglan en el código)

- **Sin limitación de peticiones.** Cualquiera puede pedir identificadores nuevos sin parar, y cada jornada abierta crea ~110 filas de
  stock. Con amigos no pasa; en abierto, llenaría la base. Solución: limitar en el hosting o en un CDN (Cloudflare, `mod_evasive`, nginx `limit_req`)
  y limpiar jornadas viejas (consulta en [DESPLIEGUE.md](DESPLIEGUE.md)).
- **Los importes del cierre los manda el navegador** (pérdidas, sobrecobros, faltantes y sobrantes). Un jugador con la consola puede falsearlos:
  solo afecta a su propia partida y stock (los sobrantes se recortan a 1.000.000 por producto). No hay ranking ni premios que proteger.
  Si algún día hay ranking, hay que recalcular en el servidor.
- **Sin cuentas ni recuperación:** borrar los datos del navegador pierde la partida. Es una decisión de diseño.
- **Sin registro de actividad** más allá del log de errores del servidor.
