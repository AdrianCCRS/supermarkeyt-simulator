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
    entrar(jornada, recuperar) {
        this.id = jornada && jornada.id !== undefined ? jornada.id : null;
        this.reloj.reiniciar();
        this.resumen = null;
        this.logro = null;
        this.estado = 'ABIERTA';
        Sonido.tocar('abrir');
        Sonido.musica(true);
        const guardado = recuperar ? this.leer() : null;          // la página se recargó a mitad de jornada
        if (!guardado) { this.borrar(); }
        if (guardado) { this.reloj.fijar(guardado.t); }
        this.escena.jornadaJuego = Auditoria.jornada(JORNADA_CONFIG.sueldoBase, guardado && guardado.acum);
        this.escena.pantallaReposo();
        // entran los clientes; cuando el primero llega a la caja, empieza su compra
        if (guardado && guardado.clientes && guardado.clientes.fila.length) { return this.escena.restaurarClientes(guardado.clientes); }
        this.escena.llenarFila(() => this.escena.nuevaCompra());
    }

    /** Una jornada ya abierta en el servidor (Juego.setJornada). No hace nada si ya se está jugando. */
    sincronizar(jornada) {
        if (jornada && !this.operativa && !this.ocupado && this.escena.listo) { this.entrar(jornada, true); }
    }

    // Progreso en sessionStorage (sobrevive a recargar la página, no a cerrar la pestaña). Solo vale para la jornada con ese id.
    leer() {
        try {
            const g = JSON.parse(sessionStorage.getItem('d2-progreso'));
            return g && g.id === this.id ? g : null;
        } catch (e) { return null; }
    }
    guardar() {
        try { sessionStorage.setItem('d2-progreso', JSON.stringify({ id: this.id, t: this.reloj.tiempo(), acum: this.escena.jornadaJuego.exportar(), clientes: this.escena.estadoClientes() })); } catch (e) { /* sin almacenamiento: no se guarda */ }
    }
    borrar() {
        try { sessionStorage.removeItem('d2-progreso'); } catch (e) { /* nada */ }
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
        this.sinGuardar = (this.sinGuardar || 0) + ms;
        if (this.sinGuardar >= 2000) { this.sinGuardar = 0; this.guardar(); }
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
            this.borrar();
            this.logro = Perfil.registrarJornada(resumen);       // el progreso del jugador, guardado en su navegador
            Sonido.musica(false);
            Sonido.tocar('cerrar');
            this.estado = 'RESUMEN';
            this.escena.despedirFila();                 // los clientes que quedaban en la cola se van
            this.escena.pantallaReposo();
        }, (e) => { this.ocupado = false; this.error(e); });      // el botón CERRAR queda para reintentar
        return true;
    }

    error(e) {
        Sonido.tocar('error');
        this.escena.avisar('ERROR ' + ((e && e.status) || ''), (e && e.mensaje) || 'SIN RESPUESTA', 2600);
    }
}
