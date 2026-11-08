/*
 * Punto de entrada del frontend: conecta la API con el juego (Phaser).
 * La interfaz (jornada, caja, cobro, resumen) vive dentro del juego; aquí solo se pasan datos:
 *   catálogo -> Juego.setCatalogo · jornada -> Juego.setJornada / setJornadaHooks · cobro -> Juego.setCobrador
 */
$(function () {
    // Estado de la aplicación (única fuente de verdad en el navegador)
    const state = {
        jornada: null,        // {id, estado, ventas_completadas, total_vendido, ...} o null
        categorias: [],
        productos: []
    };

    function mostrarMensaje(texto, esError) {
        $('#mensaje').text(texto).toggleClass('error', !!esError).prop('hidden', false);
    }

    function cargarJornada() {
        return Api.jornadaActual()
            .done(function (jornada) {
                state.jornada = jornada;
                Juego.setJornada(jornada);
            })
            .fail(function (err) {
                state.jornada = null;
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
            // perdida / sobrecobro llegan en centavos: la API los quiere como texto con dos decimales
            return Api.cerrarJornada(
                state.jornada.id, resumen.faltantes, resumen.sobrantes,
                Money.fromCents(resumen.perdida), Money.fromCents(resumen.sobrecobro)
            ).done(function () {
                state.jornada = null;
            });
        }
    });

    // Cobro: el juego pasa {carrito, efectivo (centavos)} y espera {total, cambio} en centavos. Se registra UNA vez.
    function cobrar({carrito, efectivo}) {
        if (!state.jornada) {
            return $.Deferred().reject({status: 409, mensaje: 'No hay jornada abierta'}).promise();
        }
        const efectivoEnMonedas = Money.fromCents(efectivo);
        return Api.checkout(state.jornada.id, 'Cliente', carrito, efectivoEnMonedas).then((v) => ({total: Money.toCents(v.total), cambio: Money.toCents(v.cambio)}));
    }
    Juego.setCobrador(cobrar);

    // ---- Arranque ----
    cargarJornada();
    cargarCatalogo();
    Juego.iniciar();  // carga phaser y arranca el juego (phaser/config.js)
});
