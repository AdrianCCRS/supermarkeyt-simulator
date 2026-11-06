# Contrato de la API (para el frontend)

Base: `api/` (relativa a `public/`). Todas las respuestas son JSON.
Los ejemplos son respuestas reales del servidor con los datos del seed.

```
éxito: {"success": true,  "data": ...}
error: {"success": false, "error": "mensaje legible"}
```

| Código | Significado | Qué hacer en la UI |
|---|---|---|
| 200 / 201 | OK / creado | usar `data` |
| 400 | petición malformada | error de programación; revisar el payload |
| 404 | no existe (venta, jornada, SKU) | avisar al usuario |
| 405 | método HTTP incorrecto | error de programación |
| **409** | **conflicto de negocio**: stock insuficiente, jornada cerrada/ya abierta, venta ya cancelada | mostrar `error`; refrescar productos/jornada |
| **422** | **datos inválidos**: efectivo insuficiente, formato de importe, cantidad | mostrar `error` junto al formulario |
| 500 | error interno | mensaje genérico |

**Importes:** siempre *texto* con dos decimales (`"2500.00"`). Se envían así y se reciben así.
**Precios y totales los calcula el servidor;** el navegador solo envía SKUs y cantidades.

## Lectura

### `GET jornada_actual.php`
```json
{"id":2,"fecha_inicio":"2026-11-05 08:00:00","fecha_fin":null,"estado":"abierta","ventas_completadas":4,"total_vendido":"68987.00"}
```
404 si no hay jornada abierta (es un estado normal: ofrecer "Abrir jornada").

### `GET categorias.php`
`[{"id":5,"nombre":"Bebidas","descripcion":"Agua, refrescos y zumos."}, ...]` (orden alfabético)

### `GET productos.php` (solo activos)
```json
{"id":1,"sku":"FRU-001","nombre":"Manzana roja 1 kg","categoria_id":1,"precio_base":"2500.00","iva_pct":"0.00","stock":78,"imagen_url":"/assets/img/icons/fru-001.png"}
```
`imagen_url` apunta a archivos que **aún no existen**; usa `assets/img/placeholder.svg` como respaldo.

### `GET ventas.php?id=9` · `GET ventas.php?jornada_id=2`
Una venta con `detalles`, o la lista de ventas de una jornada (sin detalles).

## Escritura

### `POST checkout.php` → 201
```json
// petición
{"jornada_id":2,"cliente_nombre":"Cliente 1","carrito":{"FRU-001":2,"LAC-003":1},"efectivo_recibido":"50000.00"}
// respuesta (data)
{"venta_id":9,"numero_venta":"V-000009","cliente_nombre":"Cliente 1","jornada_id":2,
 "detalles":[{"producto_id":1,"sku":"FRU-001","nombre":"Manzana roja 1 kg","cantidad":2,
   "precio_unitario":"2500.00","iva_pct":"0.00","subtotal_linea":"5000.00","iva_linea":"0.00","total_linea":"5000.00"}, ...],
 "subtotal":"9900.00","iva_total":"245.00","descuento_total":"0.00","total":"10145.00",
 "efectivo_recibido":"50000.00","cambio":"39855.00","estado":"completada"}
```
Reglas: `jornada_id` entero · `carrito` objeto `{sku: cantidad entera}` · máx. 1000 unidades por producto ·
`efectivo_recibido` texto `"0.00"` · descuento 5 % si el total llega a 100.000.
Error típico: `409 {"success":false,"error":"Stock insuficiente para: FRU-001"}`.
⚠ **No es idempotente:** deshabilita el botón mientras la petición está en curso o se creará una venta por clic.

### `POST jornada_abrir.php` → 201 (409 si ya hay una abierta)
### `POST jornada_cerrar.php` `{"jornada_id":2}` → jornada cerrada con su resumen
### `POST venta_cancelar.php` `{"venta_id":9}` → venta cancelada (devuelve el stock; solo si la jornada sigue abierta)
### `POST producto_reponer.php` `{"sku":"FRU-001","cantidad":20}` → `{"sku","nombre","stock"}`
### `POST producto_estado.php` `{"sku":"FRU-001","activo":false}` → `{"sku","nombre","activo"}`

Todas las peticiones POST llevan `Content-Type: application/json` (ya lo hace `Api` en [api.js](../public/assets/js/api.js)).
