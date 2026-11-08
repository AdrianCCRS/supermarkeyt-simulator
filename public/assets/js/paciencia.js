/**
 * Paciencia del cliente en caja. Lógica pura (sin Phaser): se gasta con el tiempo mientras el cliente espera
 * a que lo atiendan, y cuanto más compra, más aguanta.
 */
const Paciencia = (function () {
    /** Milisegundos que aguanta un cliente con `unidades` productos (la fruta cuenta como 1). */
    function duracion(unidades, opciones) {
        const base = (opciones && opciones.pacienciaBaseMs) || 35000;
        const porUnidad = (opciones && opciones.pacienciaPorUnidadMs) || 8000;
        const tope = (opciones && opciones.pacienciaMaxUnidades) || 12;
        return base + porUnidad * Math.min(Math.max(0, unidades), tope);
    }

    function crear(duracionMs) {
        let t = 0;
        return {
            avanzar(ms) { t = Math.min(duracionMs, t + Math.max(0, ms)); },
            agotada() { return t >= duracionMs; },
            /** Lo que le queda: de 1 (llena) a 0 (agotada). */
            restante() { return 1 - t / duracionMs; },
            /** 'alta' · 'media' · 'baja' (para el color de la barra y la cara). */
            nivel() { const r = 1 - t / duracionMs; return r > 0.5 ? 'alta' : (r > 0.25 ? 'media' : 'baja'); }
        };
    }

    return { duracion, crear };
})();
