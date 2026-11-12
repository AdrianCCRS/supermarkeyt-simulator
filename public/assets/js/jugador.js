/**
 * Identidad anónima del jugador: un UUID aleatorio que se crea la primera vez y se guarda en el navegador (localStorage).
 * No es una cuenta ni lleva datos personales: solo le dice al servidor «esta es la jornada y el stock de este navegador»
 * (cabecera X-Jugador, ver api.js). Si el jugador borra los datos del sitio, empieza como uno nuevo.
 */
const Jugador = (function () {
    const CLAVE = 'd2-jugador';
    const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    let enMemoria = null;                       // si no hay localStorage, el id dura lo que dure la página

    function nuevo() {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) { return crypto.randomUUID(); }
        const hex = (n) => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join('');
        return hex(8) + '-' + hex(4) + '-4' + hex(3) + '-' + '89ab'[Math.floor(Math.random() * 4)] + hex(3) + '-' + hex(12);
    }

    function id() {
        if (enMemoria) { return enMemoria; }
        try {
            const guardado = localStorage.getItem(CLAVE);
            if (guardado && UUID.test(guardado)) { return (enMemoria = guardado); }
            enMemoria = nuevo();
            localStorage.setItem(CLAVE, enMemoria);
        } catch (e) {
            enMemoria = enMemoria || nuevo();
        }
        return enMemoria;
    }

    /** ¿Es un código de recuperación (UUID) válido? */
    function valido(texto) { return UUID.test(String(texto || '').trim().toLowerCase()); }

    /** Adopta el código de otro navegador (copiado de allí): conserva su apodo y sus puntos. Devuelve false si no es un UUID. */
    function fijar(texto) {
        if (!valido(texto)) { return false; }
        enMemoria = String(texto).trim().toLowerCase();
        try { localStorage.setItem(CLAVE, enMemoria); } catch (e) { /* solo dura esta página */ }
        return true;
    }

    return { id, valido, fijar };
})();
