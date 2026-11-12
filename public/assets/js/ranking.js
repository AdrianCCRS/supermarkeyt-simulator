/**
 * Ranking de los mejores jugadores (top 5) y apodo del jugador.
 *
 * El juego NUNCA depende de esto: si no hay red o el servidor falla, la tabla muestra un aviso y todo lo demás sigue igual.
 * Lógica pura (sin DOM) para poder probarla en Node; el cableado de la página va al final, protegido por `document`.
 *
 * Contrato del servidor:
 *   GET  api/ranking.php -> {top: [{posicion, apodo, puntos}] (hasta 5), yo: null | {apodo|null, puntos, posicion|null}}
 *   POST api/apodo.php   -> {apodo}   · 422 inválido · 409 ya lo usa otro · 429 cambiado hace menos de 24 h
 *
 * Los apodos vienen de OTROS jugadores: se pintan siempre con textContent / Phaser text, nunca con innerHTML.
 */
const Ranking = (function () {
    const CLAVE = 'd2-apodo';
    const MIN = 3, MAX = 20;
    const PERMITIDO = /^[\p{L}\p{N} _-]+$/u;          // letras, números, espacio, _ y -

    /** Misma regla que el servidor (la palabra bloqueada la decide solo el servidor: responde 422 con su mensaje). */
    function validarApodo(texto) {
        const apodo = String(texto === undefined || texto === null ? '' : texto).trim();
        if (apodo.length < MIN) { return { ok: false, mensaje: 'El apodo debe tener al menos ' + MIN + ' caracteres' }; }
        if (apodo.length > MAX) { return { ok: false, mensaje: 'El apodo no puede pasar de ' + MAX + ' caracteres' }; }
        if (!PERMITIDO.test(apodo)) { return { ok: false, mensaje: 'Solo letras, números, espacios, _ y -' }; }
        return { ok: true, apodo };
    }

    /** Texto para el lienzo de Phaser: mayúsculas y sin tildes (la fuente pixel del juego no las usa), recortado a `max`. */
    function paraPantalla(texto, max) {
        let t = String(texto === undefined || texto === null ? '' : texto).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
        t = t.replace(/[^A-Z0-9 _\-.:,!?#$]/g, '?');
        return max && t.length > max ? t.slice(0, max - 1) + '.' : t;
    }

    /**
     * Qué mostrar para un estado. Devuelve {filas: [{posicion, apodo, puntos, yo}], aviso, pie}:
     *   aviso: texto discreto cuando no hay tabla (cargando, error, vacía) · pie: la posición propia si no está en el top, o una invitación.
     */
    function vista(estado) {
        const v = { filas: [], aviso: null, pie: null, yoFuera: null };
        if (!estado || estado.fase === 'inicial') { return v; }
        if (estado.fase === 'cargando') { v.aviso = 'Cargando ranking...'; return v; }
        if (estado.fase === 'error') { v.aviso = 'Ranking no disponible por ahora. El juego sigue igual.'; return v; }
        const yo = estado.yo || null;
        const top = Array.isArray(estado.top) ? estado.top.slice(0, 5) : [];
        v.filas = top.map((f) => ({
            posicion: f.posicion,
            apodo: String(f.apodo === undefined || f.apodo === null ? '' : f.apodo),
            puntos: f.puntos,
            yo: !!(yo && yo.posicion !== null && yo.posicion !== undefined && yo.posicion === f.posicion)
        }));
        if (!v.filas.length) { v.aviso = 'Aún no hay nadie en el ranking. ¡Sé el primero!'; }
        if (yo && yo.posicion && !v.filas.some((f) => f.yo)) {
            v.pie = 'Tú: puesto ' + yo.posicion + ' con ' + yo.puntos + ' puntos';
            v.yoFuera = { posicion: yo.posicion, apodo: String(yo.apodo || ''), puntos: yo.puntos };
        } else if (yo && !yo.apodo && yo.puntos > 0) {
            v.pie = 'Elige un apodo para salir en el ranking';
        }
        return v;
    }

    /**
     * Pinta el panel de pixel art del ranking en `contenedor` (la geometría está en styles.css, en píxeles del arte x --ur).
     * Los textos son de otros jugadores: solo textContent, nunca innerHTML.
     * Con filas (o con tu puesto fuera del top): panel de 5 filas; tu fila usa la imagen dorada. Si tu puesto está fuera del top,
     * ocupa la 5.ª fila con tu posición real. Sin filas (cargando, error, vacío): panel vacío con el mensaje.
     */
    function pintarPared(doc, contenedor, v) {
        while (contenedor.firstChild) { contenedor.removeChild(contenedor.firstChild); }
        const el = (tag, clase, texto) => {
            const e = doc.createElement(tag);
            e.className = clase;
            if (texto !== undefined) { e.textContent = texto; }
            return e;
        };
        const hayFilas = v.filas.length > 0 || !!v.yoFuera;
        const raiz = el('div', hayFilas ? 'rk' : 'rk rk-vacio');
        raiz.appendChild(el('div', 'rk-titulo', 'TOP 5 CAJEROS'));
        if (!hayFilas) {
            raiz.appendChild(el('div', 'rk-mensaje', v.aviso || 'Cargando ranking...'));
        } else {
            for (let k = 0; k < 5; k++) {
                const f = v.yoFuera && k === 4 ? { posicion: v.yoFuera.posicion, apodo: v.yoFuera.apodo || 'TU', puntos: v.yoFuera.puntos, yo: true } : v.filas[k];
                if (!f) { continue; }
                const tu = !!f.yo;
                const fila = el('div', (tu ? 'rk-tu' : 'rk-fila') + ' f' + k);
                if (k !== 0) { fila.appendChild(el('span', 'rk-pos', String(f.posicion))); }   // el 1.º lleva la corona en vez del número
                fila.appendChild(el('span', 'rk-apodo', f.apodo));
                fila.appendChild(el('span', 'rk-pts', String(f.puntos)));
                raiz.appendChild(fila);
            }
            if (v.filas.length) { raiz.appendChild(el('div', 'rk-corona')); }
        }
        contenedor.appendChild(raiz);
        if (v.pie && !v.yoFuera) { contenedor.appendChild(el('p', 'rk-pie', v.pie)); }
    }

    /**
     * api: {ranking(), fijarApodo(apodo)} que devuelven promesas · almacen: getItem/setItem (localStorage).
     * Guarda el apodo y si ya se le preguntó (solo se pregunta una vez; después, desde el perfil).
     */
    function crear(api, almacen) {
        let estado = { fase: 'inicial', top: [], yo: null };
        let local = { apodo: null, preguntado: false };
        const oyentes = [];
        let ultima = 0;                                   // descarta respuestas viejas si llegan desordenadas

        try {
            const g = JSON.parse(almacen.getItem(CLAVE));
            if (g && typeof g === 'object') {
                local = { apodo: typeof g.apodo === 'string' ? g.apodo : null, preguntado: !!g.preguntado };
            }
        } catch (e) { /* vacío o dañado: como nuevo */ }

        function guardar() { try { almacen.setItem(CLAVE, JSON.stringify(local)); } catch (e) { /* sin almacenamiento */ } }
        function avisar() { oyentes.slice().forEach((fn) => { try { fn(estado); } catch (e) { /* un oyente roto no afecta a los demás */ } }); }
        function poner(nuevo) { estado = nuevo; avisar(); }

        function cargar() {
            const n = ++ultima;
            poner({ fase: 'cargando', top: estado.top, yo: estado.yo });
            let p;
            try { p = Promise.resolve(api.ranking()); } catch (e) { p = Promise.reject(e); }
            return p.then((d) => {
                if (n !== ultima) { return estado; }
                if (!d || !Array.isArray(d.top)) { throw new Error('respuesta inesperada'); }
                if (d.yo && typeof d.yo.apodo === 'string' && d.yo.apodo !== local.apodo) { local.apodo = d.yo.apodo; guardar(); }
                poner({ fase: 'ok', top: d.top, yo: d.yo || null });
                return estado;
            }).catch(() => {
                if (n !== ultima) { return estado; }
                poner({ fase: 'error', top: [], yo: null });
                return estado;
            });                                           // nunca rechaza: quien llama no necesita manejar errores
        }

        /** Valida como el servidor y lo guarda. Resuelve con el apodo; rechaza con {mensaje} (también el 409/422/429 del servidor). */
        function fijarApodo(texto) {
            const v = validarApodo(texto);
            if (!v.ok) { return Promise.reject({ status: 0, mensaje: v.mensaje }); }
            let p;
            try { p = Promise.resolve(api.fijarApodo(v.apodo)); } catch (e) { p = Promise.reject(e); }
            return p.then((r) => {
                local.apodo = (r && r.apodo) || v.apodo;
                local.preguntado = true;
                guardar();
                cargar();                                 // el ranking se refresca solo, sin esperarlo
                return local.apodo;
            }, (e) => Promise.reject({ status: (e && e.status) || 0, mensaje: (e && e.mensaje) || 'No se pudo guardar el apodo' }));
        }

        return {
            estado: () => estado,
            vistaActual: () => vista(estado),
            apodo: () => local.apodo,
            /** ¿Toca preguntar el apodo? Solo si no tiene y nunca se le ha preguntado. */
            debePreguntar: () => !local.apodo && !local.preguntado,
            marcarPreguntado() { local.preguntado = true; guardar(); },
            cargar, fijarApodo,
            alCambiar(fn) { oyentes.push(fn); }
        };
    }

    // ---- Instancia del navegador ----
    const vacio = { getItem() { return null; }, setItem() {} };
    function almacenDelNavegador() { try { return window.localStorage || vacio; } catch (e) { return vacio; } }
    const api = typeof Api !== 'undefined'
        ? { ranking: () => Api.ranking(), fijarApodo: (a) => Api.fijarApodo(a) }
        : { ranking: () => Promise.reject(new Error('sin api')), fijarApodo: () => Promise.reject(new Error('sin api')) };
    const inst = crear(api, typeof window !== 'undefined' ? almacenDelNavegador() : vacio);

    // ---- Página (solo en el navegador) ----
    if (typeof document !== 'undefined') {
        const $id = (id) => document.getElementById(id);

        function pintarSeccion() {
            const caja = $id('ranking-pared');
            if (caja) { pintarPared(document, caja, inst.vistaActual()); }
        }
        /** Esquina de la pared (arriba a la izquierda, bajo el toldo) si el juego deja sitio; si no, una franja de pared bajo la acera. */
        function colocar() {
            const caja = $id('ranking-pared'), juego = document.querySelector('.escenario');
            if (!caja || !juego) { return; }
            const libre = juego.getBoundingClientRect().left;             // hueco de pared a la izquierda del juego
            const flota = libre >= 192;                                   // 160 de panel (x1) + 32 de margen
            caja.classList.toggle('flotante', flota);
            const ur = flota ? (libre >= 352 ? 2 : 1) : (window.innerWidth >= 352 ? 2 : 1);   // siempre escala ENTERA
            caja.style.setProperty('--ur', String(ur));
        }
        window.addEventListener('resize', colocar);
        window.addEventListener('load', colocar);
        inst.alCambiar(pintarSeccion);

        // Diálogo del apodo
        let alCerrar = null;
        function dialogo() { return $id('apodo'); }
        function abrirDialogo(despues) {
            const d = dialogo();
            if (!d) { if (despues) { despues(); } return; }
            alCerrar = despues || null;
            $id('apodo-error').textContent = '';
            $id('apodo-texto').value = inst.apodo() || '';
            d.hidden = false;
            if (typeof Juego !== 'undefined') { Juego.pausar(true, 'apodo'); }
            $id('apodo-texto').focus();
        }
        function cerrarDialogo() {
            const d = dialogo();
            if (!d || d.hidden) { return; }
            d.hidden = true;
            if (typeof Juego !== 'undefined') { Juego.pausar(false, 'apodo'); }
            const f = alCerrar; alCerrar = null;
            if (f) { f(); }
        }
        function enviarApodo() {
            const caja = $id('apodo-texto'), err = $id('apodo-error'), b = $id('apodo-guardar');
            const v = validarApodo(caja.value);
            err.textContent = v.ok ? '' : v.mensaje;
            if (!v.ok) { return; }
            b.disabled = true;
            inst.fijarApodo(v.apodo).then(() => { b.disabled = false; cerrarDialogo(); mostrarPerfilApodo(); },
                (e) => { b.disabled = false; err.textContent = e.mensaje; });
        }
        function mostrarPerfilApodo() {
            const el = $id('perfil-apodo');
            if (el) { el.textContent = inst.apodo() ? 'Apodo: ' + inst.apodo() : 'Sin apodo (no sales en el ranking)'; }
            const b = $id('btn-apodo');
            if (b) { b.textContent = inst.apodo() ? 'CAMBIAR APODO' : 'ELEGIR APODO'; }
        }

        document.addEventListener('DOMContentLoaded', () => {
            const d = dialogo();
            if (d) {
                $id('apodo-guardar').addEventListener('click', enviarApodo);
                $id('apodo-omitir').addEventListener('click', () => { inst.marcarPreguntado(); cerrarDialogo(); });
                const caja = $id('apodo-texto');
                caja.addEventListener('keydown', (e) => {
                    e.stopPropagation();                                  // escribir no debe activar P, M, F... del juego
                    if (e.key === 'Enter') { e.preventDefault(); enviarApodo(); }
                    else if (e.key === 'Escape') { inst.marcarPreguntado(); cerrarDialogo(); }
                });
            }
            const bApodo = $id('btn-apodo');
            if (bApodo) { bApodo.addEventListener('click', () => abrirDialogo()); }
            const bAct = $id('ranking-actualizar');
            if (bAct) { bAct.addEventListener('click', () => { inst.cargar(); bAct.blur(); }); }

            // Código de recuperación (= el UUID del navegador): copiarlo y pegarlo en otro navegador
            const bCopiar = $id('btn-codigo'), bPegar = $id('btn-pegar-codigo');
            if (bCopiar) {
                bCopiar.addEventListener('click', () => {
                    const codigo = Jugador.id();
                    const respaldo = () => window.prompt('Copia este código y guárdalo (no lo compartas):', codigo);
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(codigo).then(() => { window.alert('Código copiado. Guárdalo y no lo compartas: quien lo tenga puede jugar como tú.'); }, respaldo);
                    } else { respaldo(); }
                });
            }
            if (bPegar) {
                bPegar.addEventListener('click', () => {
                    const t = window.prompt('Pega aquí tu código de recuperación:');
                    if (t === null) { return; }
                    if (!Jugador.valido(t)) { window.alert('Ese código no es válido.'); return; }
                    if (window.confirm('Este navegador pasará a ser el de ese código. Tu jornada y tu inventario actuales de aquí se dejan de usar. ¿Seguir?')) {
                        Jugador.fijar(t);
                        window.location.reload();
                    }
                });
            }
            mostrarPerfilApodo();
            pintarSeccion();
            colocar();
            inst.cargar();                                                // al entrar al juego (menú principal)
        });

        inst.abrirDialogo = abrirDialogo;
    }

    return Object.assign({ crear, validarApodo, paraPantalla, vista, pintarPared, MIN, MAX }, inst);
})();
