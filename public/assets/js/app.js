/*
 * Punto de entrada del frontend.
 * Ahora solo comprueba que la API responde y deja el estado en `state`.
 * Lo que falta por construir está marcado con TODO (orden sugerido).
 */
$(function () {
    // Estado de la aplicación (única fuente de verdad en el navegador)
    const state = {
        jornada: null,        // {id, estado, ventas_completadas, total_vendido, ...} o null
        categorias: [],
        productos: [],
        carrito: {}           // {sku: cantidad}
    };

    function mostrarMensaje(texto, esError) {
        $('#mensaje').text(texto).toggleClass('error', !!esError).prop('hidden', false);
    }

    function ocultarMensaje() {
        $('#mensaje').prop('hidden', true);
    }

    function cargarJornada() {
        return Api.jornadaActual()
            .done(function (jornada) {
                state.jornada = jornada;
                $('#jornada-estado').text('Jornada #' + jornada.id + ' abierta');
                $('#btn-abrir-jornada').prop('hidden', true);
                $('#btn-cerrar-jornada').prop('hidden', false);

                Juego.setJornada(jornada);
            })
            .fail(function (err) {
                state.jornada = null;
                $('#jornada-estado').text('Sin jornada abierta');
                $('#btn-abrir-jornada').prop('hidden', false);
                $('#btn-cerrar-jornada').prop('hidden', true);
                if (err.status !== 404) {
                    mostrarMensaje(err.mensaje, true);
                }
            });
    }

    function cargarCatalogo() {
        return $.when(Api.categorias(), Api.productos())
            .done(function (categorias, productos) {
                state.categorias = categorias;
                state.productos = productos;
                const filtrados = productos.filter((p) => p.stock > 0); // No mostrar productos sin stock
                Juego.setCatalogo(filtrados);
                Juego.iniciar();
            })
            .fail(function (err) {
                mostrarMensaje(err.mensaje, true);
            });
    }

    // Ganchos de la jornada: el juego llama a estas funciones al pulsar ABRIR / CERRAR (se registran UNA vez, aquí).
    // Cada una debe DEVOLVER la promesa, y el .done guarda/limpia state.jornada.
    Juego.setJornadaHooks({
        abrir: function () {
            return Api.abrirJornada().done(function (jornada) {
                state.jornada = jornada;
            });
        },
        cerrar: function (resumen) {
            // resumen.faltantes / resumen.sobrantes: {sku: cantidad} calculados por el juego
            return Api.cerrarJornada(state.jornada.id, resumen.faltantes, resumen.sobrantes).done(function () {
                state.jornada = null;
            });
        }
    });

    // ---- Arranque ----
    cargarJornada();
    cargarCatalogo();

    /*
     * TODO (orden sugerido):
     *  1. renderCategorias(): botones en #categorias; al hacer clic, filtrar por categoria_id.
     *  2. renderProductos(): tarjetas en #productos (imagen, nombre, Money.format(precio_base), stock).
     *     Las imágenes del seed (/assets/img/*.jpg) no existen aún: usa el placeholder con
     *     <img onerror> -> 'assets/img/placeholder.svg'.
     *  3. Agregar al carrito al hacer clic (delegación: $('#productos').on('click', '.producto', ...)).
     *     No dejes superar el stock mostrado. Re-dibujar #carrito y #total-estimado.
     *  4. Botones de jornada: Api.abrirJornada() / Api.cerrarJornada(state.jornada.id).
     *  5. Submit de #form-cobro: Api.checkout(...). El efectivo debe ir como "50000.00".
     *     Éxito (201) -> pintar #ticket con data.detalles, subtotal, iva_total,
     *     descuento_total, total, cambio; vaciar carrito; recargar productos (el stock cambió).
     *     Errores: 409 (stock/jornada) y 422 (datos) -> mostrarMensaje(err.mensaje, true).
     *  6. Evitar doble envío: deshabilitar #btn-cobrar mientras la petición está en curso.
     */
});
