#!/usr/bin/env python3
"""
Genera el catalogo completo del juego (los 20 productos base + los demas iconos del pack «Free pixel food 16x16»):
  - copia cada icono a public/assets/img/icons/<sku>.png
  - reescribe database/productos_juego.sql (no destructivo) y amplia database/seed.sql
  - reescribe en assets.js los bloques SKUS y PRODUCTOS_DEMO (entre las marcas GENERADO)
Se puede ejecutar varias veces. Uso: python3 tools/generar_catalogo.py
"""
import os, re, random, shutil

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = lambda *a: os.path.join(RAIZ, *a)
PACK = P('assets-src', 'iconos-pack')

# (sku, carpeta/icono del pack, nombre, categoria, precio COP, IVA %). Sin tildes, como el resto del seed.
NUEVOS = [
    # Frutas y verduras (1): empacadas, con codigo de barras (solo manzana, banano y tomate se pesan con PLU)
    ('FRU-004', 'frutas-verduras/fruit_apple-slice', 'Manzana en tajadas bolsa', 1, 3200, 0),
    ('FRU-005', 'frutas-verduras/fruit_blueberry', 'Mora de castilla 250 g', 1, 7900, 0),
    ('FRU-006', 'frutas-verduras/fruit_cherry', 'Cerezas 250 g', 1, 9500, 0),
    ('FRU-007', 'frutas-verduras/fruit_grape_red', 'Uvas moradas 1 kg', 1, 6800, 0),
    ('FRU-008', 'frutas-verduras/fruit_greengrape', 'Uvas verdes 500 g', 1, 6500, 0),
    ('FRU-009', 'frutas-verduras/fruit_kiwi', 'Kiwi bandeja x4', 1, 5200, 0),
    ('FRU-010', 'frutas-verduras/fruit_lemon', 'Limon amarillo bolsa 500 g', 1, 2400, 0),
    ('FRU-011', 'frutas-verduras/fruit_lime', 'Limon tahiti 1 kg', 1, 3900, 0),
    ('FRU-012', 'frutas-verduras/fruit_orange', 'Naranja 1 kg', 1, 3500, 0),
    ('FRU-013', 'frutas-verduras/fruit_orange_slice', 'Naranja en gajos bandeja', 1, 3600, 0),
    ('FRU-014', 'frutas-verduras/fruit_peach', 'Durazno bandeja x4', 1, 5400, 0),
    ('FRU-015', 'frutas-verduras/fruit_strawberry', 'Fresas 1 kg', 1, 6900, 0),
    ('FRU-016', 'frutas-verduras/fruit_watermelon', 'Patilla 1 kg', 1, 9800, 0),
    ('FRU-017', 'frutas-verduras/fruit_watermelon_slice', 'Patilla picada bandeja', 1, 4300, 0),
    ('FRU-018', 'frutas-verduras/vegetable_bellpepper_green', 'Pimenton verde bolsa x3', 1, 3500, 0),
    ('FRU-019', 'frutas-verduras/vegetable_bellpepper_red', 'Pimenton rojo 1 kg', 1, 4200, 0),
    ('FRU-020', 'frutas-verduras/vegetable_bellpepper_yellow', 'Pimenton amarillo bolsa x3', 1, 4200, 0),
    ('FRU-021', 'frutas-verduras/vegetable_carrot', 'Zanahoria 1 kg', 1, 2100, 0),
    ('FRU-022', 'frutas-verduras/vegetable_corn', 'Mazorca bandeja x2', 1, 3800, 0),
    ('FRU-023', 'frutas-verduras/vegetable_cucumber', 'Pepino cohombro 1 kg', 1, 2600, 0),
    ('FRU-024', 'frutas-verduras/vegetable_eggplant', 'Berenjena bandeja x2', 1, 3300, 0),
    ('FRU-025', 'frutas-verduras/vegetable_garlic', 'Ajo cabeza malla x3', 1, 2000, 0),
    ('FRU-026', 'frutas-verduras/vegetable_ginger', 'Jengibre 250 g', 1, 2900, 0),
    ('FRU-027', 'frutas-verduras/vegetable_jalapeno', 'Aji jalapeno 200 g', 1, 2500, 0),
    ('FRU-028', 'frutas-verduras/vegetable_onion', 'Cebolla cabezona 1 kg', 1, 2700, 0),
    ('FRU-029', 'frutas-verduras/vegetable_potato', 'Papa pastusa 1 kg', 1, 5200, 0),
    ('FRU-030', 'frutas-verduras/vegetable_pumpkin', 'Ahuyama porcion 1 kg', 1, 2800, 0),
    # Lacteos y huevos (2)
    ('LAC-004', 'lacteos-huevos/cheese_blue', 'Queso azul 150 g', 2, 8200, 5),
    ('LAC-005', 'lacteos-huevos/cheese_camembert', 'Queso camembert 125 g', 2, 7600, 5),
    ('LAC-006', 'lacteos-huevos/cheese_mozzarella', 'Queso mozzarella 250 g', 2, 6300, 5),
    ('LAC-007', 'lacteos-huevos/eggs_brown', 'Huevos rojos cubeta x12', 2, 11800, 0),
    ('LAC-008', 'lacteos-huevos/eggs_white', 'Huevos blancos cubeta x12', 2, 11200, 0),
    ('LAC-009', 'bebidas/coffee_milkjug', 'Crema de leche 250 ml', 2, 3900, 5),
    # Despensa (4)
    ('DES-004', 'despensa/canned_soup', 'Sopa enlatada 300 g', 4, 3100, 5),
    ('DES-005', 'despensa/jam_blueberry', 'Mermelada de mora 300 g', 4, 4600, 5),
    ('DES-006', 'despensa/jam_grape', 'Mermelada de uva 300 g', 4, 4600, 5),
    ('DES-007', 'despensa/jam_kiwi', 'Mermelada de kiwi 300 g', 4, 4800, 5),
    ('DES-008', 'despensa/jam_peach', 'Mermelada de durazno 300 g', 4, 4600, 5),
    ('DES-009', 'despensa/jam_strawberry', 'Mermelada de fresa 300 g', 4, 4600, 5),
    ('DES-010', 'bebidas/coffee_darkroast', 'Cafe tostado oscuro 500 g', 4, 15800, 5),
    ('DES-011', 'bebidas/coffee_lightroast', 'Cafe tostado claro 500 g', 4, 15200, 5),
    ('DES-012', 'bebidas/coffee_mediumroast', 'Cafe tostado medio 500 g', 4, 15500, 5),
    ('DES-013', 'bebidas/coffee_raw', 'Cafe en grano 500 g', 4, 14500, 5),
    ('DES-014', 'bebidas/coffee_mocha', 'Cafetera moka 3 tazas', 4, 24900, 19),
    # Bebidas (5)
    ('BEB-004', 'bebidas/soda_fanta', 'Gaseosa naranja 350 ml (lata)', 5, 2100, 19),
    ('BEB-005', 'bebidas/soda_pepsi', 'Gaseosa cola light 350 ml (lata)', 5, 2100, 19),
    ('BEB-006', 'bebidas/soda_sprite', 'Gaseosa limon 350 ml (lata)', 5, 2100, 19),
    ('BEB-007', 'bebidas/soymilk_almond', 'Bebida de almendra 250 ml', 5, 2900, 5),
    ('BEB-008', 'bebidas/soymilk_banana', 'Bebida de soya banano 250 ml', 5, 2600, 5),
    ('BEB-009', 'bebidas/soymilk_choco', 'Bebida de soya chocolate 250 ml', 5, 2600, 5),
    ('BEB-010', 'bebidas/soymilk_chocomint', 'Bebida de soya choco menta 250 ml', 5, 2700, 5),
    ('BEB-011', 'bebidas/soymilk_coffee', 'Bebida de soya cafe 250 ml', 5, 2700, 5),
    ('BEB-012', 'bebidas/soymilk_match', 'Bebida de soya te verde 250 ml', 5, 2800, 5),
    ('BEB-013', 'bebidas/soymilk_peach', 'Bebida de soya durazno 250 ml', 5, 2600, 5),
    ('BEB-014', 'bebidas/soymilk_soy', 'Bebida de soya original 250 ml', 5, 2400, 5),
    ('BEB-015', 'bebidas/soymilk_strawberry', 'Bebida de soya fresa 250 ml', 5, 2600, 5),
    ('BEB-016', 'bebidas/boba_coffee', 'Te frio con perlas cafe 400 ml', 5, 6500, 19),
    ('BEB-017', 'bebidas/boba_mango', 'Te frio con perlas mango 400 ml', 5, 6500, 19),
    ('BEB-018', 'bebidas/boba_matcha', 'Te frio con perlas te verde 400 ml', 5, 6800, 19),
    ('BEB-019', 'bebidas/boba_milktea', 'Te frio con perlas y leche 400 ml', 5, 6500, 19),
    ('BEB-020', 'bebidas/boba_strawberry', 'Te frio con perlas fresa 400 ml', 5, 6500, 19),
    ('BEB-021', 'bebidas/boba_taro', 'Te frio con perlas taro 400 ml', 5, 6800, 19),
    ('BEB-022', 'bebidas/boba_thai', 'Te frio con perlas te tailandes 400 ml', 5, 6800, 19),
    ('BEB-023', 'bebidas/coffee_espresso', 'Cafe espresso para llevar', 5, 3500, 19),
    ('BEB-024', 'bebidas/coffee_foam', 'Capuchino para llevar', 5, 4500, 19),
    ('BEB-025', 'bebidas/coffee_greentea', 'Te verde para llevar', 5, 3200, 19),
    ('BEB-026', 'bebidas/coffee_tea', 'Te negro para llevar', 5, 3000, 19),
    # Panaderia y postres (6)
    ('PAN-003', 'panaderia-postres/cake_cheese', 'Torta de queso porcion', 6, 5200, 5),
    ('PAN-004', 'panaderia-postres/cake_chocolate', 'Torta de chocolate porcion', 6, 4800, 5),
    ('PAN-005', 'panaderia-postres/cake_matcha', 'Torta de te verde porcion', 6, 5400, 5),
    ('PAN-006', 'panaderia-postres/cake_redvelvet', 'Torta red velvet porcion', 6, 5600, 5),
    ('PAN-007', 'panaderia-postres/cake_strawberry', 'Torta de fresa porcion', 6, 5000, 5),
    ('PAN-008', 'panaderia-postres/onigiri_1', 'Onigiri de alga', 6, 3500, 5),
    ('PAN-009', 'panaderia-postres/onigiri_2', 'Onigiri de atun', 6, 3800, 5),
    ('PAN-010', 'panaderia-postres/onigiri_3', 'Onigiri de salmon', 6, 4200, 5),
    ('PAN-011', 'panaderia-postres/onigiri_4', 'Onigiri de huevo', 6, 3600, 5),
    ('PAN-012', 'panaderia-postres/onigiri_5', 'Onigiri de arroz y alga', 6, 3500, 5),
    ('PAN-013', 'panaderia-postres/pastry_brioche', 'Brioche', 6, 2400, 5),
    ('PAN-014', 'panaderia-postres/pastry_croissant', 'Croissant', 6, 2200, 5),
    ('PAN-015', 'panaderia-postres/pastry_pretzel', 'Pretzel', 6, 2000, 5),
    # Helados (9, categoria nueva)
    ('HEL-001', 'helados/icecream_1scoop', 'Helado de fresa en cono', 9, 3500, 19),
    ('HEL-002', 'helados/icecream_2scoops', 'Helado de chocolate en cono', 9, 3500, 19),
    ('HEL-003', 'helados/icecream_3scoops', 'Helado de vainilla en cono', 9, 3500, 19),
    ('HEL-004', 'helados/popsicle_blue', 'Paleta de mora', 9, 1800, 19),
    ('HEL-005', 'helados/popsicle_green', 'Paleta de limon', 9, 1800, 19),
    ('HEL-006', 'helados/popsicle_pink', 'Paleta de fresa', 9, 1800, 19),
    ('HEL-007', 'helados/popsicle_red', 'Paleta de cereza', 9, 1800, 19),
    ('HEL-008', 'helados/popsicle_yellow', 'Paleta de maracuya', 9, 1800, 19),
]

# Precios de venta realistas en COP (antes de IVA), por SKU. Sobrescriben los de la tabla y los del seed.
PRECIOS = {
    'FRU-001': 8500, 'FRU-002': 3800, 'FRU-003': 4500, 'LAC-001': 4600, 'LAC-002': 9800, 'LAC-003': 8900,
    'CAR-001': 11500, 'CAR-002': 13500, 'CAR-003': 12900, 'DES-001': 4800, 'DES-002': 7900, 'DES-003': 38000,
    'BEB-001': 3500, 'BEB-002': 2800, 'BEB-003': 6500, 'PAN-001': 6800, 'PAN-002': 3200,
    'LIM-001': 18900, 'LIM-002': 6500, 'HIG-001': 21900,
    'FRU-004': 5200, 'FRU-005': 6500, 'FRU-006': 14900, 'FRU-007': 24000, 'FRU-008': 12500, 'FRU-009': 7900,
    'FRU-010': 3900, 'FRU-011': 3900, 'FRU-012': 3500, 'FRU-013': 5900, 'FRU-014': 8900, 'FRU-015': 18000,
    'FRU-016': 2500, 'FRU-017': 6900, 'FRU-018': 4900, 'FRU-019': 9500, 'FRU-020': 5900, 'FRU-021': 3200,
    'FRU-022': 5500, 'FRU-023': 3800, 'FRU-024': 4500, 'FRU-025': 3900, 'FRU-026': 3800, 'FRU-027': 3500,
    'FRU-028': 3900, 'FRU-029': 3500, 'FRU-030': 3500,
    'LAC-004': 16900, 'LAC-005': 14500, 'LAC-006': 12900, 'LAC-007': 14500, 'LAC-008': 13800, 'LAC-009': 5900,
    'DES-004': 5500, 'DES-005': 7900, 'DES-006': 7500, 'DES-007': 8500, 'DES-008': 7900, 'DES-009': 7900,
    'DES-010': 28900, 'DES-011': 27900, 'DES-012': 28500, 'DES-013': 26900, 'DES-014': 39900,
    'BEB-004': 2800, 'BEB-005': 2800, 'BEB-006': 2800, 'BEB-007': 4500, 'BEB-008': 3500, 'BEB-009': 3500,
    'BEB-010': 3800, 'BEB-011': 3800, 'BEB-012': 3900, 'BEB-013': 3500, 'BEB-014': 3200, 'BEB-015': 3500,
    'BEB-016': 9500, 'BEB-017': 9500, 'BEB-018': 9900, 'BEB-019': 9500, 'BEB-020': 9500, 'BEB-021': 9900,
    'BEB-022': 9900, 'BEB-023': 3500, 'BEB-024': 5500, 'BEB-025': 3800, 'BEB-026': 3500,
    'PAN-003': 8900, 'PAN-004': 8500, 'PAN-005': 9500, 'PAN-006': 9900, 'PAN-007': 8900,
    'PAN-008': 5500, 'PAN-009': 6500, 'PAN-010': 7500, 'PAN-011': 6000, 'PAN-012': 5500,
    'PAN-013': 3800, 'PAN-014': 4200, 'PAN-015': 3500,
    'HEL-001': 4500, 'HEL-002': 4500, 'HEL-003': 4500,
    'HEL-004': 2500, 'HEL-005': 2500, 'HEL-006': 2500, 'HEL-007': 2500, 'HEL-008': 2500,
}
# Nombres que sustituyen a los del seed para los 20 productos base (las frutas que se pesan son las del libro PLU)
NOMBRES = {'FRU-003': 'Tomate chonto bolsa 1 kg'}
CAT_NUEVA = (9, 'Helados', 'Helados y paletas.')
q = lambda s: s.replace("'", "''")

# --- 1) los 20 base, leidos del seed (ids 1-20) ---
seed = open(P('database', 'seed.sql')).read()
cabecera, resto = seed.split('INSERT INTO productos', 1)
bloque, cola = resto.split('INSERT INTO jornadas', 1)
base = re.findall(r"\((\d+), '([A-Z]{3}-\d{3})', '([^']*)', (\d), ([\d.]+), ([\d.]+), (\d+), '[^']*', TRUE\)", bloque)
base = [(int(i), s, NOMBRES.get(s, n), int(c), f'{PRECIOS[s]}.00', iva, int(st)) for i, s, n, c, pr, iva, st in base if int(i) <= 20]
assert len(base) == 20, len(base)

# --- 2) iconos ---
for sku, ruta, *_ in NUEVOS:
    origen = os.path.join(PACK, ruta + '.png')
    assert os.path.exists(origen), origen
    shutil.copyfile(origen, P('public', 'assets', 'img', 'icons', sku.lower() + '.png'))

rng = random.Random(2026)
nuevos = [(21 + k, s, n, c, f'{PRECIOS[s]}.00', f'{iva}.00', rng.randint(20, 120)) for k, (s, _, n, c, pr, iva) in enumerate(NUEVOS)]
todos = base + nuevos
img = lambda s: '/assets/img/icons/' + s.lower() + '.png'

# --- 3) seed.sql ---
filas = ",\n".join(f"    ({i}, '{s}', '{q(n)}', {c}, {pr}, {iva}, {st}, '{img(s)}', TRUE)" for i, s, n, c, pr, iva, st in todos) + ";\n\n"
cab = cabecera
if "(9, 'Helados'" not in cab:
    cab = cab.replace("(8, 'Higiene personal', 'Productos de cuidado e higiene personal.');",
                      "(8, 'Higiene personal', 'Productos de cuidado e higiene personal.'),\n    (9, 'Helados', 'Helados y paletas.');")
    cab = cab.replace('INSERT INTO productos\n', 'INSERT INTO productos\n')
# --- 3b) historial del seed: jornadas CERRADAS y ventas recalculadas con los precios actuales (reglas de PricingService) ---
def mitad_arriba(num, den):          # redondeo half-up con enteros (centavos)
    return (2 * num + den) // (2 * den)

filas_v = re.findall(r"\((\d+), '(V-\d+)', '([^']*)', [\d.]+, [\d.]+, [\d.]+, [\d.]+,\s*[\d.]+, [\d.]+, '([^']*)', '(\w+)', (\d+)\)", cola)
filas_d = re.findall(r"\((\d+), (\d+), (\d+), [\d.]+, [\d.]+, [\d.]+, [\d.]+, [\d.]+\)", cola.split('INSERT INTO detalles_venta')[1])
por_id = {i: (sku, float(pr), float(iva)) for i, sku, n, c, pr, iva, st in todos}
dec = lambda c: f"{c // 100}.{c % 100:02d}"
ventas_sql, detalles_sql = [], []
for vid, numero, cliente, fecha, estado, jor in filas_v:
    sub = ivat = bruto = 0
    lineas = []
    for v, prod, cant in filas_d:
        if v != vid:
            continue
        sku, precio, iva = por_id[int(prod)]
        sl = int(round(precio * 100)) * int(cant)
        il = mitad_arriba(sl * int(round(iva * 100)), 10000)
        sub += sl; ivat += il; bruto += sl + il
        lineas.append((vid, prod, cant, dec(int(round(precio * 100))), f"{iva:.2f}", dec(sl), dec(il), dec(sl + il)))
    desc = mitad_arriba(bruto * 5, 100) if bruto >= 10000000 else 0
    total = bruto - desc
    if estado == 'completada':
        efectivo = ((total + 99999) // 100000) * 100000 if total > 500000 else ((total + 49999) // 50000) * 50000
        if efectivo == total: efectivo += 50000
        cambio = efectivo - total
    else:
        efectivo = cambio = 0
    ventas_sql.append(f"    ({vid}, '{numero}', '{q(cliente)}', {dec(sub)}, {dec(ivat)}, {dec(desc)}, {dec(total)},\n     {dec(efectivo)}, {dec(cambio)}, '{fecha}', '{estado}', {jor})")
    detalles_sql += [f"    ({', '.join(l)})" for l in lineas]
antes_j, resto_j = cola.split('INSERT INTO ventas', 1)
# (cola empieza justo después de "INSERT INTO jornadas")
antes_j = re.sub(r"\A \(id, fecha_inicio, fecha_fin, estado\) VALUES\n.*?;",
    " (id, fecha_inicio, fecha_fin, estado) VALUES\n    (1, '2026-11-03 08:00:00', '2026-11-03 20:00:00', 'cerrada'),\n    (2, '2026-11-05 08:00:00', '2026-11-05 20:00:00', 'cerrada');", antes_j, count=1, flags=re.S)
cola = antes_j + "INSERT INTO ventas\n    (id, numero_venta, cliente_nombre, subtotal, iva_total, descuento_total, total,\n     efectivo_recibido, cambio, fecha_hora, estado, jornada_id)\nVALUES\n" + ",\n".join(ventas_sql) + ";\n\nINSERT INTO detalles_venta\n    (venta_id, producto_id, cantidad, precio_unitario, iva_pct, subtotal_linea, iva_linea, total_linea)\nVALUES\n" + ",\n".join(detalles_sql) + ";\n"

open(P('database', 'seed.sql'), 'w').write(cab + 'INSERT INTO productos' + bloque.split('VALUES', 1)[0] + 'VALUES\n' + filas + 'INSERT INTO jornadas' + cola)

# --- 4) productos_juego.sql (no destructivo) ---
cats = re.findall(r"\((\d), '([^']*)', '([^']*)'\)", cab.split('INSERT INTO productos')[0])
sql = ["-- Catalogo completo del juego: nombres colombianos y su asset (icono 16x16 en public/assets/img/icons/).",
       "-- NO destructivo: crea las categorias y productos que falten y ACTUALIZA nombre e imagen de los que ya existan (por SKU).",
       "-- No toca precios ni stock existentes, ni ventas. Los precios en pesos de los 20 primeros: database/precios_cop.sql.",
       "-- Generado por tools/generar_catalogo.py. Uso:  mysql -u USUARIO -p < database/productos_juego.sql", "",
       "USE supermarket_simulator;", "",
       "INSERT INTO categorias (id, nombre, descripcion) VALUES",
       ",\n".join(f"    ({i}, '{q(n)}', '{q(d)}')" for i, n, d in cats),
       "ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion);", "",
       "INSERT INTO productos (sku, nombre, categoria_id, precio_base, iva_pct, stock, imagen_url, is_active) VALUES",
       ",\n".join(f"    ('{s}', '{q(n)}', {c}, {pr}, {iva}, {st}, '{img(s)}', TRUE)" for _, s, n, c, pr, iva, st in todos),
       "ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), imagen_url = VALUES(imagen_url), is_active = TRUE;", ""]
open(P('database', 'productos_juego.sql'), 'w').write("\n".join(sql))

# --- 4b) precios_cop.sql: precios e IVA de TODOS los productos del juego ---
pc = ["-- Lleva PRECIO e IVA de los productos del juego a pesos colombianos realistas (generado por tools/generar_catalogo.py).",
      "-- Solo cambia precio_base e iva_pct de esos SKU: no toca stock, ventas ni detalles (guardan su propio precio historico).",
      "-- Idempotente. Uso:  mysql -u USUARIO -p supermarket_simulator < database/precios_cop.sql", "", "USE supermarket_simulator;", ""]
pc += [f"UPDATE productos SET precio_base = {pr}, iva_pct = {iva} WHERE sku = '{s}';" for _, s, n, c, pr, iva, st in todos]
open(P('database', 'precios_cop.sql'), 'w').write("\n".join(pc) + "\n")

# --- 5) assets.js ---
a = open(P('public', 'assets', 'js', 'phaser', 'assets.js')).read()
lista = ",\n    ".join(", ".join(f"'{s}'" for _, s, *_ in todos[i:i + 8]) for i in range(0, len(todos), 8))
a = re.sub(r"const SKUS = \[.*?\];", "const SKUS = [   // GENERADO por tools/generar_catalogo.py\n    " + lista + "\n];", a, flags=re.S)
demo = ",\n".join(f"    '{s}': {{ nombre: '{q(n)}', precio_base: '{pr}', iva_pct: '{iva}' }}" for _, s, n, c, pr, iva, st in todos)
a = re.sub(r"const PRODUCTOS_DEMO = \{.*?\n\};", "const PRODUCTOS_DEMO = {   // GENERADO por tools/generar_catalogo.py\n" + demo + "\n};", a, flags=re.S)
open(P('public', 'assets', 'js', 'phaser', 'assets.js'), 'w').write(a)
print(len(base), '+', len(nuevos), '=', len(todos), 'productos')
