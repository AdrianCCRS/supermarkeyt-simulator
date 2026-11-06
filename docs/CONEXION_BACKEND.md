# Conectar el juego con el backend PHP (guía para hacerlo a mano)

El juego no llama a la API. Todo entra por **cuatro puntos** de `Juego` (`public/assets/js/phaser/config.js`).
Los archivos a tocar son solo `app.js` y, si quieres, `api.js`. No hace falta tocar `CheckoutScene.js`.

| Archivo | Qué haces ahí |
|---|---|
| `public/assets/js/app.js` | Llamar a `Api.*` y pasarle los resultados al juego (`Juego.set…`) |
| `public/assets/js/api.js` | Ya tiene todo lo que hace falta (`productos`, `jornadaActual`, `abrirJornada`, `checkout`…) |
| `public/api/*.php` | Tu backend (no se tocó) |

## Puntos de conexión (orden recomendado)

### 1. Catálogo (ya conectado)
`app.js → cargarCatalogo()` ya hace `Juego.setCatalogo(productos)` con lo que devuelve `productos.php`.
Con eso el juego usa tus precios e IVA reales y genera compras con tus SKU.
- **Carrera de arranque:** `Juego.iniciar()` se llama antes de que llegue el catálogo, así que el primer cliente puede salir con los datos de demostración. Solución: llamar a `Juego.iniciar()` dentro del `.done` de `cargarCatalogo()` (o tras cargarlo).
- **Stock:** el generador de compras no mira `stock`. Si un cliente pide más de lo que hay, `checkout.php` responde 409. Filtra en `setCatalogo` (`productos.filter(p => p.stock > 0)`) o aporta tu propio generador (punto 4).

### 2. Cobro → `checkout.php` (el importante)
```js
Juego.setCobrador(({ carrito, efectivo }) =>
    Api.checkout(state.jornada.id, 'Cliente', carrito, Money.fromCents(efectivo))
        .then((v) => ({ total: Money.toCents(v.total), cambio: Money.toCents(v.cambio) })));
```
- Entrada: `carrito` = `{sku: cantidad}` (fruta en kg) y `efectivo` en **centavos** → `Api.checkout` lo quiere en texto `"50000.00"` (`Money.fromCents`).
- Salida: promesa que resuelve `{total, cambio}` en **centavos** (`Money.toCents`), o rechaza con `{status, mensaje}` (lo que ya rechaza `Api`).
- El juego reacciona solo: `422` → «FALTAN $x» y se puede reintentar; `409`/otro → «ERROR» y no se cobra.
- Mientras la petición está en curso el teclado se bloquea (checkout no es idempotente).
- **Qué número manda:** si el `total` del backend difiere del que calculó el juego (`pricing.js`, que replica `PricingService`), el juego usa el **del backend**. Mientras tanto, `node tests/js/run.mjs` compara 300 cestas contra el PHP real, así que no deberían diferir.

Necesitas una jornada abierta: `cargarJornada()` ya guarda `state.jornada`. Mientras no la haya, `state.jornada.id` fallará: abre la jornada antes (`Api.abrirJornada()`) o deja el cobrador local hasta entonces.

### 3. Resumen de jornada → cierre
`Juego.resumenJornada()` devuelve (importes en **centavos**) el resumen de pérdidas, protestas y puntos: `{sueldo_base, sueldo, descuento, …}`. Úsalo cuando implementes el cierre (`Api.cerrarJornada`). La especificación de lo que el backend debería guardar (faltantes/sobrantes) está en `docs/CIERRE_JORNADA.md`. Hasta entonces las pérdidas viven solo en memoria del navegador.

### 4. Compras de los clientes (opcional)
Por defecto salen al azar con el catálogo (`compra.js`). Para que las dicte el backend:
```js
Juego.setGeneradorCompras(() => ({ 'LAC-002': 2, 'FRU-001': 1 }));   // {sku: cantidad}, fruta en kg
```
Se llama de forma **síncrona** cada vez que llega un cliente: precarga las compras en un array y ve sacándolas.

## Catálogo en la base de datos
Los 108 productos (con su `imagen_url` = `/assets/img/icons/<sku>.png`) se cargan con `database/productos_juego.sql` (no destructivo) y los precios en pesos de los 20 primeros con `database/precios_cop.sql`. Se regeneran con `python3 tools/generar_catalogo.py`.
Solo manzana, banano y tomate se pesan (PLU); el resto de frutas y verduras se venden empacadas con código de barras.
**PHP:** usa el de XAMPP/LAMPP (`/opt/lampp/bin/php -S localhost:8124 -t public`): el del sistema no trae `pdo_mysql`.

## Qué probar al conectar
1. Recarga: sin banner de error rojo, el catálogo carga y los precios de la caja son los de la base de datos.
2. Un cobro normal: PAY → teclear la suma de los billetes → PAY. Debe salir el recibo y el cambio. Compruébalo en la tabla `ventas`.
3. Teclear de menos → «FALTAN $x» y **no** aparece venta.
4. Cobro con la jornada cerrada → «ERROR 409».
5. Stock: tras unas ventas, `productos.php` debe mostrar el stock reducido.
6. `node tests/js/run.mjs` sigue en verde (precios JS = PHP).

## Qué NO se conecta todavía
Jornada (abrir/cerrar), tiempo, sonido y cierre de caja: se dejan para después.
