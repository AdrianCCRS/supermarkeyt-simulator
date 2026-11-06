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
    (5, 'Bebidas', 'Agua, refrescos y zumos.'),
    (6, 'Panaderia', 'Pan y productos de panaderia.'),
    (7, 'Limpieza', 'Productos para la limpieza del hogar.'),
    (8, 'Higiene personal', 'Productos de cuidado e higiene personal.');

INSERT INTO productos
    (id, sku, nombre, categoria_id, precio_base, iva_pct, stock, imagen_url, is_active)
VALUES
    (1, 'FRU-001', 'Manzanas rojas 1 kg', 1, 2.49, 4.00, 80, '/assets/img/manzanas.jpg', TRUE),
    (2, 'FRU-002', 'Bananas 1 kg', 1, 1.79, 4.00, 65, '/assets/img/bananas.jpg', TRUE),
    (3, 'FRU-003', 'Tomates 1 kg', 1, 2.29, 4.00, 55, '/assets/img/tomates.jpg', TRUE),
    (4, 'LAC-001', 'Leche entera 1 L', 2, 1.15, 4.00, 100, '/assets/img/leche.jpg', TRUE),
    (5, 'LAC-002', 'Yogur natural pack 4', 2, 2.35, 4.00, 48, '/assets/img/yogur.jpg', TRUE),
    (6, 'LAC-003', 'Queso manchego 250 g', 2, 4.90, 10.00, 30, '/assets/img/queso.jpg', TRUE),
    (7, 'CAR-001', 'Pechuga de pollo 500 g', 3, 5.75, 10.00, 35, '/assets/img/pollo.jpg', TRUE),
    (8, 'CAR-002', 'Carne molida 500 g', 3, 6.40, 10.00, 28, '/assets/img/carne-molida.jpg', TRUE),
    (9, 'CAR-003', 'Filete de salmon 300 g', 3, 8.95, 10.00, 18, '/assets/img/salmon.jpg', TRUE),
    (10, 'DES-001', 'Arroz blanco 1 kg', 4, 1.95, 10.00, 75, '/assets/img/arroz.jpg', TRUE),
    (11, 'DES-002', 'Pasta espagueti 500 g', 4, 1.25, 10.00, 90, '/assets/img/pasta.jpg', TRUE),
    (12, 'DES-003', 'Aceite de oliva 1 L', 4, 7.80, 10.00, 25, '/assets/img/aceite.jpg', TRUE),
    (13, 'BEB-001', 'Agua mineral 1.5 L', 5, 0.75, 10.00, 120, '/assets/img/agua.jpg', TRUE),
    (14, 'BEB-002', 'Refresco de cola 2 L', 5, 2.10, 21.00, 60, '/assets/img/refresco.jpg', TRUE),
    (15, 'BEB-003', 'Zumo de naranja 1 L', 5, 2.65, 10.00, 42, '/assets/img/zumo.jpg', TRUE),
    (16, 'PAN-001', 'Pan de molde  bimbo 500 g', 6, 2.20, 10.00, 50, '/assets/img/pan-molde.jpg', TRUE),
    (17, 'PAN-002', 'Barra de pan', 6, 0.95, 4.00, 70, '/assets/img/barra-pan.jpg', TRUE),
    (18, 'LIM-001', 'Detergente liquido 2 L', 7, 6.50, 21.00, 32, '/assets/img/detergente.jpg', TRUE),
    (19, 'LIM-002', 'Papel de cocina 3 rollos', 7, 3.40, 21.00, 45, '/assets/img/papel-cocina.jpg', TRUE),
    (20, 'HIG-001', 'Gel de ducha 750 ml', 8, 3.15, 21.00, 38, '/assets/img/gel-ducha.jpg', TRUE);

INSERT INTO jornadas (id, fecha_inicio, fecha_fin, estado) VALUES
    (1, '2026-11-03 08:00:00', '2026-11-03 20:00:00', 'cerrada'),
    (2, '2026-11-05 08:00:00', NULL, 'abierta');

INSERT INTO ventas
    (id, numero_venta, cliente_nombre, subtotal, iva_total, descuento_total, total,
     efectivo_recibido, cambio, fecha_hora, estado, jornada_id)
VALUES
    (1, 'V-20261103-0001', 'Ana Garcia', 12.38, 0.75, 0.00, 13.13, 20.00, 6.87, '2026-11-03 09:14:00', 'completada', 1),
    (2, 'V-20261103-0002', 'Luis Martin', 19.15, 2.21, 1.00, 20.36, 25.00, 4.64, '2026-11-03 10:37:00', 'completada', 1),
    (3, 'V-20261103-0003', 'Marta Lopez', 10.80, 0.75, 0.00, 11.55, 15.00, 3.45, '2026-11-03 12:05:00', 'completada', 1),
    (4, 'V-20261103-0004', 'Carlos Ruiz', 11.90, 1.79, 0.00, 13.69, 0.00, 0.00, '2026-11-03 18:46:00', 'cancelada', 1),
    (5, 'V-20261105-0001', 'Sofia Perez', 25.90, 3.32, 2.00, 27.22, 30.00, 2.78, '2026-11-05 08:52:00', 'completada', 2),
    (6, 'V-20261105-0002', 'Diego Sanchez', 15.72, 1.16, 0.00, 16.88, 20.00, 3.12, '2026-11-05 09:28:00', 'completada', 2),
    (7, 'V-20261105-0003', 'Laura Torres', 13.85, 2.91, 0.00, 16.76, 20.00, 3.24, '2026-11-05 10:16:00', 'completada', 2),
    (8, 'V-20261105-0004', 'Pedro Navarro', 9.85, 1.22, 0.50, 10.57, 15.00, 4.43, '2026-11-05 11:03:00', 'completada', 2);

INSERT INTO detalles_venta
    (venta_id, producto_id, cantidad, precio_unitario, iva_pct, subtotal_linea, iva_linea, total_linea)
VALUES
    (1, 1, 2, 2.49, 4.00, 4.98, 0.20, 5.18),
    (1, 4, 2, 1.15, 4.00, 2.30, 0.09, 2.39),
    (1, 10, 1, 1.95, 10.00, 1.95, 0.20, 2.15),
    (1, 16, 1, 2.20, 10.00, 2.20, 0.22, 2.42),
    (1, 17, 1, 0.95, 4.00, 0.95, 0.04, 0.99),
    (2, 7, 1, 5.75, 10.00, 5.75, 0.58, 6.33),
    (2, 12, 1, 7.80, 10.00, 7.80, 0.78, 8.58),
    (2, 13, 2, 0.75, 10.00, 1.50, 0.15, 1.65),
    (2, 17, 1, 0.95, 4.00, 0.95, 0.04, 0.99),
    (2, 20, 1, 3.15, 21.00, 3.15, 0.66, 3.81),
    (3, 5, 2, 2.35, 4.00, 4.70, 0.19, 4.89),
    (3, 11, 2, 1.25, 10.00, 2.50, 0.25, 2.75),
    (3, 15, 1, 2.65, 10.00, 2.65, 0.27, 2.92),
    (3, 17, 1, 0.95, 4.00, 0.95, 0.04, 0.99),
    (4, 8, 1, 6.40, 10.00, 6.40, 0.64, 7.04),
    (4, 14, 1, 2.10, 21.00, 2.10, 0.44, 2.54),
    (4, 19, 1, 3.40, 21.00, 3.40, 0.71, 4.11),
    (5, 9, 1, 8.95, 10.00, 8.95, 0.90, 9.85),
    (5, 12, 1, 7.80, 10.00, 7.80, 0.78, 8.58),
    (5, 15, 1, 2.65, 10.00, 2.65, 0.27, 2.92),
    (5, 18, 1, 6.50, 21.00, 6.50, 1.37, 7.87),
    (6, 2, 2, 1.79, 4.00, 3.58, 0.14, 3.72),
    (6, 3, 1, 2.29, 4.00, 2.29, 0.09, 2.38),
    (6, 6, 1, 4.90, 10.00, 4.90, 0.49, 5.39),
    (6, 11, 2, 1.25, 10.00, 2.50, 0.25, 2.75),
    (6, 13, 2, 0.75, 10.00, 1.50, 0.15, 1.65),
    (6, 17, 1, 0.95, 4.00, 0.95, 0.04, 0.99),
    (7, 14, 2, 2.10, 21.00, 4.20, 0.88, 5.08),
    (7, 18, 1, 6.50, 21.00, 6.50, 1.37, 7.87),
    (7, 20, 1, 3.15, 21.00, 3.15, 0.66, 3.81),
    (8, 4, 2, 1.15, 4.00, 2.30, 0.09, 2.39),
    (8, 10, 1, 1.95, 10.00, 1.95, 0.20, 2.15),
    (8, 16, 1, 2.20, 10.00, 2.20, 0.22, 2.42),
    (8, 19, 1, 3.40, 21.00, 3.40, 0.71, 4.11);
