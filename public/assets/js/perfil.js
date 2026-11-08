/**
 * Progreso del jugador, guardado en su navegador (localStorage), sin cuentas ni servidor: como los juegos flash de antes.
 * Acumula lo que pasó en las jornadas cerradas: cuántas, puntos, ventas, mejores marcas.
 * Si el jugador borra los datos del navegador, empieza de cero. Importes en CENTAVOS.
 */
const Perfil = (function () {
    const CLAVE = 'd2-perfil';
    const NUEVO = () => ({ jornadas: 0, clientes: 0, exactas: 0, abandonos: 0, ventas: 0, puntos: 0, mejorPuntos: 0, mejorSueldo: 0 });

    /** almacen: algo con getItem/setItem (localStorage). Si falla o no hay, el progreso solo vive mientras la página esté abierta. */
    function crear(almacen) {
        let d = NUEVO();
        try {
            const g = JSON.parse(almacen.getItem(CLAVE));
            if (g && typeof g === 'object') {
                Object.keys(d).forEach((k) => { d[k] = Number.isFinite(g[k]) ? g[k] : d[k]; });
            }
        } catch (e) { /* vacío o dañado: se empieza de cero */ }

        function guardar() { try { almacen.setItem(CLAVE, JSON.stringify(d)); } catch (e) { /* sin almacenamiento */ } }

        return {
            datos() { return Object.assign({}, d); },
            /** Suma una jornada cerrada (el resumen de Juego.resumenJornada). Devuelve qué marcas se batieron. */
            registrarJornada(resumen) {
                const primera = d.jornadas === 0;
                const recordPuntos = resumen.puntos > d.mejorPuntos;
                const recordSueldo = resumen.sueldo > d.mejorSueldo;
                d.jornadas++;
                d.clientes += resumen.clientes;
                d.exactas += resumen.exactas;
                d.abandonos += resumen.abandonos || 0;
                d.ventas += resumen.cobrado;
                d.puntos += resumen.puntos;
                if (recordPuntos) { d.mejorPuntos = resumen.puntos; }
                if (recordSueldo) { d.mejorSueldo = resumen.sueldo; }
                guardar();
                return { primera, recordPuntos, recordSueldo };
            },
            reiniciar() { d = NUEVO(); guardar(); }
        };
    }

    function almacenDelNavegador() {
        try { return window.localStorage || { getItem() { return null; }, setItem() {} }; } catch (e) { return { getItem() { return null; }, setItem() {} }; }
    }
    const jugador = typeof window !== 'undefined' ? crear(almacenDelNavegador()) : crear({ getItem() { return null; }, setItem() {} });

    /** Línea de texto de la página con el progreso (#perfil), si existe. */
    function mostrar() {
        if (typeof document === 'undefined') { return; }
        const el = document.getElementById('perfil');
        if (!el) { return; }
        const p = jugador.datos();
        const dinero = (c) => '$' + Math.round(c / 100).toLocaleString('es-CO');
        el.querySelector('.perfil-datos').textContent = p.jornadas === 0
            ? 'Aún no has cerrado ninguna jornada. Tu progreso se guarda en este navegador.'
            : p.jornadas + ' jornada' + (p.jornadas === 1 ? '' : 's') + ' · ' + p.clientes + ' clientes · ' + p.puntos + ' puntos (mejor: ' + p.mejorPuntos + ') · mejor sueldo ' + dinero(p.mejorSueldo);
        el.querySelector('button').hidden = p.jornadas === 0;
    }
    if (typeof document !== 'undefined') {
        document.addEventListener('DOMContentLoaded', () => {
            const b = document.querySelector('#perfil button');
            if (b) { b.addEventListener('click', () => { if (confirm('¿Borrar tu progreso guardado en este navegador?')) { jugador.reiniciar(); mostrar(); } }); }
            mostrar();
        });
    }

    return {
        crear,
        datos: () => jugador.datos(),
        registrarJornada(resumen) { const r = jugador.registrarJornada(resumen); mostrar(); return r; },
        reiniciar() { jugador.reiniciar(); mostrar(); }
    };
})();
