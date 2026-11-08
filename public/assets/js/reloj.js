/**
 * Reloj de la jornada: el tiempo del juego va más rápido que el real.
 * Lógica pura (sin Phaser): una jornada de 08:00 a 20:00 dura `duracionMs` milisegundos reales.
 */
const Reloj = (function () {
    function aMinutos(hhmm) {
        const [h, m] = hhmm.split(':').map(Number);
        return h * 60 + m;
    }

    /** opciones: {inicio: '08:00', fin: '20:00', duracionMs: 600000} */
    function crear(opciones) {
        const inicio = aMinutos((opciones && opciones.inicio) || '08:00');
        const fin = aMinutos((opciones && opciones.fin) || '20:00');
        const duracion = (opciones && opciones.duracionMs) || 600000;
        let t = 0;
        return {
            avanzar(ms) { t = Math.min(duracion, t + Math.max(0, ms)); },
            reiniciar() { t = 0; },
            /** Milisegundos transcurridos (para guardar y recuperar la jornada). */
            tiempo() { return t; },
            fijar(ms) { t = Math.min(duracion, Math.max(0, Number(ms) || 0)); },
            terminado() { return t >= duracion; },
            progreso() { return t / duracion; },
            /** Minutos desde las 00:00 (de la hora de juego). */
            minutos() { return inicio + Math.floor((fin - inicio) * t / duracion); },
            /** "08:00" */
            texto() {
                const m = this.minutos();
                return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
            }
        };
    }

    return { crear };
})();
