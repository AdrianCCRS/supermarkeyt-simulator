-- Datos de prueba (ficticios). Importes en pesos colombianos (COP).
-- Las tarifas de IVA (0 %, 5 % y 19 %) son ficticias y solo sirven para pruebas.
-- El stock ya tiene descontadas las unidades de las ventas 'completada'
-- cargadas abajo (las 'cancelada' no descuentan inventario).
-- ATENCION: este script hace TRUNCATE; no lo ejecutes sobre datos que quieras conservar.

USE supermarket_simulator;

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE detalles_venta;
TRUNCATE TABLE ventas;
TRUNCATE TABLE jornadas;
TRUNCATE TABLE productos;
TRUNCATE TABLE categorias;
SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO categorias (id, nombre, descripcion) VALUES
    (1, 'Frutas y verduras', 'Productos frescos de origen vegetal.'),
    (2, 'Lacteos', 'Leche, yogures y derivados lacteos.'),
    (3, 'Carnes y pescados', 'Carnes, pescados y productos refrigerados.'),
    (4, 'Despensa', 'Alimentos secos y productos de consumo habitual.'),
    (5, 'Bebidas', 'Agua, gaseosas y jugos.'),
    (6, 'Panaderia', 'Pan y productos de panaderia.'),
    (7, 'Limpieza', 'Productos para la limpieza del hogar.'),
    (8, 'Higiene personal', 'Productos de cuidado e higiene personal.');


INSERT INTO productos
    (id, sku, nombre, categoria_id, precio_base, iva_pct, stock, imagen_url, is_active)
VALUES
    (1, 'FRU-001', 'Manzana roja 1 kg', 1, 2500.00, 0.00, 78, '/assets/img/icons/fru-001.png', TRUE),
    (2, 'FRU-002', 'Banano 1 kg', 1, 1800.00, 0.00, 63, '/assets/img/icons/fru-002.png', TRUE),
    (3, 'FRU-003', 'Tomate chonto 1 kg', 1, 2300.00, 0.00, 54, '/assets/img/icons/fru-003.png', TRUE),
    (4, 'LAC-001', 'Leche entera 1 L', 2, 1150.00, 0.00, 96, '/assets/img/icons/lac-001.png', TRUE),
    (5, 'LAC-002', 'Yogur natural pack x4', 2, 2350.00, 0.00, 46, '/assets/img/icons/lac-002.png', TRUE),
    (6, 'LAC-003', 'Queso campesino 250 g', 2, 4900.00, 5.00, 29, '/assets/img/icons/lac-003.png', TRUE),
    (7, 'CAR-001', 'Pechuga de pollo 500 g', 3, 5750.00, 5.00, 34, '/assets/img/icons/car-001.png', TRUE),
    (8, 'CAR-002', 'Carne molida de res 500 g', 3, 6400.00, 5.00, 28, '/assets/img/icons/car-002.png', TRUE),
    (9, 'CAR-003', 'Lomo de cerdo 300 g', 3, 8950.00, 5.00, 17, '/assets/img/icons/car-003.png', TRUE),
    (10, 'DES-001', 'Arroz blanco 1 kg', 4, 1950.00, 5.00, 73, '/assets/img/icons/des-001.png', TRUE),
    (11, 'DES-002', 'Frijol cargamanto 500 g', 4, 1250.00, 5.00, 86, '/assets/img/icons/des-002.png', TRUE),
    (12, 'DES-003', 'Aceite de oliva 1 L', 4, 7800.00, 5.00, 23, '/assets/img/icons/des-003.png', TRUE),
    (13, 'BEB-001', 'Agua en botella 1,5 L', 5, 750.00, 5.00, 116, '/assets/img/icons/beb-001.png', TRUE),
    (14, 'BEB-002', 'Gaseosa cola 350 ml (lata)', 5, 2100.00, 19.00, 58, '/assets/img/icons/beb-002.png', TRUE),
    (15, 'BEB-003', 'Jugo de naranja 1 L', 5, 2650.00, 5.00, 40, '/assets/img/icons/beb-003.png', TRUE),
    (16, 'PAN-001', 'Pan campesino 500 g', 6, 2200.00, 5.00, 48, '/assets/img/icons/pan-001.png', TRUE),
    (17, 'PAN-002', 'Baguette', 6, 950.00, 0.00, 66, '/assets/img/icons/pan-002.png', TRUE),
    (18, 'LIM-001', 'Detergente liquido 2 L', 7, 6500.00, 19.00, 30, '/assets/img/icons/lim-001.png', TRUE),
    (19, 'LIM-002', 'Papel higienico 3 rollos', 7, 3400.00, 19.00, 44, '/assets/img/icons/lim-002.png', TRUE),
    (20, 'HIG-001', 'Champu 750 ml', 8, 3150.00, 19.00, 36, '/assets/img/icons/hig-001.png', TRUE);

INSERT INTO jornadas (id, fecha_inicio, fecha_fin, estado) VALUES
    (1, '2026-11-03 08:00:00', '2026-11-03 20:00:00', 'cerrada'),
    (2, '2026-11-05 08:00:00', NULL, 'abierta');


INSERT INTO ventas
    (id, numero_venta, cliente_nombre, subtotal, iva_total, descuento_total, total,
     efectivo_recibido, cambio, fecha_hora, estado, jornada_id)
VALUES
    (1, 'V-000001', 'Ana Garcia', 12400.00, 208.00, 0.00, 12608.00, 15000.00, 2392.00, '2026-11-03 09:14:00', 'completada', 1),
    (2, 'V-000002', 'Luis Martin', 19150.00, 1352.00, 1000.00, 19502.00, 20000.00, 498.00, '2026-11-03 10:37:00', 'completada', 1),
    (3, 'V-000003', 'Marta Lopez', 10800.00, 258.00, 0.00, 11058.00, 15000.00, 3942.00, '2026-11-03 12:05:00', 'completada', 1),
    (4, 'V-000004', 'Carlos Ruiz', 11900.00, 1365.00, 0.00, 13265.00, 0.00, 0.00, '2026-11-03 18:46:00', 'cancelada', 1),
    (5, 'V-000005', 'Sofia Perez', 25900.00, 2206.00, 2000.00, 26106.00, 30000.00, 3894.00, '2026-11-05 08:52:00', 'completada', 2),
    (6, 'V-000006', 'Diego Sanchez', 15750.00, 445.00, 0.00, 16195.00, 20000.00, 3805.00, '2026-11-05 09:28:00', 'completada', 2),
    (7, 'V-000007', 'Laura Torres', 13850.00, 2632.00, 0.00, 16482.00, 20000.00, 3518.00, '2026-11-05 10:16:00', 'completada', 2),
    (8, 'V-000008', 'Pedro Navarro', 9850.00, 854.00, 500.00, 10204.00, 15000.00, 4796.00, '2026-11-05 11:03:00', 'completada', 2);

INSERT INTO detalles_venta
    (venta_id, producto_id, cantidad, precio_unitario, iva_pct, subtotal_linea, iva_linea, total_linea)
VALUES
    (1, 1, 2, 2500.00, 0.00, 5000.00, 0.00, 5000.00),
    (1, 4, 2, 1150.00, 0.00, 2300.00, 0.00, 2300.00),
    (1, 10, 1, 1950.00, 5.00, 1950.00, 98.00, 2048.00),
    (1, 16, 1, 2200.00, 5.00, 2200.00, 110.00, 2310.00),
    (1, 17, 1, 950.00, 0.00, 950.00, 0.00, 950.00),
    (2, 7, 1, 5750.00, 5.00, 5750.00, 288.00, 6038.00),
    (2, 12, 1, 7800.00, 5.00, 7800.00, 390.00, 8190.00),
    (2, 13, 2, 750.00, 5.00, 1500.00, 75.00, 1575.00),
    (2, 17, 1, 950.00, 0.00, 950.00, 0.00, 950.00),
    (2, 20, 1, 3150.00, 19.00, 3150.00, 599.00, 3749.00),
    (3, 5, 2, 2350.00, 0.00, 4700.00, 0.00, 4700.00),
    (3, 11, 2, 1250.00, 5.00, 2500.00, 125.00, 2625.00),
    (3, 15, 1, 2650.00, 5.00, 2650.00, 133.00, 2783.00),
    (3, 17, 1, 950.00, 0.00, 950.00, 0.00, 950.00),
    (4, 8, 1, 6400.00, 5.00, 6400.00, 320.00, 6720.00),
    (4, 14, 1, 2100.00, 19.00, 2100.00, 399.00, 2499.00),
    (4, 19, 1, 3400.00, 19.00, 3400.00, 646.00, 4046.00),
    (5, 9, 1, 8950.00, 5.00, 8950.00, 448.00, 9398.00),
    (5, 12, 1, 7800.00, 5.00, 7800.00, 390.00, 8190.00),
    (5, 15, 1, 2650.00, 5.00, 2650.00, 133.00, 2783.00),
    (5, 18, 1, 6500.00, 19.00, 6500.00, 1235.00, 7735.00),
    (6, 2, 2, 1800.00, 0.00, 3600.00, 0.00, 3600.00),
    (6, 3, 1, 2300.00, 0.00, 2300.00, 0.00, 2300.00),
    (6, 6, 1, 4900.00, 5.00, 4900.00, 245.00, 5145.00),
    (6, 11, 2, 1250.00, 5.00, 2500.00, 125.00, 2625.00),
    (6, 13, 2, 750.00, 5.00, 1500.00, 75.00, 1575.00),
    (6, 17, 1, 950.00, 0.00, 950.00, 0.00, 950.00),
    (7, 14, 2, 2100.00, 19.00, 4200.00, 798.00, 4998.00),
    (7, 18, 1, 6500.00, 19.00, 6500.00, 1235.00, 7735.00),
    (7, 20, 1, 3150.00, 19.00, 3150.00, 599.00, 3749.00),
    (8, 4, 2, 1150.00, 0.00, 2300.00, 0.00, 2300.00),
    (8, 10, 1, 1950.00, 5.00, 1950.00, 98.00, 2048.00),
    (8, 16, 1, 2200.00, 5.00, 2200.00, 110.00, 2310.00),
    (8, 19, 1, 3400.00, 19.00, 3400.00, 646.00, 4046.00);
