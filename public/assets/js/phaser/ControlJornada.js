/*
 * Control de la jornada: estado, reloj y cierre. No dibuja nada (lo dibuja HudScene) y no llama a la API:
 * abrir y cerrar pasan por los ganchos de Juego (Juego.setJornadaHooks), que conecta el backend.
 *
 * Estados:
 *   CERRADA  sin jornada: la caja no atiende (la pantalla dice CERRADO)
 *   ABIERTA  corre el reloj y llegan clientes
 *   CIERRE   hora de cierre (o el jugador pulsó CERRAR): no entran clientes nuevos, se atiende al que está en caja
 *   RESUMEN  jornada cerrada: se muestra el resumen y se puede abrir otra
 */
class ControlJornada {
    constructor(escena) {
        this.escena = escena;
        this.estado = 'CERRADA';
        this.id = null;
        this.reloj = Reloj.crear(JORNADA_CONFIG);
        this.resumen = null;       // resumen de la jornada cerrada (importes en centavos)
        this.ocupado = false;      // esperando la respuesta de abrir/cerrar (el botón queda desactivado)
    }

    /** ¿Entran clientes nuevos? */
    get admiteClientes() { return this.estado === 'ABIERTA'; }

    /** ¿Se puede jugar (teclado, banda, cobro)? */
    get operativa() { return this.estado === 'ABIERTA' || this.estado === 'CIERRE'; }

    /** Empieza una jornada: reloj a las 08:00, acumulados a cero y llega el primer cliente. */
    entrar(jornada) {
        this.id = jornada && jornada.id !== undefined ? jornada.id : null;
        this.reloj.reiniciar();
        this.resumen = null;
        this.estado = 'ABIERTA';
        this.escena.jornadaJuego = Auditoria.jornada(JORNADA_CONFIG.sueldoBase);
        this.escena.nuevaCompra(this.escena.compraDelSiguiente());
        this.escena.pantallaReposo();
    }

    /** Una jornada ya abierta en el servidor (Juego.setJornada). No hace nada si ya se está jugando. */
    sincronizar(jornada) {
        if (jornada && !this.operativa && !this.ocupado && this.escena.listo) { this.entrar(jornada); }
    }

    /** Botón de la barra: ABRIR (cerrada / resumen) o CERRAR (abierta / cierre). */
    pulsarBoton() {
        if (this.ocupado) { return; }
        if (this.estado === 'CERRADA' || this.estado === 'RESUMEN') { return this.abrir(); }
        if (this.estado === 'ABIERTA') {
            this.estado = 'CIERRE';
            this.escena.avisar('CERRANDO', 'ATIENDE AL CLIENTE', 1800);
        }
        if (!this.revisarCierre()) { this.escena.avisar('CERRANDO', 'ATIENDE AL CLIENTE', 1800); }
    }

    abrir() {
        this.ocupado = true;
        Juego.abrirJornada().then((j) => { this.ocupado = false; this.entrar(j); },
            (e) => { this.ocupado = false; this.error(e); });
    }

    /** Avanza el reloj (cada fotograma). Al llegar la hora de cierre deja de admitir clientes. */
    tick(ms) {
        if (this.estado !== 'ABIERTA') { return; }
        this.reloj.avanzar(ms);
        if (this.reloj.terminado()) {
            this.estado = 'CIERRE';
            this.escena.avisar('HORA DE CERRAR', 'ATIENDE AL ULTIMO', 2200);
            this.revisarCierre();
        }
    }

    /** El cliente se fue y no entra otro: si estamos cerrando, ahora sí se cierra. */
    clienteTerminado() { this.revisarCierre(); }

    /** Cierra si ya no queda ningún cliente en caja. Devuelve true si cerró (o está cerrando). */
    revisarCierre() {
        if (this.estado !== 'CIERRE' || this.ocupado) { return false; }
        if (this.escena.hayClienteEnCurso()) { return false; }
        this.ocupado = true;
        const resumen = this.escena.jornadaJuego.resumen();
        Juego.cerrarJornada(resumen).then(() => {
            this.ocupado = false;
            this.resumen = resumen;
            this.estado = 'RESUMEN';
            this.escena.pantallaReposo();
        }, (e) => { this.ocupado = false; this.error(e); });      // el botón CERRAR queda para reintentar
        return true;
    }

    error(e) {
        this.escena.avisar('ERROR ' + ((e && e.status) || ''), (e && e.mensaje) || 'SIN RESPUESTA', 2600);
    }
}
