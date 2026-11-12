/*
 * Pantallas de ayuda: un panel HTML (en index.html, #ayuda) con varias páginas.
 * Se abre con el botón AYUDA o la tecla H (también ?), y sola la primera vez que se visita el juego.
 * Mientras está abierta el juego se pausa (Juego.pausar), para no perder tiempo ni paciencia de clientes leyendo.
 * Con el panel abierto: ← → cambian de página, Esc cierra.
 */
(function () {
    const CLAVE = 'd2-ayuda';                       // localStorage: '1' cuando ya vio la ayuda
    const panel = document.getElementById('ayuda');
    if (!panel) { return; }

    const paginas = Array.from(panel.querySelectorAll('.ayuda-pagina'));
    const titulo = panel.querySelector('#ayuda-titulo');
    const puntos = panel.querySelector('.ayuda-puntos');
    const cuerpo = panel.querySelector('.ayuda-cuerpo');
    const btnAtras = panel.querySelector('[data-ayuda="atras"]');
    const btnSiguiente = panel.querySelector('[data-ayuda="siguiente"]');
    const btnAbrir = document.getElementById('btn-ayuda');
    let actual = 0;
    let anterior = null;                            // el elemento que tenía el foco, para devolvérselo al cerrar

    function leerVista() { try { return localStorage.getItem(CLAVE) === '1'; } catch (e) { return false; } }
    function guardarVista() { try { localStorage.setItem(CLAVE, '1'); } catch (e) { /* sin almacenamiento: no pasa nada */ } }

    function abierta() { return !panel.hidden; }

    function mostrar(i) {
        actual = Math.max(0, Math.min(paginas.length - 1, i));
        paginas.forEach((p, n) => { p.hidden = n !== actual; });
        titulo.textContent = 'AYUDA ' + (actual + 1) + '/' + paginas.length;
        Array.from(puntos.children).forEach((p, n) => p.classList.toggle('activo', n === actual));
        btnAtras.disabled = actual === 0;
        const ultima = actual === paginas.length - 1;
        btnSiguiente.textContent = ultima ? 'A JUGAR' : 'SIGUIENTE';
        btnSiguiente.classList.toggle('ayuda-principal', ultima);
        cuerpo.scrollTop = 0;
    }

    function abrir(pagina) {
        if (abierta()) { return; }
        anterior = document.activeElement;
        panel.hidden = false;
        mostrar(pagina || 0);
        if (typeof Juego !== 'undefined') { Juego.pausar(true); }
        btnSiguiente.focus();
    }

    function cerrar() {
        if (!abierta()) { return; }
        panel.hidden = true;
        guardarVista();
        if (typeof Juego !== 'undefined') { Juego.pausar(false); }
        if (anterior && anterior.focus) { anterior.focus(); }
        if (document.activeElement && document.activeElement.blur && document.activeElement === btnAbrir) { document.activeElement.blur(); }
    }

    paginas.forEach(() => { puntos.appendChild(document.createElement('span')); });

    btnAtras.addEventListener('click', () => mostrar(actual - 1));
    btnSiguiente.addEventListener('click', () => { if (actual === paginas.length - 1) { cerrar(); } else { mostrar(actual + 1); } });
    panel.querySelector('[data-ayuda="cerrar"]').addEventListener('click', cerrar);
    panel.addEventListener('click', (e) => { if (e.target === panel) { cerrar(); } });       // clic fuera del panel
    if (btnAbrir) { btnAbrir.addEventListener('click', () => (abierta() ? cerrar() : abrir(0))); }

    // En fase de captura y deteniendo el evento: con la ayuda abierta las teclas no llegan al juego (← → mueven el libro de códigos).
    document.addEventListener('keydown', function (e) {
        if (e.ctrlKey || e.metaKey || e.altKey) { return; }
        if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName)) { return; }       // escribiendo (el apodo): no es un atajo
        if (!abierta()) {
            if (e.key === 'h' || e.key === 'H' || e.key === '?') { e.preventDefault(); abrir(0); }
            return;
        }
        if (e.key === 'Escape' || e.key === 'h' || e.key === 'H' || e.key === '?') { cerrar(); }
        else if (e.key === 'ArrowLeft') { mostrar(actual - 1); }
        else if (e.key === 'ArrowRight') { mostrar(actual + 1); }
        else if (e.key === 'Tab') {                                                           // el foco se queda dentro del panel
            const foco = Array.from(panel.querySelectorAll('button:not(:disabled)'));
            const i = foco.indexOf(document.activeElement);
            const siguiente = foco[(i + (e.shiftKey ? -1 : 1) + foco.length) % foco.length];
            e.preventDefault();
            siguiente.focus();
        } else { return; }                                                                   // F y M siguen funcionando
        e.stopPropagation();
    }, true);

    mostrar(0);
    if (!leerVista()) { abrir(0); }                 // primera visita: se enseña sola
})();
