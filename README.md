# Supermarket Simulator

PHP + jQuery supermarket simulator.

## Structure

```
supermarket-simulator/
├── public/          # Web root (index.php, API endpoints, assets)
│   ├── api/
│   └── assets/
│       ├── css/
│       ├── js/
│       └── img/
├── src/             # Application code
│   ├── Config/
│   ├── Repositories/
│   └── Services/
├── database/
├── tests/
└── README.md
```

## Configuration

Copy `.env.example` to `.env` and fill in your database credentials.
`.env` is git-ignored — never commit it. In production, set the same
variables (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASS`) as
environment variables on the host.

## API

Servidor local: `php -S localhost:8000 -t public`

| Método | Endpoint | Descripción |
| --- | --- | --- |
| GET | `/api/productos.php` | Productos activos |
| POST | `/api/checkout.php` | Procesa un cobro (201) |
| GET | `/api/ventas.php?id=1` | Venta con sus detalles |
| GET | `/api/jornada_actual.php` | Jornada abierta con resumen (404 si no hay) |
| POST | `/api/jornada_abrir.php` | Abre una jornada (201; 409 si ya hay una abierta) |
| POST | `/api/jornada_cerrar.php` | Cierra la jornada `{"jornada_id": N}` y devuelve el resumen |

Respuesta: `{"success": true, "data": ...}` o `{"success": false, "error": "..."}`.
Códigos: 400 petición malformada, 404 no encontrado, 405 método, 409 conflicto
de negocio (stock, jornada cerrada), 422 datos inválidos, 500 error interno.

```bash
curl -X POST localhost:8000/api/checkout.php -H 'Content-Type: application/json' \
  -d '{"jornada_id":2,"cliente_nombre":"Cliente 1","carrito":{"FRU-001":2,"LAC-001":1},"efectivo_recibido":"50000.00"}'
```

Los precios y totales se calculan siempre en el servidor.

## Pruebas

`php tests/run.php` (requiere `pdo_mysql` y `mbstring`). Las pruebas de
integración usan una base aparte (`DB_NAME_TEST`, por defecto
`supermarket_simulator_test`; debe terminar en `_test`) que se recrea en cada
ejecución. Las pruebas omitidas cuentan como fallo salvo con `--allow-skip`.

### Migrar una BD existente (jornadas)

`init.sql` ahora impone una sola jornada abierta. En una base ya creada:

```sql
ALTER TABLE jornadas
  ADD COLUMN abierta_unica TINYINT GENERATED ALWAYS AS (IF(estado = 'abierta', 1, NULL)) STORED,
  ADD UNIQUE KEY uq_jornada_abierta (abierta_unica);
```
