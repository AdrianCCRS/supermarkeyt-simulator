/**
 * Compra aleatoria de un cliente: el "inventario de compra" {sku: cantidad} (la fruta, en kg).
 * Lógica pura (sin Phaser ni red) para poder probarla. Más adelante el backend podrá aportar sus propias
 * compras con Juego.setGeneradorCompras(fn); mientras tanto el juego usa Compra.generar con el catálogo.
 */
const Compra = (function () {
    const LINEAS_MIN = 2, LINEAS_MAX = 5;        // productos distintos por cliente
    const UNIDADES_MAX = 12;                     // piezas en la banda por cliente (la fruta cuenta como una sola pieza)

    function entre(rnd, a, b) { return a + Math.floor(rnd() * (b - a + 1)); }

    /**
     * opciones: { skus: [..], esFruta: sku => bool, rnd: () => [0,1) }
     * Devuelve {sku: cantidad}: 2 a 5 productos distintos; frutas de 1 a 3 kg; el resto de 1 a 4 unidades (más a menudo 1 o 2);
     * como mucho UNIDADES_MAX piezas en la banda.
     */
    function generar(opciones) {
        const rnd = opciones.rnd || Math.random;
        const esFruta = opciones.esFruta || (() => false);
        const pool = Array.from(new Set(opciones.skus || []));
        if (!pool.length) { return {}; }
        const lineas = Math.min(pool.length, entre(rnd, LINEAS_MIN, LINEAS_MAX));
        for (let i = pool.length - 1; i > 0; i--) {                      // baraja Fisher-Yates
            const j = Math.floor(rnd() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        const compra = {};
        let piezas = 0;
        pool.slice(0, lineas).forEach((sku) => {
            let cant;
            if (esFruta(sku)) { cant = entre(rnd, 1, 3); }
            else { cant = rnd() < 0.65 ? entre(rnd, 1, 2) : entre(rnd, 3, 4); }
            const aporta = esFruta(sku) ? 1 : cant;
            if (piezas + aporta > UNIDADES_MAX) {
                if (esFruta(sku) || UNIDADES_MAX - piezas < 1) { return; }
                cant = UNIDADES_MAX - piezas;
            }
            compra[sku] = cant;
            piezas += esFruta(sku) ? 1 : cant;
        });
        return compra;
    }

    return { generar, LINEAS_MIN, LINEAS_MAX, UNIDADES_MAX };
})();
