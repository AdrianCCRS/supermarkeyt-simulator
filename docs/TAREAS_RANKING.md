# Ranking top 5 con apodo (versión ligera)

Plan de implementación del ranking. **Estado (nov 2026):** secciones 1 a 4 implementadas en la rama `feature/ranking` y la sección 5 (despliegue) preparada con `deploy/migrar.sh`, la comprobación previa de `deploy/desplegar.sh` y el paso de CI `tests/schema_paridad.sh`. Pendiente: medir el máximo humano de ventas por minuto antes de ajustar el tope de puntos (5.1), jugar una partida completa para ver el panel de cierre y el diálogo del apodo, y hacer el despliegue real (respaldo → `migrar.sh` → `desplegar.sh`).

## Enfoque

El juego es para compartir y probar un rato, y el servidor es modesto. Por eso:

- **Los puntos se siguen calculando en el navegador** ([auditoria.js](../public/assets/js/auditoria.js)). El servidor no replica la lógica del juego.
- **El servidor solo comprueba que el puntaje sea posible** y lo recorta si no lo es. Frena el `curl` con `puntos: 999999`, no a alguien con paciencia y ganas de trampear. Está asumido.
- **El ranking se lee sin cálculos pesados**: el total de cada jugador se guarda ya sumado, no se recalcula en cada consulta.
- Sin cuentas: la identidad sigue siendo el UUID del navegador (`X-Jugador`), y el apodo se cuelga de él.

La versión con recálculo completo en el servidor queda como trabajo futuro (ver el final).

## Decisiones tomadas

- El ranking es el **acumulado** de puntos de todas las jornadas.
- **Cada jornada aporta como mínimo 0**: una mala jornada no resta, solo no suma.
- El ranking **empieza en cero** el día del despliegue; los puntos viejos (solo están en el `localStorage` de cada jugador) no se importan.
- Las jornadas ya cerradas antes del despliegue quedan con 0 puntos. Una jornada que esté abierta al desplegar sí suma al cerrarse, porque sus puntos los calcula el navegador igual que siempre.
- El cierre de una jornada **nunca falla por culpa del ranking**: si los puntos no cuadran, se recortan, no se rechaza el cierre.

## 1. Esquema y migración (aditiva y compatible con el código actual)

Regla del proyecto ([CICD.md](CICD.md) §7): migración idempotente, probada en CI, respaldo primero y migración antes que el código. Se aplica con un usuario administrador (el usuario web no tiene `ALTER` ni `CREATE`).

- [ ] 1.1 Crear `database/migracion_ranking.sql` con el estilo de `migrar_paso` de `migracion_multijugador.sql`.
- [ ] 1.2 Columna `jornadas.puntos INT NOT NULL DEFAULT 0`.
- [ ] 1.3 Tabla `jugadores`: `id CHAR(36) PK`, `apodo VARCHAR(20) NULL UNIQUE`, `puntos_total INT NOT NULL DEFAULT 0`, `creado`, `actualizado`. La fila se crea al cerrar la primera jornada del jugador; el apodo se rellena cuando lo elige. Colación sin distinción de mayúsculas ni tildes para que «Ana» y «ana» choquen.
- [ ] 1.4 Índice sobre `jugadores (puntos_total)` para que el top 5 y la posición propia no recorran la tabla.
- [ ] 1.5 Reflejar lo mismo en `init.sql` (bases nuevas) y mantener la migración para la base desplegada.
- [ ] 1.6 Revisar [99-permisos.sh](../deploy/db/99-permisos.sh): el usuario web necesita `SELECT/INSERT/UPDATE` sobre `jugadores`.
- [ ] 1.7 Probar en local: esquema **actual** → migración → pruebas, y la migración **dos veces** (idempotencia).

## 2. Servidor

- [ ] 2.1 **Cierre** (`jornada_cerrar.php` y `JornadaService::cerrar`): aceptar un campo `puntos` (entero, opcional; si falta o es inválido vale 0).
- [ ] 2.2 **Validación de verosimilitud**, dentro de la transacción del cierre y con la fila de la jornada ya bloqueada:
  - Mínimo 0.
  - Máximo `100 × ventas completadas de esa jornada` (una venta exacta da +100; nada da más). Los abandonos y protestas solo restan, así que no pueden justificar más puntos.
  - Tope absoluto razonable por jornada como segundo cinturón.
  - Si el valor enviado supera el máximo, se guarda el máximo (y se anota en el log del servidor para poder verlo).
- [ ] 2.3 **Comprobación barata de tiempo** (opcional, ver 5.1): ventas por minuto físicamente imposibles de lograr jugando. Los umbrales salen de medir partidas reales, no de adivinarlos.
- [ ] 2.4 En la misma transacción: guardar `jornadas.puntos` y sumar a `jugadores.puntos_total` (`INSERT … ON DUPLICATE KEY UPDATE`). Como el cierre ya rechaza una jornada que no está `abierta`, no se puede sumar dos veces la misma.
- [ ] 2.5 `POST /api/apodo.php`: valida longitud (3 a 20), caracteres permitidos y una lista corta de palabras bloqueadas; guarda el apodo del UUID de `X-Jugador`; 409 si ya existe; límite de cambios (por ejemplo, uno por día).
- [ ] 2.6 `GET /api/ranking.php`: top 5 por `puntos_total` solo de jugadores con apodo y puntos > 0, y, si quien pregunta tiene apodo y no está en el top, su posición (`COUNT(*)` de los que tienen más). **Nunca** devolver UUIDs. Desempate: quien llegó antes a esa cifra (`actualizado` ascendente).
- [ ] 2.7 Para no cargar el servidor: cabecera de caché corta (≈ 30 s) en el ranking, o un cacheo mínimo del resultado. El `Cache-Control: no-store` actual de [Api.php](../src/Http/Api.php) es adecuado para datos personales, pero el top 5 es público, así que este endpoint debe poder anular esa regla.
- [ ] 2.8 Límite de peticiones por IP en los dos endpoints nuevos. Detrás de Cloudflare Tunnel la IP real llega en `CF-Connecting-IP`; confirmar cómo está en [apache.conf](../deploy/apache.conf) antes de confiar en `REMOTE_ADDR`.
- [ ] 2.9 Una forma documentada de borrar un apodo ofensivo desde la base (una sentencia SQL en [SEGURIDAD.md](SEGURIDAD.md)).

## 3. Frontend

- [ ] 3.1 [api.js](../public/assets/js/api.js): enviar `puntos` en `cerrarJornada` y añadir `ranking()` y `fijarApodo()`.
- [ ] 3.2 [ControlJornada.js](../public/assets/js/phaser/ControlJornada.js): pasar `resumen.puntos` al cerrar.
- [ ] 3.3 Pedir el apodo **una sola vez**, al cerrar la primera jornada (con opción de omitirlo) y editable desde el perfil. Validación en el cliente que repite la del servidor.
- [ ] 3.4 Tabla del top 5 en el menú principal y en la pantalla de cierre, con la posición propia si no está en el top. Estados de carga y de error: **sin red o con error, el juego sigue funcionando** y la tabla muestra un aviso.
- [ ] 3.5 Opcional: «copiar código de recuperación» (el UUID) y poder pegarlo en otro navegador para conservar apodo y puntos.
- [ ] 3.6 Que el perfil local ([perfil.js](../public/assets/js/perfil.js)) no contradiga lo que muestra el ranking (el perfil muestra todo lo local; el ranking solo lo posterior al despliegue). Una frase aclaratoria basta.
- [ ] 3.7 Evitar que el navegador siga con el JS viejo tras desplegar (versión en los `<script>`), ver 5.4.

## 4. Pruebas

- [ ] 4.1 PHP: cierre con puntos válidos, con puntos de más (se recortan), negativos (quedan en 0), ausentes (0) y con jornada sin ventas (0); doble cierre de la misma jornada (no suma dos veces).
- [ ] 4.2 PHP: apodo (duplicado con otra mayúscula o tilde, demasiado corto o largo, bloqueado, cambio demasiado seguido) y ranking (orden, desempate, solo con apodo, sin UUIDs, posición propia fuera del top).
- [ ] 4.3 JS: validación del apodo en el cliente y render de la tabla con datos vacíos o con error.
- [ ] 4.4 CI: añadir a [ci.yml](../.github/workflows/ci.yml) el paso «esquema anterior → migración (dos veces) → pruebas».
- [ ] 4.5 Prueba manual: una partida completa, apodo nuevo, apodo repetido y recargar a mitad de jornada.

## 5. Despliegue (proyecto ya en producción)

Orden: **respaldo → migración (compatible con el código actual) → código nuevo → verificar**.

- [ ] 5.1 Antes de fijar los umbrales de 2.2 y 2.3, jugar un par de partidas rápidas para ver el máximo humano real de ventas por minuto y dejar margen.
- [ ] 5.2 Respaldo con `mysqldump` y comprobar que se puede restaurar.
- [ ] 5.3 Aplicar `migracion_ranking.sql` con el usuario administrador mientras sigue el código viejo, y verificar que el juego actual sigue funcionando.
- [ ] 5.4 Ejecutar [desplegar.sh](../deploy/desplegar.sh). Un navegador con el JS viejo en caché sigue funcionando: no envía `puntos`, la jornada cuenta 0 y nada se rompe.
- [ ] 5.5 Vuelta atrás: el esquema es solo aditivo, así que volver al código anterior funciona sin tocar la base. Anotar el comando exacto.
- [ ] 5.6 Actualizar el README, [PUBLICAR.md](PUBLICAR.md) y [SEGURIDAD.md](SEGURIDAD.md) (apodos, moderación, límites).

## Orden sugerido

1. Esquema y migración (1) → 2. Servidor (2) con sus pruebas (4.1, 4.2, 4.4) → 3. Frontend (3) con sus pruebas (4.3) → 4. Despliegue (5).

Los pasos 1 y 2 pueden fusionarse a `main` antes que el frontend: los endpoints nuevos no molestan a nadie hasta que el juego los use.

## Futuro: puntaje calculado en el servidor

Si algún día hace falta un ranking a prueba de trampas, no basta con validar rangos. Hay que mover al servidor lo que hoy solo sabe el navegador:

- Generar la compra de cada cliente y su efectivo real (portar `Compra.generar` y la generación del efectivo).
- Juzgar el cobro: portar `Auditoria.liquidar` y `cuadreCaja`, y guardar el resultado por cliente en la misma transacción que la venta.
- Validar los abandonos con la paciencia (`Paciencia.duracion`) y marcas de tiempo.
- Calcular al cerrar los puntos, la pérdida y los faltantes/sobrantes desde esos registros, ignorando lo que mande el navegador.
- Tests de paridad JS ↔ PHP con casos compartidos, y límites de tiempo contra bots.

Con el esquema de este plan, esa migración sería aditiva: `jornadas.puntos` y `jugadores.puntos_total` se mantienen, solo cambia quién calcula el valor.
