/*
 * Manifiesto de assets del juego. Lienzo lógico 480x270.
 *
 * Cada PNG es OPCIONAL: si el archivo aún no existe, la escena dibuja un
 * placeholder del mismo tamaño en el mismo sitio. Para cambiar un placeholder
 * por arte real basta con dejar el PNG en su ruta (mismo nombre y tamaño).
 *
 * w/h = tamaño exacto del PNG. frames = nº de frames en tira horizontal.
 * Especificación completa para generarlos: docs/ASSETS_IA.md
 */
const IMG = 'assets/img/';

const ASSETS = {
    // Columna 1: tienda
    suelo:       { path: 'tienda/suelo.png',       w: 16,  h: 16 },   // baldosa repetible
    pared:       { path: 'tienda/pared-estanterias.png', w: 160, h: 64 },
    expositor:   { path: 'tienda/expositor.png',   w: 44,  h: 60 },
    cestas:      { path: 'tienda/cestas.png',      w: 28,  h: 20 },
    planta:      { path: 'tienda/planta.png',      w: 16,  h: 24 },
    'mostrador-caja': { path: 'tienda/mostrador-caja.png', w: 64, h: 214 },
    'mueble-trasero': { path: 'tienda/mueble-trasero.png', w: 28, h: 52 },
    'luz-carril': { path: 'tienda/luz-carril.png', w: 28, h: 32 },
    cajero:      { path: 'characters/cajero-izq.png', w: 32, h: 38 },     // mira a la izquierda, hacia la cola
    'mini-escaner': { path: 'tienda/mini-escaner.png', w: 24, h: 28, frames: 2 },  // apagado · láser
    'mini-balanza': { path: 'tienda/mini-balanza.png', w: 20, h: 18 },
    'mini-caja':    { path: 'tienda/mini-caja.png',    w: 28, h: 28 },
    'cliente-1': { path: 'characters/cliente-1.png', w: 32, h: 38, frames: 4 },
    'cliente-2': { path: 'characters/cliente-2.png', w: 32, h: 38, frames: 4 },
    'cliente-3': { path: 'characters/cliente-3.png', w: 32, h: 38, frames: 4 },
    'cliente-4': { path: 'characters/cliente-4.png', w: 32, h: 38, frames: 4 },

    // Columna 2: banda
    banda:       { path: 'banda/banda.png',        w: 160, h: 32 },   // se repite en vertical
    mesa:        { path: 'banda/mesa.png',         w: 160, h: 152 },  // remate de la banda + mesa
    escaner:     { path: 'banda/escaner.png',      w: 64,  h: 56, frames: 3 }, // apagado · láser · OK
    balanza:     { path: 'banda/balanza.png',      w: 72,  h: 56 },
    bolsa:       { path: 'banda/bolsa.png',        w: 144, h: 58, frames: 3 }, // vacía · con productos · llena
    'bolsa-cerrar': { path: 'banda/bolsa-cerrar.png', w: 144, h: 58, frames: 8 }, // animación de cierre (12 fps)
    'boton-entregar': { path: 'banda/boton-entregar.png', w: 96, h: 16, frames: 3 }, // normal · pulsado · desactivado

    // Columna 3: caja
    caja:        { path: 'caja/caja-cuerpo.png',  w: 144, h: 151 },
    // Teclas: tiras de 2 frames (normal · pulsada)
    'tecla-num':  { path: 'caja/tecla-num.png',  w: 14, h: 12, frames: 2 },
    'tecla-cero': { path: 'caja/tecla-cero.png', w: 30, h: 12, frames: 2 },
    'tecla-qty':  { path: 'caja/tecla-qty.png',  w: 36, h: 12, frames: 2 },
    'tecla-void': { path: 'caja/tecla-void.png', w: 36, h: 12, frames: 2 },
    'tecla-clr':  { path: 'caja/tecla-clr.png',  w: 36, h: 12, frames: 2 },
    'tecla-ent':  { path: 'caja/tecla-ent.png',  w: 36, h: 12, frames: 2 },
    'tecla-pay':  { path: 'caja/tecla-pay.png',  w: 32, h: 12, frames: 2 },
    libro:       { path: 'caja/libro.png',         w: 144, h: 68 },
    'libro-flechas': { path: 'caja/libro-flechas.png', w: 12, h: 12, frames: 6 },   // izq: normal · resaltada · pulsada, der: igual
    'libro-numero':  { path: 'caja/libro-numero.png',  w: 30, h: 12 },
    // Cobro: bandeja con los billetes del cliente, y el recibo que sale de la impresora
    'bandeja-efectivo': { path: 'caja/bandeja-efectivo.png', w: 144, h: 30 },
    billetes:    { path: 'caja/billetes.png',      w: 38,  h: 18, frames: 6 },   // 2.000 · 5.000 · 10.000 · 20.000 · 50.000 · 100.000
    'recibo-imprimir': { path: 'caja/recibo-imprimir.png', w: 36, h: 60, frames: 10 },
    'recibo-arrancar': { path: 'caja/recibo-arrancar.png', w: 36, h: 60, frames: 4 },
    // Menú de la jornada (barra superior de 24 px y panel de cierre)
    'hud-barra': { path: 'hud/hud-barra.png', w: 480, h: 24 },
    'hud-boton': { path: 'hud/hud-boton.png', w: 68, h: 16, frames: 6 },          // verde: normal, pulsado, desactivado · rojo: igual
    'hud-lampara': { path: 'hud/hud-lampara.png', w: 8, h: 8, frames: 3 },        // roja (cerrada), verde (abierta), ámbar (cerrando)
    'hud-iconos': { path: 'hud/hud-iconos.png', w: 10, h: 10, frames: 4 },        // reloj, persona, estrella, moneda
    'panel-cierre': { path: 'hud/panel-cierre.png', w: 224, h: 168 },

    // Animaciones (opcionales: si no existen, el juego se mueve con deslizamientos sencillos).
    // Rejilla de 6 columnas x 4 filas: caminar de frente · caminar de perfil · caminar con bolsa · dar dinero y coger bolsa
    'cliente-1-anim': { path: 'characters/cliente-1-anim.png', w: 32, h: 38, frames: 24, opcional: true },
    'cliente-2-anim': { path: 'characters/cliente-2-anim.png', w: 32, h: 38, frames: 24, opcional: true },
    'cliente-3-anim': { path: 'characters/cliente-3-anim.png', w: 32, h: 38, frames: 24, opcional: true },
    'cliente-4-anim': { path: 'characters/cliente-4-anim.png', w: 32, h: 38, frames: 24, opcional: true },
    'cajero-anim': { path: 'characters/cajero-anim.png', w: 32, h: 38, frames: 4, opcional: true },  // reposo · respira · cambio · cambio con billetes
    // Protesta de los clientes: hoja 6 x 4 (una fila por cliente 1-4, 6 frames de frente)
    'clientes-protesta': { path: 'characters/clientes-protesta.png', w: 32, h: 38, frames: 24, opcional: true },
    // Hoja 6 x 5: filas reposo (6) · saludar (6) · teclear (4) · celebrar (6) · molesto (4)
    'cajero-extra': { path: 'characters/cajero-extra.png', w: 32, h: 38, frames: 30, opcional: true }
};

// Columna de la tienda (de tienda-layout.json). Posiciones [x, y] de la esquina superior izquierda.
const TIENDA = {
    // Cola de clientes a la IZQUIERDA, el puesto en el centro y el cajero a su derecha, mirando a la cola.
    // Todo lo del puesto es la vista completa (en pequeño) de lo que se juega en las otras dos columnas.
    cola: { x: 24, y: 76, paso: 42 },                         // pies del primer cliente (el de arriba)
    mostrador: [60, 56], canal: [80, 56, 24, 88],             // canal de la banda: x, y, ancho, alto
    luz: [80, 36], luzCara: [85, 42, 14, 12],                 // luz del carril y su cara (donde va el número)
    miniEscaner: [80, 144], miniBalanza: [64, 180], miniCaja: [94, 176],
    miniCajaPantalla: [96, 183, 1, 14],                       // x, y, ancho, alto: un canto de 1 px (caja vista en planta y girada hacia el cajero)
    miniPlato: [67, 188],                                     // donde se posa la fruta en la mini balanza
    cajero: [124, 166],                                       // pegado a la mini caja, a la derecha del puesto
    mueble: [130, 110],                                       // detrás del cajero
    planta: [136, 74], cestas: [128, 232],
    expositor: [6, 214]
};

// Menú de la jornada: la barra ocupa los 24 px de ARRIBA del lienzo (el juego se dibuja debajo, desde y = 24).
const HUD = {
    alto: 24,
    ranuras: { jornada: [18, 4, 84, 16], reloj: [108, 4, 60, 16], clientes: [174, 4, 60, 16], puntos: [240, 4, 60, 16], ventas: [306, 4, 90, 16] },
    boton: [408, 4], lampara: [6, 8],
    panel: [128, 75]                                       // esquina del panel de cierre (224 x 168), centrado en el área de juego
};

// Columna central (de banda-layout.json). Coordenadas relativas a la columna (x0 = 160).
const BANDA_X = 160;
const BANDA = {
    banda: [0, 0, 160, 118], mesa: [0, 118], escaner: [8, 132], balanza: [80, 132],
    balanzaPantalla: [6, 5, 60, 14], balanzaPlato: [6, 24, 60, 26],
    bolsa: [8, 192], bolsaBoca: [12, 6, 120, 22], boton: [32, 252]
};

// Posiciones dentro del sprite de la caja (de caja-layout.json): [x, y, ancho, alto].
// Cada tecla: [x, y, w, h, hoja, color del texto, texto].
const CAJA_PANTALLA = [11, 6, 122, 22];
const CAJA_TECLAS = {
    '1': [48, 56, 14, 12, 'tecla-num'],  '2': [64, 56, 14, 12, 'tecla-num'],  '3': [80, 56, 14, 12, 'tecla-num'],
    '4': [48, 70, 14, 12, 'tecla-num'],  '5': [64, 70, 14, 12, 'tecla-num'],  '6': [80, 70, 14, 12, 'tecla-num'],
    '7': [48, 84, 14, 12, 'tecla-num'],  '8': [64, 84, 14, 12, 'tecla-num'],  '9': [80, 84, 14, 12, 'tecla-num'],
    '0': [48, 98, 30, 12, 'tecla-cero'], '.': [80, 98, 14, 12, 'tecla-num'],
    'QTY':  [100, 56, 36, 12, 'tecla-qty', '#181425'],
    'VOID': [100, 70, 36, 12, 'tecla-void', '#ffffff'],
    'CLR':  [100, 84, 36, 12, 'tecla-clr', '#181425'],
    'ENT':  [100, 98, 36, 12, 'tecla-ent', '#ffffff'],
    'PAY':  [6, 100, 32, 12, 'tecla-pay', '#ffffff']
};

// Productos: icono 16x16 por SKU (en la banda se dibuja a x2 = 32x32).
const SKUS = [   // GENERADO por tools/generar_catalogo.py
    'FRU-001', 'FRU-002', 'FRU-003', 'LAC-001', 'LAC-002', 'LAC-003', 'CAR-001', 'CAR-002',
    'CAR-003', 'DES-001', 'DES-002', 'DES-003', 'BEB-001', 'BEB-002', 'BEB-003', 'PAN-001',
    'PAN-002', 'LIM-001', 'LIM-002', 'HIG-001', 'FRU-004', 'FRU-005', 'FRU-006', 'FRU-007',
    'FRU-008', 'FRU-009', 'FRU-010', 'FRU-011', 'FRU-012', 'FRU-013', 'FRU-014', 'FRU-015',
    'FRU-016', 'FRU-017', 'FRU-018', 'FRU-019', 'FRU-020', 'FRU-021', 'FRU-022', 'FRU-023',
    'FRU-024', 'FRU-025', 'FRU-026', 'FRU-027', 'FRU-028', 'FRU-029', 'FRU-030', 'LAC-004',
    'LAC-005', 'LAC-006', 'LAC-007', 'LAC-008', 'LAC-009', 'DES-004', 'DES-005', 'DES-006',
    'DES-007', 'DES-008', 'DES-009', 'DES-010', 'DES-011', 'DES-012', 'DES-013', 'DES-014',
    'BEB-004', 'BEB-005', 'BEB-006', 'BEB-007', 'BEB-008', 'BEB-009', 'BEB-010', 'BEB-011',
    'BEB-012', 'BEB-013', 'BEB-014', 'BEB-015', 'BEB-016', 'BEB-017', 'BEB-018', 'BEB-019',
    'BEB-020', 'BEB-021', 'BEB-022', 'BEB-023', 'BEB-024', 'BEB-025', 'BEB-026', 'PAN-003',
    'PAN-004', 'PAN-005', 'PAN-006', 'PAN-007', 'PAN-008', 'PAN-009', 'PAN-010', 'PAN-011',
    'PAN-012', 'PAN-013', 'PAN-014', 'PAN-015', 'HEL-001', 'HEL-002', 'HEL-003', 'HEL-004',
    'HEL-005', 'HEL-006', 'HEL-007', 'HEL-008'
];
SKUS.forEach((sku) => {
    ASSETS[sku] = { path: 'icons/' + sku.toLowerCase() + '.png', w: 16, h: 16 };
});

// Productos sin código de barras: se pesan y se cobran tecleando su PLU.
// La cantidad que se envía a la API es el peso en kg (entero), porque el
// backend vende estos productos por unidades de 1 kg.
const PLU = {
    '4011': 'FRU-002',   // Banano
    '4012': 'FRU-012',   // Naranja
    '4016': 'FRU-001',   // Manzana roja
    '4023': 'FRU-007',   // Uvas moradas
    '4032': 'FRU-016',   // Patilla
    '4048': 'FRU-011',   // Limon tahiti
    '4062': 'FRU-023',   // Pepino cohombro
    '4072': 'FRU-029',   // Papa pastusa
    '4088': 'FRU-019',   // Pimenton rojo
    '4093': 'FRU-028',   // Cebolla cabezona
    '4094': 'FRU-021',   // Zanahoria
    '4430': 'FRU-015'    // Fresas
};
const PLU_POR_PAGINA = 4;    // el libro enseña 4 productos por página (2 + 2); las flechas pasan de página

// Columna de la caja: posición de la bandeja de efectivo, del recibo y del libro (coordenadas del lienzo).
const COBRO = {
    billete: [38, 18], zonaValor: [14, 5, 18, 8],            // tamaño del billete y zona lisa donde se escribe su valor
    bandeja: [328, 160], compartimentos: [[4, 4, 40, 22], [52, 4, 40, 22], [100, 4, 40, 22]],
    recibo: [332, 50], libro: [328, 198]
};

// Fuente de píxeles de 4 x 6 solo para las etiquetas de los billetes (2K, 10K, 100K…): la fuente del juego
// (8 px) no cabe en la zona del valor, que mide 18 x 8. Cada glifo son 6 filas de 4 columnas ('X' = píxel).
const GLIFOS_BILLETE = {
    '0': ['.XX.', 'X..X', 'X..X', 'X..X', 'X..X', '.XX.'],
    '1': ['..X.', '.XX.', '..X.', '..X.', '..X.', '.XXX'],
    '2': ['.XX.', 'X..X', '...X', '..X.', '.X..', 'XXXX'],
    '5': ['XXXX', 'X...', 'XXX.', '...X', 'X..X', '.XX.'],
    'K': ['X..X', 'X.X.', 'XX..', 'XX..', 'X.X.', 'X..X']
};

// Catálogo de muestra (el del seed). Se usa mientras el catálogo de la API no esté cargado.
const PRODUCTOS_DEMO = {   // GENERADO por tools/generar_catalogo.py
    'FRU-001': { nombre: 'Manzana roja 1 kg', precio_base: '8500.00', iva_pct: '0.00' },
    'FRU-002': { nombre: 'Banano 1 kg', precio_base: '3800.00', iva_pct: '0.00' },
    'FRU-003': { nombre: 'Tomate chonto bolsa 1 kg', precio_base: '4500.00', iva_pct: '0.00' },
    'LAC-001': { nombre: 'Leche entera 1 L', precio_base: '4600.00', iva_pct: '0.00' },
    'LAC-002': { nombre: 'Yogur natural pack x4', precio_base: '9800.00', iva_pct: '0.00' },
    'LAC-003': { nombre: 'Queso campesino 250 g', precio_base: '8900.00', iva_pct: '5.00' },
    'CAR-001': { nombre: 'Pechuga de pollo 500 g', precio_base: '11500.00', iva_pct: '5.00' },
    'CAR-002': { nombre: 'Carne molida de res 500 g', precio_base: '13500.00', iva_pct: '5.00' },
    'CAR-003': { nombre: 'Lomo de cerdo 300 g', precio_base: '12900.00', iva_pct: '5.00' },
    'DES-001': { nombre: 'Arroz blanco 1 kg', precio_base: '4800.00', iva_pct: '5.00' },
    'DES-002': { nombre: 'Frijol cargamanto 500 g', precio_base: '7900.00', iva_pct: '5.00' },
    'DES-003': { nombre: 'Aceite de oliva 1 L', precio_base: '38000.00', iva_pct: '5.00' },
    'BEB-001': { nombre: 'Agua en botella 1,5 L', precio_base: '3500.00', iva_pct: '5.00' },
    'BEB-002': { nombre: 'Gaseosa cola 350 ml (lata)', precio_base: '2800.00', iva_pct: '19.00' },
    'BEB-003': { nombre: 'Jugo de naranja 1 L', precio_base: '6500.00', iva_pct: '5.00' },
    'PAN-001': { nombre: 'Pan campesino 500 g', precio_base: '6800.00', iva_pct: '5.00' },
    'PAN-002': { nombre: 'Baguette', precio_base: '3200.00', iva_pct: '0.00' },
    'LIM-001': { nombre: 'Detergente liquido 2 L', precio_base: '18900.00', iva_pct: '19.00' },
    'LIM-002': { nombre: 'Papel higienico 3 rollos', precio_base: '6500.00', iva_pct: '19.00' },
    'HIG-001': { nombre: 'Champu 750 ml', precio_base: '21900.00', iva_pct: '19.00' },
    'FRU-004': { nombre: 'Manzana en tajadas bolsa', precio_base: '5200.00', iva_pct: '0.00' },
    'FRU-005': { nombre: 'Mora de castilla 250 g', precio_base: '6500.00', iva_pct: '0.00' },
    'FRU-006': { nombre: 'Cerezas 250 g', precio_base: '14900.00', iva_pct: '0.00' },
    'FRU-007': { nombre: 'Uvas moradas 1 kg', precio_base: '24000.00', iva_pct: '0.00' },
    'FRU-008': { nombre: 'Uvas verdes 500 g', precio_base: '12500.00', iva_pct: '0.00' },
    'FRU-009': { nombre: 'Kiwi bandeja x4', precio_base: '7900.00', iva_pct: '0.00' },
    'FRU-010': { nombre: 'Limon amarillo bolsa 500 g', precio_base: '3900.00', iva_pct: '0.00' },
    'FRU-011': { nombre: 'Limon tahiti 1 kg', precio_base: '3900.00', iva_pct: '0.00' },
    'FRU-012': { nombre: 'Naranja 1 kg', precio_base: '3500.00', iva_pct: '0.00' },
    'FRU-013': { nombre: 'Naranja en gajos bandeja', precio_base: '5900.00', iva_pct: '0.00' },
    'FRU-014': { nombre: 'Durazno bandeja x4', precio_base: '8900.00', iva_pct: '0.00' },
    'FRU-015': { nombre: 'Fresas 1 kg', precio_base: '18000.00', iva_pct: '0.00' },
    'FRU-016': { nombre: 'Patilla 1 kg', precio_base: '2500.00', iva_pct: '0.00' },
    'FRU-017': { nombre: 'Patilla picada bandeja', precio_base: '6900.00', iva_pct: '0.00' },
    'FRU-018': { nombre: 'Pimenton verde bolsa x3', precio_base: '4900.00', iva_pct: '0.00' },
    'FRU-019': { nombre: 'Pimenton rojo 1 kg', precio_base: '9500.00', iva_pct: '0.00' },
    'FRU-020': { nombre: 'Pimenton amarillo bolsa x3', precio_base: '5900.00', iva_pct: '0.00' },
    'FRU-021': { nombre: 'Zanahoria 1 kg', precio_base: '3200.00', iva_pct: '0.00' },
    'FRU-022': { nombre: 'Mazorca bandeja x2', precio_base: '5500.00', iva_pct: '0.00' },
    'FRU-023': { nombre: 'Pepino cohombro 1 kg', precio_base: '3800.00', iva_pct: '0.00' },
    'FRU-024': { nombre: 'Berenjena bandeja x2', precio_base: '4500.00', iva_pct: '0.00' },
    'FRU-025': { nombre: 'Ajo cabeza malla x3', precio_base: '3900.00', iva_pct: '0.00' },
    'FRU-026': { nombre: 'Jengibre 250 g', precio_base: '3800.00', iva_pct: '0.00' },
    'FRU-027': { nombre: 'Aji jalapeno 200 g', precio_base: '3500.00', iva_pct: '0.00' },
    'FRU-028': { nombre: 'Cebolla cabezona 1 kg', precio_base: '3900.00', iva_pct: '0.00' },
    'FRU-029': { nombre: 'Papa pastusa 1 kg', precio_base: '3500.00', iva_pct: '0.00' },
    'FRU-030': { nombre: 'Ahuyama porcion 1 kg', precio_base: '3500.00', iva_pct: '0.00' },
    'LAC-004': { nombre: 'Queso azul 150 g', precio_base: '16900.00', iva_pct: '5.00' },
    'LAC-005': { nombre: 'Queso camembert 125 g', precio_base: '14500.00', iva_pct: '5.00' },
    'LAC-006': { nombre: 'Queso mozzarella 250 g', precio_base: '12900.00', iva_pct: '5.00' },
    'LAC-007': { nombre: 'Huevos rojos cubeta x12', precio_base: '14500.00', iva_pct: '0.00' },
    'LAC-008': { nombre: 'Huevos blancos cubeta x12', precio_base: '13800.00', iva_pct: '0.00' },
    'LAC-009': { nombre: 'Crema de leche 250 ml', precio_base: '5900.00', iva_pct: '5.00' },
    'DES-004': { nombre: 'Sopa enlatada 300 g', precio_base: '5500.00', iva_pct: '5.00' },
    'DES-005': { nombre: 'Mermelada de mora 300 g', precio_base: '7900.00', iva_pct: '5.00' },
    'DES-006': { nombre: 'Mermelada de uva 300 g', precio_base: '7500.00', iva_pct: '5.00' },
    'DES-007': { nombre: 'Mermelada de kiwi 300 g', precio_base: '8500.00', iva_pct: '5.00' },
    'DES-008': { nombre: 'Mermelada de durazno 300 g', precio_base: '7900.00', iva_pct: '5.00' },
    'DES-009': { nombre: 'Mermelada de fresa 300 g', precio_base: '7900.00', iva_pct: '5.00' },
    'DES-010': { nombre: 'Cafe tostado oscuro 500 g', precio_base: '28900.00', iva_pct: '5.00' },
    'DES-011': { nombre: 'Cafe tostado claro 500 g', precio_base: '27900.00', iva_pct: '5.00' },
    'DES-012': { nombre: 'Cafe tostado medio 500 g', precio_base: '28500.00', iva_pct: '5.00' },
    'DES-013': { nombre: 'Cafe en grano 500 g', precio_base: '26900.00', iva_pct: '5.00' },
    'DES-014': { nombre: 'Cafetera moka 3 tazas', precio_base: '39900.00', iva_pct: '19.00' },
    'BEB-004': { nombre: 'Gaseosa naranja 350 ml (lata)', precio_base: '2800.00', iva_pct: '19.00' },
    'BEB-005': { nombre: 'Gaseosa cola light 350 ml (lata)', precio_base: '2800.00', iva_pct: '19.00' },
    'BEB-006': { nombre: 'Gaseosa limon 350 ml (lata)', precio_base: '2800.00', iva_pct: '19.00' },
    'BEB-007': { nombre: 'Bebida de almendra 250 ml', precio_base: '4500.00', iva_pct: '5.00' },
    'BEB-008': { nombre: 'Bebida de soya banano 250 ml', precio_base: '3500.00', iva_pct: '5.00' },
    'BEB-009': { nombre: 'Bebida de soya chocolate 250 ml', precio_base: '3500.00', iva_pct: '5.00' },
    'BEB-010': { nombre: 'Bebida de soya choco menta 250 ml', precio_base: '3800.00', iva_pct: '5.00' },
    'BEB-011': { nombre: 'Bebida de soya cafe 250 ml', precio_base: '3800.00', iva_pct: '5.00' },
    'BEB-012': { nombre: 'Bebida de soya te verde 250 ml', precio_base: '3900.00', iva_pct: '5.00' },
    'BEB-013': { nombre: 'Bebida de soya durazno 250 ml', precio_base: '3500.00', iva_pct: '5.00' },
    'BEB-014': { nombre: 'Bebida de soya original 250 ml', precio_base: '3200.00', iva_pct: '5.00' },
    'BEB-015': { nombre: 'Bebida de soya fresa 250 ml', precio_base: '3500.00', iva_pct: '5.00' },
    'BEB-016': { nombre: 'Te frio con perlas cafe 400 ml', precio_base: '9500.00', iva_pct: '19.00' },
    'BEB-017': { nombre: 'Te frio con perlas mango 400 ml', precio_base: '9500.00', iva_pct: '19.00' },
    'BEB-018': { nombre: 'Te frio con perlas te verde 400 ml', precio_base: '9900.00', iva_pct: '19.00' },
    'BEB-019': { nombre: 'Te frio con perlas y leche 400 ml', precio_base: '9500.00', iva_pct: '19.00' },
    'BEB-020': { nombre: 'Te frio con perlas fresa 400 ml', precio_base: '9500.00', iva_pct: '19.00' },
    'BEB-021': { nombre: 'Te frio con perlas taro 400 ml', precio_base: '9900.00', iva_pct: '19.00' },
    'BEB-022': { nombre: 'Te frio con perlas te tailandes 400 ml', precio_base: '9900.00', iva_pct: '19.00' },
    'BEB-023': { nombre: 'Cafe espresso para llevar', precio_base: '3500.00', iva_pct: '19.00' },
    'BEB-024': { nombre: 'Capuchino para llevar', precio_base: '5500.00', iva_pct: '19.00' },
    'BEB-025': { nombre: 'Te verde para llevar', precio_base: '3800.00', iva_pct: '19.00' },
    'BEB-026': { nombre: 'Te negro para llevar', precio_base: '3500.00', iva_pct: '19.00' },
    'PAN-003': { nombre: 'Torta de queso porcion', precio_base: '8900.00', iva_pct: '5.00' },
    'PAN-004': { nombre: 'Torta de chocolate porcion', precio_base: '8500.00', iva_pct: '5.00' },
    'PAN-005': { nombre: 'Torta de te verde porcion', precio_base: '9500.00', iva_pct: '5.00' },
    'PAN-006': { nombre: 'Torta red velvet porcion', precio_base: '9900.00', iva_pct: '5.00' },
    'PAN-007': { nombre: 'Torta de fresa porcion', precio_base: '8900.00', iva_pct: '5.00' },
    'PAN-008': { nombre: 'Onigiri de alga', precio_base: '5500.00', iva_pct: '5.00' },
    'PAN-009': { nombre: 'Onigiri de atun', precio_base: '6500.00', iva_pct: '5.00' },
    'PAN-010': { nombre: 'Onigiri de salmon', precio_base: '7500.00', iva_pct: '5.00' },
    'PAN-011': { nombre: 'Onigiri de huevo', precio_base: '6000.00', iva_pct: '5.00' },
    'PAN-012': { nombre: 'Onigiri de arroz y alga', precio_base: '5500.00', iva_pct: '5.00' },
    'PAN-013': { nombre: 'Brioche', precio_base: '3800.00', iva_pct: '5.00' },
    'PAN-014': { nombre: 'Croissant', precio_base: '4200.00', iva_pct: '5.00' },
    'PAN-015': { nombre: 'Pretzel', precio_base: '3500.00', iva_pct: '5.00' },
    'HEL-001': { nombre: 'Helado de fresa en cono', precio_base: '4500.00', iva_pct: '19.00' },
    'HEL-002': { nombre: 'Helado de chocolate en cono', precio_base: '4500.00', iva_pct: '19.00' },
    'HEL-003': { nombre: 'Helado de vainilla en cono', precio_base: '4500.00', iva_pct: '19.00' },
    'HEL-004': { nombre: 'Paleta de mora', precio_base: '2500.00', iva_pct: '19.00' },
    'HEL-005': { nombre: 'Paleta de limon', precio_base: '2500.00', iva_pct: '19.00' },
    'HEL-006': { nombre: 'Paleta de fresa', precio_base: '2500.00', iva_pct: '19.00' },
    'HEL-007': { nombre: 'Paleta de cereza', precio_base: '2500.00', iva_pct: '19.00' },
    'HEL-008': { nombre: 'Paleta de maracuya', precio_base: '2500.00', iva_pct: '19.00' }
};

// Inventario de compra de cada cliente de muestra: {sku: cantidad} (la fruta, en kg). En el hito 2 lo genera cada cliente.
const COMPRAS_DEMO = [
    { 'LAC-002': 6, 'LAC-001': 1, 'BEB-002': 2, 'FRU-001': 2, 'PAN-002': 1 },
    { 'FRU-002': 1, 'DES-002': 3, 'PAN-001': 1, 'FRU-003': 2, 'BEB-001': 4 },
    { 'CAR-001': 2, 'DES-001': 1, 'LIM-002': 5, 'FRU-001': 1 }
];

// Jornada: el tendero cobra un sueldo base del que se descuentan las pérdidas al cerrar (texto con 2 decimales, COP).
const JORNADA_CONFIG = {
    sueldoBase: '200000.00',
    inicio: '08:00', fin: '20:00',       // horario de la tienda (hora de juego)
    duracionMs: 600000,                  // lo que dura la jornada en tiempo real (10 min): 1 min real = 1 h 12 min de juego
    // Paciencia del cliente en caja: base + por unidad de su compra (ver paciencia.js)
    pacienciaBaseMs: 35000, pacienciaPorUnidadMs: 8000, pacienciaMaxUnidades: 12,
    pacienciaFilaFactor: 0.25            // los que esperan en la fila gastan su paciencia a este ritmo (1 = igual que el atendido)
};

// Paleta Endesga 32 (solo los tonos usados por los placeholders y textos)
const COLOR = {
    contorno: 0x181425, tinta: '#181425', blanco: 0xffffff,
    gris1: 0xc0cbdc, gris2: 0x8b9bb4, gris3: 0x5a6988, gris4: 0x3a4466, gris5: 0x262b44,
    crema: 0xead4aa, arena: 0xe4a672, madera: 0xb86f50, maderaOsc: 0x733e39,
    rojo: 0xe43b44, rojoOsc: 0xa22633, rosa: 0xf6757a, naranja: 0xfeae34, amarillo: 0xfee761,
    verde: 0x63c74d, verdeOsc: 0x3e8948, verdeMuyOsc: 0x265c42,
    cian: 0x2ce8f5, azul: 0x0099db, azulOsc: 0x124e89, piel: 0xe8b796, pielOsc: 0xc28569
};
