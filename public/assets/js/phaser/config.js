/*
 * Arranque de Phaser. Lienzo lógico 480x270 (x2 = 960x540, x4 = 1920x1080).
 * Espera a la fuente pixel para que los textos no se dibujen con otra.
 * Se llama desde app.js: Juego.iniciar().
 */
const Juego = (function () {
    let game = null;
    let catalogo = [];          // productos de la API: [{sku, precio_base, ...}]

    /** app.js entrega aquí el catálogo cargado de la API. */
    function setCatalogo(productos) { catalogo = productos || []; }

    /** Precio base de un SKU como texto ("2500.00"): de la API si está cargada, si no el de muestra. */
    function precioDe(sku) {
        const p = catalogo.find((x) => x.sku === sku);
        return p ? p.precio_base : (PRECIOS_DEMO[sku] || null);
    }

    function iniciar() {
        if (game) { return game; }
        const crear = () => {
            game = new Phaser.Game({
                type: Phaser.AUTO,
                parent: 'game',
                width: 480,
                height: 270,
                pixelArt: true,        // nearest-neighbor y sin antialiasing
                roundPixels: true,
                backgroundColor: '#181425',
                scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
                scene: [CheckoutScene]
            });
        };
        document.fonts.load('8px "Press Start 2P"').then(crear, crear);
    }

    return { iniciar, juego: () => game, setCatalogo, precioDe };
})();
