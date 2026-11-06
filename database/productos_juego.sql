-- Productos del juego con nombres colombianos y su asset (icono 16x16 en public/assets/img/icons/).
-- NO destructivo: crea las categorias y los productos que falten y ACTUALIZA nombre e imagen de los que ya existan
-- (por SKU). No toca precios ni stock existentes, ni ventas. Se puede ejecutar varias veces.
-- Uso:  mysql -u USUARIO -p < database/productos_juego.sql

USE supermarket_simulator;

INSERT INTO categorias (id, nombre, descripcion) VALUES
    (1, 'Frutas y verduras', 'Productos frescos de origen vegetal.'),
    (2, 'Lacteos', 'Leche, yogures y derivados lacteos.'),
    (3, 'Carnes y pescados', 'Carnes, pescados y productos refrigerados.'),
    (4, 'Despensa', 'Alimentos secos y productos de consumo habitual.'),
    (5, 'Bebidas', 'Agua, gaseosas y jugos.'),
    (6, 'Panaderia', 'Pan y productos de panaderia.'),
    (7, 'Limpieza', 'Productos para la limpieza del hogar.'),
    (8, 'Higiene personal', 'Productos de cuidado e higiene personal.')
ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion);

INSERT INTO productos (sku, nombre, categoria_id, precio_base, iva_pct, stock, imagen_url, is_active) VALUES
    ('FRU-001', 'Manzana roja 1 kg', 1, 2500.00, 0.00, 78, '/assets/img/icons/fru-001.png', TRUE),
    ('FRU-002', 'Banano 1 kg', 1, 1800.00, 0.00, 63, '/assets/img/icons/fru-002.png', TRUE),
    ('FRU-003', 'Tomate chonto 1 kg', 1, 2300.00, 0.00, 54, '/assets/img/icons/fru-003.png', TRUE),
    ('LAC-001', 'Leche entera 1 L', 2, 1150.00, 0.00, 96, '/assets/img/icons/lac-001.png', TRUE),
    ('LAC-002', 'Yogur natural pack x4', 2, 2350.00, 0.00, 46, '/assets/img/icons/lac-002.png', TRUE),
    ('LAC-003', 'Queso campesino 250 g', 2, 4900.00, 5.00, 29, '/assets/img/icons/lac-003.png', TRUE),
    ('CAR-001', 'Pechuga de pollo 500 g', 3, 5750.00, 5.00, 34, '/assets/img/icons/car-001.png', TRUE),
    ('CAR-002', 'Carne molida de res 500 g', 3, 6400.00, 5.00, 28, '/assets/img/icons/car-002.png', TRUE),
    ('CAR-003', 'Lomo de cerdo 300 g', 3, 8950.00, 5.00, 17, '/assets/img/icons/car-003.png', TRUE),
    ('DES-001', 'Arroz blanco 1 kg', 4, 1950.00, 5.00, 73, '/assets/img/icons/des-001.png', TRUE),
    ('DES-002', 'Frijol cargamanto 500 g', 4, 1250.00, 5.00, 86, '/assets/img/icons/des-002.png', TRUE),
    ('DES-003', 'Aceite de oliva 1 L', 4, 7800.00, 5.00, 23, '/assets/img/icons/des-003.png', TRUE),
    ('BEB-001', 'Agua en botella 1,5 L', 5, 750.00, 5.00, 116, '/assets/img/icons/beb-001.png', TRUE),
    ('BEB-002', 'Gaseosa cola 350 ml (lata)', 5, 2100.00, 19.00, 58, '/assets/img/icons/beb-002.png', TRUE),
    ('BEB-003', 'Jugo de naranja 1 L', 5, 2650.00, 5.00, 40, '/assets/img/icons/beb-003.png', TRUE),
    ('PAN-001', 'Pan campesino 500 g', 6, 2200.00, 5.00, 48, '/assets/img/icons/pan-001.png', TRUE),
    ('PAN-002', 'Baguette', 6, 950.00, 0.00, 66, '/assets/img/icons/pan-002.png', TRUE),
    ('LIM-001', 'Detergente liquido 2 L', 7, 6500.00, 19.00, 30, '/assets/img/icons/lim-001.png', TRUE),
    ('LIM-002', 'Papel higienico 3 rollos', 7, 3400.00, 19.00, 44, '/assets/img/icons/lim-002.png', TRUE),
    ('HIG-001', 'Champu 750 ml', 8, 3150.00, 19.00, 36, '/assets/img/icons/hig-001.png', TRUE)
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), imagen_url = VALUES(imagen_url), is_active = TRUE;
