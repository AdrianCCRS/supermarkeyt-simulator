/*
 * Modo «pantalla grande»: oculta la decoración de la calle y deja el juego a todo el alto de la ventana.
 * Se activa con el botón o la tecla F, y se recuerda entre visitas (o con #grande en la dirección).
 * Es solo presentación: no toca el juego ni la API.
 */
(function () {
    const CLAVE = 'pantalla-grande';
    const boton = document.getElementById('btn-pantalla');

    function recordado() {
        try { return localStorage.getItem(CLAVE) === '1'; } catch (e) { return false; }
    }
    function recordar(valor) {
        try { localStorage.setItem(CLAVE, valor ? '1' : '0'); } catch (e) { /* sin almacenamiento: no pasa nada */ }
    }

    function aplicar(grande) {
        document.body.classList.toggle('grande', grande);
        boton.textContent = grande ? 'VOLVER A LA CALLE' : 'PANTALLA GRANDE';
        window.dispatchEvent(new Event('resize'));          // Phaser reajusta el lienzo al nuevo tamaño
    }

    function alternar() {
        const grande = !document.body.classList.contains('grande');
        recordar(grande);
        aplicar(grande);
    }

    boton.addEventListener('click', alternar);
    document.addEventListener('keydown', function (e) {
        if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey && !e.altKey) { alternar(); }
    });

    aplicar(location.hash === '#grande' || recordado());
})();
