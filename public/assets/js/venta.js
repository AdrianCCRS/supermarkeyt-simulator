/*
 * Venta en curso (estado comercial del cliente que se está atendiendo). Lógica pura, sin Phaser ni DOM.
 *   - agregar / quitar productos (la fruta entra con su peso en kg como cantidad)
 *   - total acumulado y precio de cada producto añadido (con IVA, como lo calcula el servidor)
 *   - cobro: solo se puede cobrar con productos y con efectivo >= total
 *   - una vez cobrada, la venta queda BLOQUEADA: no se puede añadir ni quitar nada
 * resolver(sku) debe devolver {sku, nombre, precio_base, iva_pct} (catálogo de la API o de muestra).
 */
const Venta = (function () {
    function crear(resolver) {
        const cantidades = {};      // sku -> cantidad
        let pagada = false;
        let efectivo = 0;           // centavos recibidos
        let cambioFijado = null;    // cambio devuelto por el cobrador (backend); si no hay, se calcula
        let totalFijado = null;     // total devuelto por el cobrador

        const lineas = () => Object.keys(cantidades).map((sku) => {
            const p = resolver(sku);
            return { sku, cantidad: cantidades[sku], precio_base: p.precio_base, iva_pct: p.iva_pct };
        });
        const ticket = () => Pricing.calcular(lineas());
        const totalBruto = () => ticket().bruto;

        function agregar(sku, cantidad) {
            if (pagada) { return { ok: false, motivo: 'YA COBRADO' }; }
            const antes = totalBruto();
            cantidades[sku] = (cantidades[sku] || 0) + cantidad;
            return { ok: true, delta: totalBruto() - antes };   // lo que cuesta ESTE producto, con IVA
        }

        function quitar(sku, cantidad) {
            if (pagada) { return { ok: false, motivo: 'YA COBRADO' }; }
            if (!cantidades[sku]) { return { ok: false, motivo: 'NO ESTA' }; }
            const antes = totalBruto();
            cantidades[sku] -= cantidad;
            if (cantidades[sku] <= 0) { delete cantidades[sku]; }
            return { ok: true, delta: antes - totalBruto() };
        }

        function cobrar(efectivoCentavos) {
            if (pagada) { return { ok: false, motivo: 'YA COBRADO' }; }
            const total = ticket().total;
            if (total === 0) { return { ok: false, motivo: 'NADA QUE COBRAR' }; }
            if (efectivoCentavos < total) { return { ok: false, motivo: 'INSUFICIENTE', faltan: total - efectivoCentavos }; }
            pagada = true;
            efectivo = efectivoCentavos;
            return { ok: true, cambio: efectivoCentavos - total };
        }

        /** El cobrador (backend) confirmó el pago: la venta queda cobrada y bloqueada con SUS importes. */
        function marcarCobrada(datos) {
            if (pagada) { return { ok: false, motivo: 'YA COBRADO' }; }
            pagada = true;
            efectivo = datos.efectivo;
            totalFijado = datos.total;
            cambioFijado = datos.cambio;
            return { ok: true, cambio: datos.cambio };
        }

        return {
            agregar, quitar, cobrar, marcarCobrada, ticket,
            total: () => (totalFijado !== null ? totalFijado : ticket().total),
            vacia: () => Object.keys(cantidades).length === 0,
            get pagada() { return pagada; },
            get efectivo() { return efectivo; },
            get cambio() { return !pagada ? 0 : (cambioFijado !== null ? cambioFijado : efectivo - ticket().total); },
            /** {sku: cantidad} listo para enviar a checkout.php */
            carrito: () => Object.assign({}, cantidades)
        };
    }

    /** ¿El carrito {sku: cantidad} es EXACTAMENTE lo que trae el cliente (su inventario de compra)? */
    function coincide(carrito, compra) {
        const a = Object.keys(carrito), b = Object.keys(compra);
        return a.length === b.length && a.every((sku) => carrito[sku] === compra[sku]);
    }

    return { crear, coincide };
})();
