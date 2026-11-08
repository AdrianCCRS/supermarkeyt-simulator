/*
 * Auditoría de las ventas: compara lo que el cliente SE LLEVA (su inventario de compra) con lo que el
 * tendero COBRÓ, y acumula el resultado de la jornada. Lógica pura, sin Phaser ni DOM.
 *
 *   faltante  = unidades que el cliente se llevó y no se cobraron  -> PÉRDIDA (la paga el tendero)
 *   sobrante  = unidades cobradas de más (o de otro producto)       -> SOBRECOBRO (el cliente protesta)
 *
 * Los importes se valoran como los cobraría la caja: precio_base x cantidad + IVA de la línea (Pricing).
 */
const Auditoria = (function () {
    const PUNTOS_VENTA_EXACTA = 100;
    const PUNTOS_PROTESTA = -50;

    /** Diferencia de dos mapas {sku: cantidad}: lo que tiene `a` de más respecto a `b`. */
    function exceso(a, b) {
        const r = {};
        Object.keys(a).forEach((sku) => {
            const d = a[sku] - (b[sku] || 0);
            if (d > 0) { r[sku] = d; }
        });
        return r;
    }

    /** Valor en centavos de un mapa {sku: cantidad}, con IVA por línea. */
    function valor(mapa, resolver) {
        const lineas = Object.keys(mapa).map((sku) => {
            const p = resolver(sku);
            return { sku, cantidad: mapa[sku], precio_base: p.precio_base, iva_pct: p.iva_pct };
        });
        return lineas.length ? Pricing.calcular(lineas).bruto : 0;
    }

    /** compra: lo que se lleva el cliente. cobrado: el carrito que se cobró. */
    function liquidar(compra, cobrado, resolver) {
        const faltantes = exceso(compra, cobrado);
        const sobrantes = exceso(cobrado, compra);
        const perdida = valor(faltantes, resolver);
        const sobrecobro = valor(sobrantes, resolver);
        return { faltantes, sobrantes, perdida, sobrecobro, exacta: perdida === 0 && sobrecobro === 0 };
    }

    /**
     * Cuadre de caja: el cambio que se da depende del efectivo que TECLEÓ el tendero, y el correcto depende del que
     * dio de verdad el cliente. Si tecleó más de lo real se da cambio de MÁS (pérdida de caja); si tecleó menos
     * (pero lo bastante para cubrir el total) el cambio es de MENOS y el cliente protesta.
     */
    function cuadreCaja(efectivoReal, efectivoTecleado, total) {
        const dado = efectivoTecleado - total;
        const correcto = efectivoReal - total;
        const diferencia = dado - correcto;
        return { perdida: diferencia > 0 ? diferencia : 0, protesta: diferencia < 0, diferencia };
    }

    /** Acumulado de la jornada. sueldoBase: texto con 2 decimales ("60000.00"). */
    function jornada(sueldoBase, inicial) {
        const base = Money.toCents(sueldoBase);
        const acum = { clientes: 0, exactas: 0, protestas: 0, cobrado: 0, perdida: 0, perdida_caja: 0, sobrecobro: 0, puntos: 0, faltantes: {}, sobrantes: {} };

        if (inicial) { Object.keys(acum).forEach((k) => { if (inicial[k] !== undefined) { acum[k] = typeof acum[k] === 'object' ? Object.assign({}, inicial[k]) : Number(inicial[k]) || 0; } }); }

        function sumar(destino, mapa) { Object.keys(mapa).forEach((s) => { destino[s] = (destino[s] || 0) + mapa[s]; }); }

        return {
            /** liq: resultado de liquidar(); totalCobrado: centavos que pagó el cliente. Devuelve lo que pasó con este cliente. */
            registrar(liq, totalCobrado, caja) {
                caja = caja || { perdida: 0, protesta: false };
                acum.clientes++;
                acum.cobrado += totalCobrado;
                acum.perdida += liq.perdida + caja.perdida;
                acum.perdida_caja += caja.perdida;
                acum.sobrecobro += liq.sobrecobro;
                sumar(acum.faltantes, liq.faltantes);
                sumar(acum.sobrantes, liq.sobrantes);
                const protesta = liq.sobrecobro > 0 || caja.protesta;
                const exacta = liq.exacta && caja.perdida === 0 && !caja.protesta;
                if (exacta) { acum.exactas++; acum.puntos += PUNTOS_VENTA_EXACTA; }
                if (protesta) { acum.protestas++; acum.puntos += PUNTOS_PROTESTA; }
                return { exacta, protesta };
            },
            /** Copia del acumulado, para guardarlo y recuperarlo con jornada(sueldoBase, copia). */
            exportar() {
                return Object.assign({}, acum, { faltantes: Object.assign({}, acum.faltantes), sobrantes: Object.assign({}, acum.sobrantes) });
            },
            /** Resumen para el cierre: el sueldo del tendero es el base menos las pérdidas (nunca baja de 0). */
            resumen() {
                const sueldo = Math.max(0, base - acum.perdida);
                return Object.assign({}, acum, {
                    faltantes: Object.assign({}, acum.faltantes), sobrantes: Object.assign({}, acum.sobrantes),
                    sueldo_base: base, sueldo, descuento: base - sueldo
                });
            }
        };
    }

    return { liquidar, cuadreCaja, jornada, PUNTOS_VENTA_EXACTA, PUNTOS_PROTESTA };
})();
