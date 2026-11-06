/*
 * Estimación del ticket en el navegador. Replica EXACTAMENTE las reglas de
 * src/Services/PricingService.php (se comprueba contra el PHP real en tests/js):
 *   - subtotal de línea = precio_base x cantidad
 *   - IVA de línea = subtotal x iva_pct / 100, redondeo half-up, POR LÍNEA (un SKU = una línea)
 *   - total bruto = suma de (subtotal + IVA) de las líneas
 *   - descuento 5 % (half-up) si el total bruto llega a 100.000,00
 * Todo en centavos enteros. El total DEFINITIVO lo sigue calculando el servidor:
 * esto solo sirve para mostrar el acumulado en la pantalla de la caja y comprobar el pago.
 */
const Pricing = (function () {
    const DESCUENTO_UMBRAL = 10000000;   // 100.000,00 en centavos
    const DESCUENTO_PCT = 5;

    /** lineas: [{sku, cantidad, precio_base: "2500.00", iva_pct: "19.00"}] -> importes en centavos. */
    function calcular(lineas) {
        const detalle = lineas.map((l) => {
            const subtotal = Money.toCents(l.precio_base) * l.cantidad;
            const iva = Math.floor((subtotal * Money.toCents(l.iva_pct) + 5000) / 10000);
            return { sku: l.sku, cantidad: l.cantidad, subtotal, iva, total: subtotal + iva };
        });
        const sum = (k) => detalle.reduce((a, d) => a + d[k], 0);
        const bruto = sum('total');
        const descuento = bruto >= DESCUENTO_UMBRAL ? Math.floor((bruto * DESCUENTO_PCT + 50) / 100) : 0;
        return { detalle, subtotal: sum('subtotal'), iva: sum('iva'), bruto, descuento, total: bruto - descuento };
    }

    return { calcular, DESCUENTO_UMBRAL, DESCUENTO_PCT };
})();
