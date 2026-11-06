/*
 * Cobro en efectivo. Lógica pura, sin Phaser ni DOM, ni llamadas a la API.
 *
 *  - generarBilletes(): con qué billetes paga el cliente (lo que el tendero tiene que LEER y sumar).
 *  - local(): cobrador de pruebas que imita a checkout.php (valida el efectivo y calcula el cambio).
 *    Se sustituye por la llamada real con Juego.setCobrador(); ver docs/MECANICA_PAGO.md.
 *
 * Contrato de un cobrador (local o real):
 *   cobrador({carrito: {sku: cantidad}, efectivo: centavos}) -> Promise
 *     resuelve  {total: centavos, cambio: centavos}
 *     rechaza   {status: 422|409|..., mensaje: "texto"}      (422 = efectivo insuficiente: se reintenta)
 */
const Cobro = (function () {
    const BILLETES = [2000, 5000, 10000, 20000, 50000, 100000];     // COP, de menor a mayor
    const MAX_BILLETES = 5;           // billetes en total
    const MAX_DENOMINACIONES = 3;     // la bandeja tiene 3 compartimentos

    /**
     * Combinación de billetes que cubre el total, sin pasarse mucho. totalCentavos: lo que debe el cliente.
     * rnd: función que devuelve un número en [0, 1) (se inyecta para poder probarla).
     * Devuelve {cuentas: {2000: n, ...}, suma: centavos}.
     */
    function generarBilletes(totalCentavos, rnd) {
        const total = Math.ceil(totalCentavos / 100);             // en pesos
        const candidatos = [];
        const cuentas = new Array(BILLETES.length).fill(0);
        (function recorrer(i, usados, suma) {
            if (i === BILLETES.length) {
                const tipos = cuentas.filter((c) => c > 0).length;
                if (suma >= total && tipos > 0 && tipos <= MAX_DENOMINACIONES) {
                    candidatos.push({ suma, cuentas: cuentas.slice() });
                }
                return;
            }
            for (let c = 0; c + usados <= MAX_BILLETES; c++) {
                cuentas[i] = c;
                recorrer(i + 1, usados + c, suma + c * BILLETES[i]);
            }
            cuentas[i] = 0;
        })(0, 0, 0);

        let elegido;
        if (candidatos.length === 0) {                            // totales enormes: solo billetes de 100.000
            const n = Math.ceil(total / 100000);
            elegido = { suma: n * 100000, cuentas: [0, 0, 0, 0, 0, n] };
        } else {
            // las sumas posibles más cercanas al total (una combinación por suma distinta); se elige una al azar, sesgada a las más justas
            candidatos.sort((a, b) => a.suma - b.suma || a.cuentas.reduce((x, y) => x + y) - b.cuentas.reduce((x, y) => x + y));
            const distintas = [];
            candidatos.forEach((c) => { if (!distintas.length || distintas[distintas.length - 1].suma !== c.suma) { distintas.push(c); } });
            const k = Math.min(4, distintas.length);
            elegido = distintas[Math.floor(rnd() * rnd() * k)];
        }
        const out = {};
        elegido.cuentas.forEach((c, i) => { if (c > 0) { out[BILLETES[i]] = c; } });
        return { cuentas: out, suma: elegido.suma * 100 };
    }

    /** Cobrador de pruebas: mismas reglas que checkout.php (efectivo suficiente, cambio = efectivo - total). */
    function local(resolver, latenciaMs) {
        return function (pedido) {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    const lineas = Object.keys(pedido.carrito).map((sku) => {
                        const p = resolver(sku);
                        return { sku, cantidad: pedido.carrito[sku], precio_base: p.precio_base, iva_pct: p.iva_pct };
                    });
                    const total = Pricing.calcular(lineas).total;
                    if (pedido.efectivo < total) {
                        reject({ status: 422, mensaje: 'El efectivo recibido es insuficiente' });
                    } else {
                        resolve({ total, cambio: pedido.efectivo - total });
                    }
                }, latenciaMs === undefined ? 350 : latenciaMs);     // simula la espera de la red
            });
        };
    }

    return { BILLETES, generarBilletes, local };
})();
