/*
 * Carga los scripts del juego, en orden, con ?v=VERSION para que el navegador no use una copia vieja tras desplegar.
 *
 * Es un archivo aparte (y no un <script> dentro de index.html) porque la política de seguridad del sitio
 * (script-src 'self', ver public/.htaccess) no admite scripts en línea.
 * VERSION sale del propio ?v= de este archivo: index.html lo carga como cargador.js?v=..., y el build de la imagen
 * (deploy/Containerfile) sustituye ese valor por el commit desplegado. Al cambiar, el navegador pide también este archivo.
 * Para añadir un script al juego, ponlo en la lista (el orden importa).
 */
(function () {
    var actual = document.currentScript;
    var m = actual && /[?&]v=([^&#]*)/.exec(actual.src);
    var VERSION = m ? m[1] : 'dev';
    var scripts = [
        'money.js',
        'pricing.js',
        'venta.js',
        'auditoria.js',
        'cobro.js',
        'compra.js',
        'reloj.js',
        'paciencia.js',
        'perfil.js',
        'sonido.js',
        'nombres.js',
        'jugador.js',
        'api.js',
        'ranking.js',
        'phaser/assets.js',
        'phaser/CheckoutScene.js',
        'phaser/ControlJornada.js',
        'phaser/HudScene.js',
        'phaser/config.js',
        'pantalla.js',
        'ayuda.js',
        'pausa.js',
        'app.js'
    ];
    // document.write mantiene el orden de ejecución, como si estuvieran escritos uno tras otro en el HTML
    scripts.forEach(function (s) { document.write('<script src="assets/js/' + s + '?v=' + VERSION + '"><\/script>'); });
})();
