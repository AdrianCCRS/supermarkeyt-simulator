/*
 * Utilidades de dinero.
 * La API devuelve los importes como TEXTO ("12500.00"). No los conviertas a
 * Number para hacer cuentas (los decimales binarios fallan): usa centavos enteros.
 * Los importes finales (subtotal, IVA, total, cambio) SIEMPRE los calcula el
 * servidor; aquí solo se formatea y se hace una estimación visual del carrito.
 */
const Money = (function () {
    const formatter = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });

    /** "12500.00" -> 1250000 (centavos). */
    function toCents(text) {
        const match = /^(\d+)\.(\d{2})$/.exec(String(text));
        if (!match) {
            throw new Error('Importe inválido: ' + text);
        }
        return parseInt(match[1], 10) * 100 + parseInt(match[2], 10);
    }

    /** 1250000 -> "12500.00" */
    function fromCents(cents) {
        const entero = Math.floor(cents / 100);
        const dec = String(cents % 100).padStart(2, '0');
        return entero + '.' + dec;
    }

    /** "12500.00" -> "$ 12.500" */
    function format(text) {
        return formatter.format(toCents(text) / 100);
    }

    return { toCents, fromCents, format };
})();
