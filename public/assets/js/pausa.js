/*
 * Pausa: botón PAUSA o tecla P. Detiene la caja (reloj, paciencia de los clientes, animaciones) y la música mediante Juego.pausar.
 * Un velo sobre el juego avisa; un clic en él, el botón o P otra vez, y sigue. No se puede pausar con la ayuda abierta
 * (la ayuda ya pausa por su cuenta).
 */
(function () {
    const boton = document.getElementById('btn-pausa');
    const velo = document.getElementById('pausa');
    if (!boton || !velo) { return; }

    function pausada() { return !velo.hidden; }
    function ayudaAbierta() { const a = document.getElementById('ayuda'); return !!a && !a.hidden; }

    function poner(valor) {
        velo.hidden = !valor;
        boton.textContent = valor ? 'SEGUIR' : 'PAUSA';
        boton.setAttribute('aria-pressed', valor ? 'true' : 'false');
        Juego.pausar(valor, 'pausa');
        if (!valor) { boton.blur(); }                      // para que la barra espaciadora o Enter no vuelvan a pulsarlo
    }

    boton.addEventListener('click', () => { if (!ayudaAbierta()) { poner(!pausada()); } });
    velo.addEventListener('click', () => poner(false));
    document.addEventListener('keydown', function (e) {
        if ((e.key === 'p' || e.key === 'P') && !e.ctrlKey && !e.metaKey && !e.altKey && !ayudaAbierta()) { poner(!pausada()); }
    });
})();
