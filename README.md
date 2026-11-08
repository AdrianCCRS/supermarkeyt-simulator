# Tiendas D2 Simulator

Simulador de supermercado en **PHP + MySQL + jQuery**, con un juego de caja registradora hecho en **Phaser 3** y pixel art propio.
Eres el tendero de «Tiendas D2» (una parodia, sin fines comerciales): los clientes llegan con sus compras, tú escaneas, pesas la fruta,
cobras en efectivo, das el cambio y, al cerrar la jornada, respondes por las pérdidas.

## Qué hace el juego

- **Caja:** arrastra los productos de la banda al escáner; la fruta y verdura se pesa y se cobra tecleando su código PLU, que buscas en el libro de la caja (12 productos en 3 páginas; flechas `<` `>` o las teclas ← →). `QTY` arma cantidades y `VOID` anula el último producto.
- **Cobro en efectivo:** `PAY`, lees los billetes del cliente en la bandeja y tecleas la suma; el backend valida el cobro y la caja da el cambio sola (billetes y monedas).
- **Responsabilidad:** si un cliente se lleva algo sin cobrar, o das de más, es pérdida y se descuenta del sueldo base al cerrar. Cobrar de más hace que el cliente proteste (−50 puntos); una venta exacta suma 100.
- **Clientes:** entran cuando abres la jornada, con un nombre aleatorio sobre la cabeza (ese nombre viaja al backend en cada venta), y se van cuando la cierras.
- **Jornada:** reloj de 08:00 a 20:00 (10 minutos reales), botón ABRIR/CERRAR, y pantalla de cierre con el resumen.
- **Catálogo:** 108 productos con nombres colombianos, precios en COP y un icono de 16×16 cada uno.
- **Pantalla grande:** botón o tecla `F`.

## Estructura

```
supermarket-simulator/
├── public/                  # Raíz web
│   ├── index.html           # Página: calle comercial + juego
│   ├── api/                 # Endpoints JSON (PHP)
│   └── assets/
│       ├── css/             # styles.css (calle), game.css (marco del juego)
│       ├── js/              # Lógica de la venta, API y juego (ver abajo)
│       └── img/             # Pixel art (tienda, caja, banda, personajes, iconos, hud, entorno)
├── src/                     # Backend: Config, Http, Repositories, Services
├── database/                # init.sql, seed.sql, productos_juego.sql, precios_cop.sql
├── tests/                   # Pruebas de PHP (run.php) y de JS (js/run.mjs)
├── tools/                   # generar_catalogo.py (catálogo, seed y SQL)
├── assets-src/              # Fuentes de Aseprite, scripts de dibujo y previews
└── docs/                    # Documentación (ver índice abajo)
```

### Frontend

| Archivo | Para qué |
|---|---|
| `app.js` | Conecta la API con el juego: catálogo, jornada (abrir/cerrar) y cobro |
| `api.js` | Cliente de la API (promesas de jQuery) |
| `money.js`, `pricing.js`, `venta.js`, `auditoria.js`, `cobro.js`, `compra.js`, `reloj.js`, `nombres.js` | Lógica pura del juego, sin Phaser (con pruebas) |
| `phaser/` | Escenas del juego: `CheckoutScene` (caja), `HudScene` (menú), `ControlJornada`, `config.js` (`Juego`), `assets.js` |
| `pantalla.js` | Modo pantalla grande |

El juego no hace peticiones: `app.js` le entrega datos y funciones (`Juego.setCatalogo`, `setJornada`, `setJornadaHooks`, `setCobrador`).
Detalle de esos ganchos en [docs/CONEXION_BACKEND.md](docs/CONEXION_BACKEND.md).

## Instalación

Requisitos: PHP 8.2+ con `pdo_mysql` y `mbstring`, MySQL/MariaDB (por ejemplo XAMPP/LAMPP), Node.js 18+ para las pruebas de JS.

1. Configura el entorno: copia `.env.example` a `.env` y rellena `DB_USER` y `DB_PASS`. `.env` no se sube a git; en producción define las mismas variables en el servidor.
2. Crea la base y los datos:

   ```bash
   mysql -u USUARIO -p < database/init.sql
   mysql -u USUARIO -p < database/seed.sql      # ATENCIÓN: hace TRUNCATE de todas las tablas
   ```

   Para una base que ya tienes, sin borrar nada: `database/productos_juego.sql` (catálogo, nombres e imágenes) y `database/precios_cop.sql` (precios e IVA).
3. Arranca el servidor (con el PHP que tenga `pdo_mysql`, por ejemplo el de LAMPP):

   ```bash
   /opt/lampp/bin/php -S localhost:8000 -t public
   ```

   y abre `http://localhost:8000`. Pulsa ABRIR para empezar una jornada.

## API

Respuesta: `{"success": true, "data": ...}` o `{"success": false, "error": "..."}`.
Códigos: 400 petición malformada, 404 no encontrado, 405 método, 409 conflicto de negocio (stock, jornada cerrada),
422 datos inválidos, 500 error interno. Los precios y totales se calculan siempre en el servidor.

| Método | Endpoint | Descripción |
| --- | --- | --- |
| GET | `/api/productos.php` | Productos activos con su stock e `imagen_url` |
| GET | `/api/categorias.php` | Categorías |
| POST | `/api/checkout.php` | Procesa un cobro (201): `{jornada_id, cliente_nombre, carrito, efectivo_recibido}` |
| GET | `/api/ventas.php?id=1` | Una venta con sus detalles |
| GET | `/api/ventas.php?jornada_id=2` | Ventas de una jornada |
| POST | `/api/venta_cancelar.php` | Cancela una venta y devuelve el stock: `{venta_id}` |
| GET | `/api/jornada_actual.php` | Jornada abierta con su resumen (404 si no hay) |
| POST | `/api/jornada_abrir.php` | Abre una jornada (201; 409 si ya hay una abierta) |
| POST | `/api/jornada_cerrar.php` | Cierra la jornada: `{jornada_id, faltantes?, sobrantes?, perdida?, sobrecobro?}` |
| POST | `/api/producto_reponer.php` | Suma stock: `{sku, cantidad}` |
| POST | `/api/producto_estado.php` | Activa o desactiva un producto: `{sku, activo}` |

```bash
curl -X POST localhost:8000/api/checkout.php -H 'Content-Type: application/json' \
  -d '{"jornada_id":2,"cliente_nombre":"Cliente","carrito":{"FRU-002":2,"BEB-002":1},"efectivo_recibido":"20000.00"}'
```

Cierre de jornada: `faltantes` descuenta stock (mínimo 0), `sobrantes` lo repone (máximo 1.000.000) y `perdida` / `sobrecobro`
(texto con hasta 2 decimales) quedan guardados en la jornada. Contrato completo con ejemplos: [docs/API_FRONTEND.md](docs/API_FRONTEND.md).

Las tarifas de IVA (0, 5 y 19 %) son **ficticias**, solo para la simulación.

## Pruebas

```bash
node tests/js/run.mjs     # 357 comprobaciones; compara 300 cestas aleatorias contra el PricingService real de PHP
php tests/run.php         # 61 pruebas; requiere pdo_mysql y mbstring
```

Las pruebas de integración de PHP usan una base aparte (`DB_NAME_TEST`, por defecto `supermarket_simulator_test`; debe terminar en `_test`)
que se recrea en cada ejecución. Las pruebas omitidas cuentan como fallo salvo con `--allow-skip`.

### Migrar una base ya creada

```sql
-- Una sola jornada abierta a la vez
ALTER TABLE jornadas
  ADD COLUMN abierta_unica TINYINT GENERATED ALWAYS AS (IF(estado = 'abierta', 1, NULL)) STORED,
  ADD UNIQUE KEY uq_jornada_abierta (abierta_unica);

-- Pérdidas y sobrecobros guardados al cerrar la jornada
ALTER TABLE jornadas
  ADD COLUMN perdida_total DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (perdida_total >= 0),
  ADD COLUMN sobrecobro_total DECIMAL(12, 2) NOT NULL DEFAULT 0 CHECK (sobrecobro_total >= 0);
```

## Catálogo y arte

- El catálogo se regenera con `python3 tools/generar_catalogo.py` (copia los iconos, escribe `productos_juego.sql`, `precios_cop.sql` y `seed.sql`, y actualiza `assets.js`). Los precios están en un solo bloque, `PRECIOS`.
- El arte propio se dibuja con Aseprite; las fuentes (`.aseprite`), los scripts y las previews están en `assets-src/`. Reglas y medidas: [docs/ARTE.md](docs/ARTE.md).
- Créditos y licencias: [CREDITS.md](CREDITS.md). La marca «Tiendas D2» es una parodia sin fines comerciales de una marca existente.

## Documentación

| Documento | Contenido |
|---|---|
| [docs/CONEXION_BACKEND.md](docs/CONEXION_BACKEND.md) | Cómo conectar el juego con la API (ganchos de `Juego`) |
| [docs/API_FRONTEND.md](docs/API_FRONTEND.md) | Contrato de la API con ejemplos reales |
| [docs/MECANICA_PAGO.md](docs/MECANICA_PAGO.md) | Flujo del cobro en efectivo y del cliente |
| [docs/CIERRE_JORNADA.md](docs/CIERRE_JORNADA.md) | Pérdidas del tendero y cierre de jornada |
| [docs/PLAN_JUEGO.md](docs/PLAN_JUEGO.md) | Plan y decisiones de diseño del juego |
| [docs/ARTE.md](docs/ARTE.md), [docs/ASSETS_IA.md](docs/ASSETS_IA.md) | Reglas y medidas del arte |
| [docs/GUIA_DE_ESTUDIO.md](docs/GUIA_DE_ESTUDIO.md) | Guía de estudio del proyecto |

## Pendiente

Puntos y sueldo por jornada (tabla de jugador), paciencia del cliente, sonido, otros medios de pago.
