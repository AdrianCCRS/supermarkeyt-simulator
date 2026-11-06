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
    libro:       { path: 'caja/libro.png',         w: 144, h: 102 }
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
const SKUS = [
    'FRU-001', 'FRU-002', 'FRU-003', 'LAC-001', 'LAC-002', 'LAC-003',
    'CAR-001', 'CAR-002', 'CAR-003', 'DES-001', 'DES-002', 'DES-003',
    'BEB-001', 'BEB-002', 'BEB-003', 'PAN-001', 'PAN-002',
    'LIM-001', 'LIM-002', 'HIG-001'
];
SKUS.forEach((sku) => {
    ASSETS[sku] = { path: 'icons/' + sku.toLowerCase() + '.png', w: 16, h: 16 };
});

// Productos sin código de barras: se pesan y se cobran tecleando su PLU.
// La cantidad que se envía a la API es el peso en kg (entero), porque el
// backend vende estos productos por unidades de 1 kg.
const PLU = {
    '4016': 'FRU-001',   // Manzanas rojas
    '4011': 'FRU-002',   // Bananas
    '4664': 'FRU-003'    // Tomates
};

// Precios de muestra (los del seed) para cuando el catálogo de la API aún no se ha cargado.
const PRECIOS_DEMO = { 'FRU-001': '2500.00', 'FRU-002': '1800.00', 'FRU-003': '2300.00' };

// Paleta Endesga 32 (solo los tonos usados por los placeholders y textos)
const COLOR = {
    contorno: 0x181425, tinta: '#181425', blanco: 0xffffff,
    gris1: 0xc0cbdc, gris2: 0x8b9bb4, gris3: 0x5a6988, gris4: 0x3a4466, gris5: 0x262b44,
    crema: 0xead4aa, arena: 0xe4a672, madera: 0xb86f50, maderaOsc: 0x733e39,
    rojo: 0xe43b44, rojoOsc: 0xa22633, rosa: 0xf6757a, naranja: 0xfeae34, amarillo: 0xfee761,
    verde: 0x63c74d, verdeOsc: 0x3e8948, verdeMuyOsc: 0x265c42,
    cian: 0x2ce8f5, azul: 0x0099db, azulOsc: 0x124e89, piel: 0xe8b796, pielOsc: 0xc28569
};
