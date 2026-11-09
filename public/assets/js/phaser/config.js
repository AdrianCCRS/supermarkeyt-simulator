/*
 * Arranque de Phaser. Lienzo lógico 480x270 (x2 = 960x540, x4 = 1920x1080).
 * Espera a la fuente pixel para que los textos no se dibujen con otra.
 * Se llama desde app.js: Juego.iniciar().
 */
const Juego = (function () {
    let game = null;
    let cobrador = null;        // función que cobra (ver cobro.js); por defecto, el simulador local
    let catalogo = [];          // productos de la API: [{sku, precio_base, ...}]

    /** app.js entrega aquí el catálogo cargado de la API. */
    function setCatalogo(productos) { catalogo = productos || []; }

    /**
     * Cobro en efectivo. El juego llama a Juego.cobrar({carrito, efectivo}) y espera una promesa:
     *   resuelve {total, cambio} en centavos · rechaza {status, mensaje}.
     * Por defecto es un simulador local de checkout.php; para usar el backend real se sustituye con
     *   Juego.setCobrador(({carrito, efectivo}) => Api.checkout(...).then((v) => ({total: ..., cambio: ...})))
     */
    function cobrar(pedido) {
        if (!cobrador) { cobrador = Cobro.local(producto); }
        return cobrador(pedido);
    }
    function setCobrador(fn) { cobrador = fn; }

    /** Datos de un SKU ({nombre, precio_base, iva_pct}): de la API si está cargada, si no los de muestra. */
    // Compras de los clientes. Por defecto se generan al azar con el catálogo; el backend puede aportar las suyas:
    //   Juego.setGeneradorCompras(() => ({ 'LAC-002': 2, 'FRU-001': 1 }))      // {sku: cantidad}, la fruta en kg
    let generadorCompras = null;
    function setGeneradorCompras(fn) { generadorCompras = fn || null; }
    function compraAleatoria(esFruta) {
        if (generadorCompras) { return generadorCompras(); }
        const skus = catalogo.length ? catalogo.map((p) => p.sku) : Object.keys(PRODUCTOS_DEMO);
        return Compra.generar({ skus, esFruta });
    }

    // Jornada: la abre y la cierra el backend. Por defecto (sin backend) el juego abre y cierra por su cuenta:
    //   Juego.setJornadaHooks({
    //       abrir:  () => Api.abrirJornada(),                       // promesa -> {id}   (rechaza {status, mensaje})
    //       cerrar: (resumen) => Api.cerrarJornada(jornadaId)       // promesa; resumen = Juego.resumenJornada() (centavos)
    //   });
    //   Juego.setJornada({ id })   // una jornada que ya estaba abierta al cargar la página (Api.jornadaActual)
    let hooksJornada = {};
    let jornadaActual = null;
    let contadorLocal = 0;
    function setJornadaHooks(h) { hooksJornada = h || {}; }
    function abrirJornada() {
        return Promise.resolve(hooksJornada.abrir ? hooksJornada.abrir() : { id: ++contadorLocal });
    }
    function cerrarJornada(resumen) {
        return Promise.resolve(hooksJornada.cerrar ? hooksJornada.cerrar(resumen) : {});
    }
    function setJornada(j) {
        jornadaActual = j || null;
        if (game) { game.scene.getScene('CheckoutScene').jornada.sincronizar(jornadaActual); }
    }

    // Pausa (la pide la pantalla de ayuda): la caja deja de actualizarse, así que el reloj, la paciencia y las animaciones se detienen.
    let pausado = false;
    function aplicarPausa() {
        if (!game) { return; }
        const escena = game.scene.getScene('CheckoutScene');
        if (!escena || !escena.listo) { return; }          // aún cargando: CheckoutScene vuelve a llamar a esto al terminar de crearse
        if (pausado && escena.sys.isActive()) { game.scene.pause('CheckoutScene'); }
        else if (!pausado && escena.sys.isPaused()) { game.scene.resume('CheckoutScene'); }
    }
    function pausar(valor) { pausado = !!valor; aplicarPausa(); }

    function producto(sku) {
        const p = catalogo.find((x) => x.sku === sku);
        return p || Object.assign({ sku }, PRODUCTOS_DEMO[sku]);
    }

    function iniciar() {
        if (game) { return game; }
        const crear = () => {
            game = new Phaser.Game({
                type: Phaser.AUTO,
                parent: 'game',
                width: 480,
                height: 270 + HUD.alto,
                pixelArt: true,        // nearest-neighbor y sin antialiasing
                roundPixels: true,
                backgroundColor: '#181425',
                scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
                scene: [CheckoutScene, HudScene]
            });
        };
        document.fonts.load('8px "Press Start 2P"').then(crear, crear);
    }

    /**
     * Resumen de la jornada para el cierre (lo consulta quien cierra la jornada, p. ej. el jQuery del botón):
     * {clientes, exactas, protestas, puntos, cobrado, perdida, sobrecobro, faltantes:{sku:cant}, sobrantes:{sku:cant},
     *  sueldo_base, sueldo, descuento}. Los importes están en CENTAVOS (usar Money.fromCents para mostrarlos).
     */
    function resumenJornada() {
        return game.scene.getScene('CheckoutScene').jornadaJuego.resumen();
    }

    return { iniciar, juego: () => game, setCatalogo, setGeneradorCompras, setJornadaHooks, setJornada, jornadaActual: () => jornadaActual, abrirJornada, cerrarJornada, compraAleatoria, producto, resumenJornada, cobrar, setCobrador, pausar, aplicarPausa };
})();
