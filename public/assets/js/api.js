/*
 * Cliente de la API. Cada función devuelve una promesa de jQuery:
 *   Api.productos().done(function (productos) { ... })
 *              .fail(function (err) { err.status, err.mensaje });
 *
 * Contrato de respuesta del servidor:
 *   éxito -> {"success": true,  "data": ...}   (aquí se entrega solo "data")
 *   error -> {"success": false, "error": "mensaje"}  con código HTTP 4xx/5xx
 * Códigos: 400 petición malformada · 404 no existe · 409 conflicto de negocio
 * (stock, jornada cerrada) · 422 datos inválidos · 500 error interno.
 */
const Api = (function () {
    const BASE = 'api/';

    function request(method, endpoint, payload) {
        const deferred = $.Deferred();

        $.ajax({
            url: BASE + endpoint,
            method: method,
            data: payload === undefined ? undefined : JSON.stringify(payload),
            contentType: payload === undefined ? undefined : 'application/json',
            dataType: 'json'
        })
            .done(function (res) {
                deferred.resolve(res.data);
            })
            .fail(function (xhr) {
                const body = xhr.responseJSON;
                deferred.reject({
                    status: xhr.status,
                    mensaje: (body && body.error) || 'No se pudo contactar con el servidor'
                });
            });

        return deferred.promise();
    }

    return {
        productos:      () => request('GET', 'productos.php'),
        categorias:     () => request('GET', 'categorias.php'),
        jornadaActual:  () => request('GET', 'jornada_actual.php'),
        abrirJornada:   () => request('POST', 'jornada_abrir.php'),
        cerrarJornada:  (jornadaId, faltantes, sobrantes) => request('POST', 'jornada_cerrar.php', { jornada_id: jornadaId, faltantes: faltantes, sobrantes: sobrantes }),
        venta:          (id) => request('GET', 'ventas.php?id=' + encodeURIComponent(id)),
        ventasDeJornada: (jornadaId) => request('GET', 'ventas.php?jornada_id=' + encodeURIComponent(jornadaId)),
        cancelarVenta:  (ventaId) => request('POST', 'venta_cancelar.php', { venta_id: ventaId }),

        /**
         * carrito: objeto {sku: cantidad}, p. ej. {"FRU-001": 2}
         * efectivo: TEXTO con dos decimales, p. ej. "50000.00"
         */
        checkout: (jornadaId, cliente, carrito, efectivo) => request('POST', 'checkout.php', {
            jornada_id: jornadaId,
            cliente_nombre: cliente,
            carrito: carrito,
            efectivo_recibido: efectivo
        })
    };
})();
