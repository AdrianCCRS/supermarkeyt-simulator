-- Lleva los PRECIOS e IVA de los 20 productos del juego a pesos colombianos (los del seed).
-- Solo cambia precio_base e iva_pct de esos SKU: no toca stock, ni ventas ni detalles (guardan su propio precio historico).
-- Idempotente. Uso:  mysql -u USUARIO -p supermarket_simulator < database/precios_cop.sql

USE supermarket_simulator;

UPDATE productos SET precio_base = 2500.00, iva_pct = 0.00 WHERE sku = 'FRU-001';
UPDATE productos SET precio_base = 1800.00, iva_pct = 0.00 WHERE sku = 'FRU-002';
UPDATE productos SET precio_base = 2300.00, iva_pct = 0.00 WHERE sku = 'FRU-003';
UPDATE productos SET precio_base = 1150.00, iva_pct = 0.00 WHERE sku = 'LAC-001';
UPDATE productos SET precio_base = 2350.00, iva_pct = 0.00 WHERE sku = 'LAC-002';
UPDATE productos SET precio_base = 4900.00, iva_pct = 5.00 WHERE sku = 'LAC-003';
UPDATE productos SET precio_base = 5750.00, iva_pct = 5.00 WHERE sku = 'CAR-001';
UPDATE productos SET precio_base = 6400.00, iva_pct = 5.00 WHERE sku = 'CAR-002';
UPDATE productos SET precio_base = 8950.00, iva_pct = 5.00 WHERE sku = 'CAR-003';
UPDATE productos SET precio_base = 1950.00, iva_pct = 5.00 WHERE sku = 'DES-001';
UPDATE productos SET precio_base = 1250.00, iva_pct = 5.00 WHERE sku = 'DES-002';
UPDATE productos SET precio_base = 7800.00, iva_pct = 5.00 WHERE sku = 'DES-003';
UPDATE productos SET precio_base = 750.00, iva_pct = 5.00 WHERE sku = 'BEB-001';
UPDATE productos SET precio_base = 2100.00, iva_pct = 19.00 WHERE sku = 'BEB-002';
UPDATE productos SET precio_base = 2650.00, iva_pct = 5.00 WHERE sku = 'BEB-003';
UPDATE productos SET precio_base = 2200.00, iva_pct = 5.00 WHERE sku = 'PAN-001';
UPDATE productos SET precio_base = 950.00, iva_pct = 0.00 WHERE sku = 'PAN-002';
UPDATE productos SET precio_base = 6500.00, iva_pct = 19.00 WHERE sku = 'LIM-001';
UPDATE productos SET precio_base = 3400.00, iva_pct = 19.00 WHERE sku = 'LIM-002';
UPDATE productos SET precio_base = 3150.00, iva_pct = 19.00 WHERE sku = 'HIG-001';
