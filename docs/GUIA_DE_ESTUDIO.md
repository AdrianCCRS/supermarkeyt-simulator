# Guía de estudio: Supermarket Simulator (backend PHP)

Esta guía no repite el código: te dice **qué leer, en qué orden y qué debes ser capaz de explicar**.
Cada enlace apunta al archivo real. Todo lo que está aquí está implementado y probado
(`/opt/lampp/bin/php tests/run.php` → 53 pruebas).

> **Alcance:** backend completo (PHP + MySQL + API JSON). Del frontend solo existe el **esqueleto** (ver sección 7); la lógica jQuery la construyes tú.

## 0. Cómo correr todo

```bash
/opt/lampp/bin/php tests/run.php                       # pruebas (el PHP del sistema no tiene pdo_mysql)
/opt/lampp/bin/php -S localhost:8000 -t public         # servidor de desarrollo
curl localhost:8000/api/productos.php
```

Las pruebas usan una base aparte (`supermarket_simulator_test`) que se recrea sola; nunca tocan la real.

## 1. Orden de lectura recomendado

1. **Configuración y conexión:** [Env.php](../src/Config/Env.php), [Database.php](../src/Config/Database.php), [.env.example](../.env.example)
2. **Esquema de datos:** [init.sql](../database/init.sql), [seed.sql](../database/seed.sql)
3. **Repositorios** (SQL puro): [ProductoRepository](../src/Repositories/ProductoRepository.php), [VentaRepository](../src/Repositories/VentaRepository.php), [JornadaRepository](../src/Repositories/JornadaRepository.php), [CategoriaRepository](../src/Repositories/CategoriaRepository.php)
4. **Lógica de negocio:** [PricingService](../src/Services/PricingService.php) → [CheckoutService](../src/Services/CheckoutService.php) → [JornadaService](../src/Services/JornadaService.php) → [VentaService](../src/Services/VentaService.php) → [ProductoService](../src/Services/ProductoService.php)
5. **Capa HTTP:** [Api.php](../src/Http/Api.php), luego los endpoints en [public/api/](../public/api/)
6. **Pruebas:** [tests/bootstrap.php](../tests/bootstrap.php), luego cada `*Test.php`

La arquitectura es de tres capas: **endpoint** (HTTP) → **service** (reglas de negocio, transacciones) → **repository** (SQL).
Si te preguntan "por qué así", la respuesta es: cada capa se puede probar y cambiar sin tocar las otras.

## 2. Conceptos clave y dónde verlos

### 2.1 Dinero con enteros (no con `float`)
- [PricingService.php:192](../src/Services/PricingService.php#L192) `decimalACentavos()` convierte `"1234.50"` a `123450`.
- Los `float` fallan con decimales (`0.1 + 0.2 !== 0.3`); con centavos enteros las cuentas son exactas.
- IVA con redondeo *half-up*: [PricingService.php:155](../src/Services/PricingService.php#L155).
- Límites anti-desbordamiento (`MAX_IMPORTE_CENTAVOS`): se valida **antes** de multiplicar. Mira [getSubtotalPorProducto, línea 102](../src/Services/PricingService.php#L102).
- Descuento: [PricingService.php:89](../src/Services/PricingService.php#L89).

*Debes poder explicar:* por qué no `float`; qué es el redondeo half-up; por qué se compara con `intdiv(MAX, cantidad)` en vez de multiplicar y comparar.

### 2.2 PDO y consultas preparadas
- Todos los repositorios usan `prepare()` + `execute([...])`: **nunca** se concatenan valores en el SQL (evita inyección SQL).
- Para `IN (...)` con lista variable se generan los `?` a mano: [ProductoRepository::getBySkus](../src/Repositories/ProductoRepository.php).
- Conexión y opciones (`ERRMODE_EXCEPTION`, `FETCH_ASSOC`): [Database.php:13](../src/Config/Database.php#L13).

*Debes poder explicar:* qué es una inyección SQL y por qué `prepare` la evita; por qué `ERRMODE_EXCEPTION`.

### 2.3 Transacciones y bloqueos (lo más importante para una entrevista)
- Flujo completo del cobro: [CheckoutService::procesarCompra](../src/Services/CheckoutService.php#L13). Lee de arriba abajo: valida → `beginTransaction` → bloquea jornada → bloquea productos → calcula → inserta → `commit`; cualquier excepción → `rollBack` ([catch](../src/Services/CheckoutService.php#L182)).
- `SELECT ... FOR UPDATE` bloquea filas hasta el commit: [getBySkusForUpdate](../src/Repositories/ProductoRepository.php#L74). Así el precio y el stock no cambian a mitad del cobro.
- `ORDER BY id` en esas consultas: todos los procesos bloquean en el **mismo orden** → no hay *deadlocks*.
- `UPDATE ... WHERE stock >= ?` ([descontarStock](../src/Repositories/ProductoRepository.php#L181)): segunda defensa; el stock nunca queda negativo.
- Mismo patrón en [cerrar jornada](../src/Services/JornadaService.php#L42) y [cancelar venta](../src/Services/VentaService.php#L20).

*Debes poder explicar:* qué es ACID; qué hace `FOR UPDATE`; qué es un deadlock y cómo el orden de bloqueo lo evita; por qué se hace `rollBack` en el `catch` y se relanza la excepción.

### 2.4 Garantía en la base de datos: una sola jornada abierta
- [init.sql:35](../database/init.sql#L35): columna generada (`1` si abierta, `NULL` si cerrada) + índice `UNIQUE`. MySQL ignora los `NULL` en índices únicos, así que solo puede haber una fila con `1`.
- El servicio captura el error 1062 (clave duplicada): [JornadaService::abrir](../src/Services/JornadaService.php#L24).
- Hay una prueba que se salta el servicio e inserta por SQL directo: la BD igualmente lo rechaza.

*Idea para recordar:* las reglas importantes se imponen **en la base de datos**, no solo en PHP, porque PHP no ve las peticiones simultáneas.

### 2.5 API JSON y códigos HTTP
- [Api::handle](../src/Http/Api.php#L24) envuelve cada endpoint: verifica el método, ejecuta, y traduce excepciones a códigos:
  - 400 petición malformada · 404 no existe · 405 método · **409 conflicto de negocio** (stock, jornada cerrada, ya cancelada) · **422 datos inválidos** · 500 error interno (sin filtrar detalles).
- Orden de los `catch`: `PDOException` va **antes** de `RuntimeException` porque la extiende; si no, un error de BD saldría como 409.
- [Api::jsonBody](../src/Http/Api.php#L54): decodifica sin `assoc` primero para distinguir `{}` de `[]`.
- Los endpoints son delgados (10-30 líneas): validan tipos de la entrada y delegan. Ejemplo: [checkout.php](../public/api/checkout.php).
- **Regla de seguridad:** el servidor nunca confía en precios/totales del cliente; todo se recalcula ([hay una prueba](../tests/ApiTest.php) que intenta colar un precio).

*Debes poder explicar:* diferencia 409 vs 422; por qué 201 en la creación; por qué no se devuelve el mensaje de la excepción de la BD.

### 2.6 Configuración y secretos
- Credenciales en `.env` (ignorado por Git); [.env.example](../.env.example) es la plantilla. [Env.php](../src/Config/Env.php) es un lector mínimo; las variables reales del servidor tienen prioridad.
- *Debes poder explicar:* por qué no se suben credenciales a Git y cómo se configura el despliegue.

### 2.7 Pruebas
- Arnés propio y mínimo: [tests/bootstrap.php](../tests/bootstrap.php) (clase `T`). Es didáctico, pero **en un trabajo real se usa PHPUnit** (LAMPP trae `/opt/lampp/bin/phpunit`). Buen ejercicio: migrar una prueba.
- Pruebas de integración contra MySQL real: [testPdo](../tests/CheckoutServiceTest.php#L8) recrea la BD de test (con un seguro que rechaza nombres que no terminen en `_test`).
- Pruebas HTTP reales: [TestServer](../tests/ApiTest.php#L8) levanta `php -S` y hace peticiones.
- Prueba de *rollback*: se hereda el repositorio y se fuerza un fallo a mitad del proceso ([ejemplo](../tests/VentaServiceTest.php)).
- Una prueba omitida cuenta como fallo (`run.php`), para que "verde" signifique "todo se ejecutó".

## 3. Reglas de negocio que decidí por ti (REVÍSALAS MAÑANA)

Estas son decisiones de diseño. Si no te convencen, cámbialas; están aisladas y con pruebas.

| # | Decisión | Dónde | Alternativa |
|---|---|---|---|
| 1 | **Descuento:** 5 % si el total con IVA llega a 100.000 COP, aplicado sobre el total (no antes del IVA) | [PricingService](../src/Services/PricingService.php#L89) | Descontar antes del IVA (más correcto fiscalmente) exige guardar descuento por línea en `detalles_venta` (cambio de esquema) |
| 2 | **Cancelar venta** solo si su jornada sigue abierta; devuelve el stock | [VentaService](../src/Services/VentaService.php#L20) | Permitir cancelar siempre y registrar un ajuste |
| 3 | **Una sola jornada abierta**; cerrar devuelve resumen | [JornadaService](../src/Services/JornadaService.php) | Varias cajas simultáneas |
| 4 | **Reposición** máx. 100.000 por operación y 1.000.000 de stock | [ProductoService](../src/Services/ProductoService.php) | Otros límites |
| 5 | Número de venta `V-000001` (id con ceros) | [CheckoutService](../src/Services/CheckoutService.php) | Incluir fecha |
| 6 | Un archivo por endpoint, sin router ni framework | [public/api/](../public/api/) | Router único (ver README) |
| 7 | Dinero como `string` `"1234.50"` en JSON | todos | Enteros en centavos |

Notas:
- Los descuentos del `seed.sql` (1.000, 2.000, 500) son **manuales/históricos** y no siguen la regla 1; son datos de ejemplo.
- Cualquier endpoint de "administración" (reponer, activar) **no tiene autenticación**: cualquiera con acceso a la URL puede usarlo. Es aceptable para el simulador, no para producción.

## 4. Código que eliminé (estaba sin uso)
`ProductoRepository::getById`, `getSeveralById`; `JornadaRepository::findAll`, `getByRangoFechas`; `VentaRepository::getAll` (reemplazado por `getByJornadaId`). Si más adelante los necesitas, el historial de Git los conserva.

## 5. Lo que NO está hecho
- **Lógica del frontend jQuery** (catálogo, carrito, cobro). Existe el esqueleto; ver sección 7.
- **Idempotencia del checkout:** dos POST iguales crean dos ventas. Requiere una clave por intento + columna única.
- **Autenticación/roles.**
- La BD real `supermarket_simulator` necesita el `ALTER TABLE` del README (índice de jornada única) o recrearse con `init.sql` + `seed.sql`.

## 6. Autoevaluación (preguntas típicas de entrevista)
1. ¿Por qué el cobro corre dentro de una transacción? ¿Qué pasaría sin ella si falla el segundo `INSERT`?
2. ¿Qué diferencia hay entre `UPDATE ... WHERE stock >= ?` y `SELECT ... FOR UPDATE`? ¿Por qué usar ambos?
3. Dos cajeros cobran el último producto a la vez. ¿Qué ocurre, paso a paso?
4. ¿Por qué `PDOException` se captura antes que `RuntimeException`?
5. ¿Por qué el dinero se maneja en centavos enteros y qué límite evita el desbordamiento de `int`?
6. ¿Cómo se garantiza "una sola jornada abierta" aunque dos peticiones lleguen al mismo tiempo?
7. ¿Qué devuelve la API si el JSON es `[]`? ¿Y si es `{}`? ¿Por qué distinto?
8. ¿Por qué `public/` y `src/` están separados?
9. ¿Qué es una inyección SQL y dónde se previene aquí?
10. ¿Qué cambiarías para que un doble clic en "Cobrar" no cree dos ventas?

## 7. Esqueleto del frontend (punto de partida)

| Archivo | Qué es |
|---|---|
| [public/index.html](../public/index.html) | Maqueta con los contenedores (`#productos`, `#carrito`, `#form-cobro`, `#ticket`…) |
| [assets/js/api.js](../public/assets/js/api.js) | Cliente de la API con `$.ajax` y promesas (`Api.productos()`, `Api.checkout(...)`). **Léelo primero** |
| [assets/js/money.js](../public/assets/js/money.js) | Formato de moneda y conversión a centavos (misma idea que en PHP) |
| [assets/js/app.js](../public/assets/js/app.js) | Arranque: carga jornada y catálogo. Termina con la lista `TODO` en orden sugerido |
| [assets/css/styles.css](../public/assets/css/styles.css) | Estilos base |
| [docs/API_FRONTEND.md](API_FRONTEND.md) | Contrato de la API con respuestas reales |

Conceptos jQuery que vas a usar (y que te pueden preguntar):
`$(function(){})` (DOM listo) · selectores y `.text()/.prop()/.toggleClass()` · **delegación de eventos**
(`$('#productos').on('click', '.producto', fn)`, necesaria porque las tarjetas se crean dinámicamente) ·
`$.ajax` y promesas (`.done/.fail`, `$.when` para esperar varias peticiones, ver [cargarCatalogo](../public/assets/js/app.js)) ·
`JSON.stringify` + `contentType: 'application/json'` · manejo de errores por código HTTP.

Decisiones: jQuery se sirve **local** (no desde una CDN) con hash de integridad verificado;
`Api` entrega solo `data` y convierte los errores en `{status, mensaje}`;
el estado vive en un único objeto `state` y la UI se redibuja desde él.
