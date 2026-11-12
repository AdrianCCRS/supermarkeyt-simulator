/*
 * Menú de la jornada (barra superior de 24 px + panel de cierre). Es solo la vista: lee el estado de
 * CheckoutScene.jornada (ControlJornada) y manda el clic del botón de vuelta. No llama a la API.
 */
const COLOR_LCD = '#63c74d';
const TXT_PANEL = '#ead4aa', TXT_MAL = '#f6757a', TXT_BIEN = '#63c74d';      // el panel es una pizarra oscura: texto claro

class HudScene extends Phaser.Scene {
    constructor() { super('HudScene'); }

    create() {
        this.juego = this.scene.get('CheckoutScene');
        this.cache = {};
        const R = HUD.ranuras;

        this.add.image(0, 0, 'hud-barra').setOrigin(0).setDepth(0);
        this.lampara = this.add.sprite(HUD.lampara[0], HUD.lampara[1], 'hud-lampara', 0).setOrigin(0);

        // Iconos (reloj, persona, estrella, moneda) a la izquierda de cada ranura, y el valor a su derecha.
        const icono = (clave, frame) => {
            const [x, y, , h] = R[clave];
            this.add.image(x + 3, y + Math.floor((h - 10) / 2), 'hud-iconos', frame).setOrigin(0);
        };
        icono('reloj', 0); icono('clientes', 1); icono('puntos', 2); icono('ventas', 3);
        const texto = (clave, conIcono) => {
            const [x, y, w, h] = R[clave];
            return this.add.text(x + (conIcono ? 16 : Math.floor(w / 2)), y + Math.floor((h - 8) / 2) + 1, '',
                { ...FUENTE, color: COLOR_LCD }).setOrigin(conIcono ? 0 : 0.5, 0);
        };
        this.tJornada = texto('jornada', false);
        this.tReloj = texto('reloj', true);
        this.tClientes = texto('clientes', true);
        this.tPuntos = texto('puntos', true);
        this.tVentas = texto('ventas', true);

        // Botón ABRIR / CERRAR
        const [bx, by] = HUD.boton;
        this.boton = this.add.sprite(bx, by, 'hud-boton', 0).setOrigin(0).setInteractive({ useHandCursor: true });
        this.tBoton = this.add.text(bx + 34, by + 5, '', { ...FUENTE, color: '#ffffff' }).setOrigin(0.5, 0);
        this.pulsado = false;
        this.boton.on('pointerdown', () => { this.pulsado = true; Sonido.tocar('tecla'); });
        this.boton.on('pointerout', () => { this.pulsado = false; });
        this.boton.on('pointerup', () => {
            if (!this.pulsado) { return; }
            this.pulsado = false;
            this.juego.jornada.pulsarBoton();
        });

        this.crearPanel();
        this.crearRanking();
    }

    /** Panel con el resumen de la jornada cerrada (se muestra en el estado RESUMEN). */
    crearPanel() {
        const [px, py] = HUD.panel;
        this.panel = this.add.container(0, 0).setDepth(20).setVisible(false);
        this.panel.add(this.add.image(px, py, 'panel-cierre').setOrigin(0));
        this.panel.add(this.add.text(px + 112, py + 5, 'CIERRE DE JORNADA', { ...FUENTE, color: '#ffffff' }).setOrigin(0.5, 0));
        this.filas = [];
        for (let i = 0; i < 9; i++) {
            const y = py + 24 + i * 12;
            const izq = this.add.text(px + 10, y, '', { ...FUENTE, color: TXT_PANEL }).setOrigin(0, 0);
            const der = this.add.text(px + 214, y, '', { ...FUENTE, color: TXT_PANEL }).setOrigin(1, 0);
            this.panel.add([izq, der]);
            this.filas.push({ izq, der });
        }
        this.pie = this.add.text(px + 112, py + 24 + 9 * 12 + 6, 'PULSA ABRIR PARA OTRA', { ...FUENTE, color: '#8b9bb4' }).setOrigin(0.5, 0);
        this.panel.add(this.pie);
    }

    /**
     * Top 5 junto al panel de cierre (a su izquierda, 120 px). Cada puesto ocupa dos líneas: apodo y puntos.
     * Solo lee Ranking (ranking.js); si no hay datos muestra el aviso y el resto del juego no se entera.
     */
    crearRanking() {
        const x = 4, y = HUD.panel[1], w = 120, h = 168;
        this.rank = this.add.container(0, 0).setDepth(20).setVisible(false);
        const fondo = this.add.graphics();
        fondo.fillStyle(0x181425, 0.92).fillRect(x, y, w, h);
        fondo.lineStyle(2, 0x733e39, 1).strokeRect(x + 1, y + 1, w - 2, h - 2);
        this.rank.add(fondo);
        this.rank.add(this.add.text(x + w / 2, y + 6, 'TOP 5', { ...FUENTE, color: '#feae34' }).setOrigin(0.5, 0));
        this.rankFilas = [];
        for (let i = 0; i < 5; i++) {
            const fy = y + 22 + i * 20;
            const nombre = this.add.text(x + 8, fy, '', { ...FUENTE, color: TXT_PANEL }).setOrigin(0, 0);
            const pts = this.add.text(x + w - 8, fy + 9, '', { ...FUENTE, color: '#8b9bb4' }).setOrigin(1, 0);
            this.rank.add([nombre, pts]);
            this.rankFilas.push({ nombre, pts });
        }
        this.rankAviso = this.add.text(x + 8, y + 26, '', { ...FUENTE, color: '#8b9bb4', wordWrap: { width: w - 16 } }).setOrigin(0, 0);
        this.rankPie = this.add.text(x + 8, y + h - 34, '', { ...FUENTE, color: '#feae34', wordWrap: { width: w - 16 } }).setOrigin(0, 0);
        this.rank.add([this.rankAviso, this.rankPie]);
    }

    pintarRanking() {
        const v = Ranking.vistaActual();
        const P = (t, max) => Ranking.paraPantalla(t, max);
        this.rankFilas.forEach((f, i) => {
            const fila = v.filas[i];
            this.poner(f.nombre, fila ? P(fila.posicion + ' ' + fila.apodo, 14) : '', fila && fila.yo ? '#feae34' : TXT_PANEL);
            this.poner(f.pts, fila ? P(String(fila.puntos)) : '', fila && fila.yo ? '#feae34' : '#8b9bb4');
        });
        this.poner(this.rankAviso, v.aviso ? P(v.aviso) : '');
        this.poner(this.rankPie, v.pie ? P(v.pie) : '');
    }

    /** Evita redibujar un texto que no cambió (Phaser lo vuelve a rasterizar en cada setText). */
    poner(obj, texto, color) {
        const clave = texto + '|' + (color || '');
        if (this.cache[obj.name || (obj.name = 't' + Math.random())] === clave) { return; }
        this.cache[obj.name] = clave;
        obj.setText(texto);
        if (color) { obj.setColor(color); }
    }

    update() {
        const j = this.juego.jornada;
        if (!j) { return; }
        const abierta = j.estado === 'ABIERTA' || j.estado === 'CIERRE';
        const r = this.juego.jornadaJuego.resumen();

        this.poner(this.tJornada, abierta || j.estado === 'RESUMEN' ? 'JORNADA ' + (j.id === null ? '' : j.id) : 'SIN JORNADA');
        this.poner(this.tReloj, j.reloj.texto());
        this.poner(this.tClientes, String(r.clientes));
        this.poner(this.tPuntos, String(r.puntos), r.puntos < 0 ? '#e43b44' : COLOR_LCD);
        this.poner(this.tVentas, this.dineroCorto(r.cobrado));

        this.lampara.setFrame(j.estado === 'ABIERTA' ? 1 : (j.estado === 'CIERRE' ? 2 : 0));
        const verde = !abierta;                                    // ABRIR (verde) cuando no hay jornada; CERRAR (rojo) cuando la hay
        this.boton.setFrame((verde ? 0 : 3) + (j.ocupado ? 2 : (this.pulsado ? 1 : 0)));
        this.poner(this.tBoton, verde ? 'ABRIR' : 'CERRAR');
        this.tBoton.y = HUD.boton[1] + (this.pulsado ? 6 : 5);

        const mostrar = j.estado === 'RESUMEN' && !!j.resumen;
        if (mostrar !== this.panel.visible) { this.panel.setVisible(mostrar); this.rank.setVisible(mostrar); }
        if (mostrar && typeof Ranking !== 'undefined') { this.pintarRanking(); }
        if (mostrar) { this.llenarPanel(j.resumen); this.poner(this.pie, this.textoPie(j.logro), j.logro && (j.logro.recordPuntos || j.logro.recordSueldo) ? TXT_BIEN : '#8b9bb4'); }
    }

    /** Importe (centavos) que cabe en la ranura de ventas (9 caracteres): sin céntimos si no cabe, y en millones si sigue sin caber. */
    dineroCorto(centavos) {
        const tope = 9;
        let t = Money.pantalla(Money.fromCents(centavos));
        if (t.length <= tope) { return t; }
        t = Money.pantalla(Money.fromCents(Math.floor(centavos / 100) * 100));
        if (t.length <= tope) { return t; }
        return (centavos / 100000000).toFixed(1).replace('.', ',') + 'M$';
    }

    /** Línea de abajo del panel: marcas nuevas del jugador, o la invitación a abrir otra jornada. */
    textoPie(logro) {
        if (logro && logro.recordSueldo && !logro.primera) { return 'NUEVO RECORD DE SUELDO!'; }
        if (logro && logro.recordPuntos && !logro.primera) { return 'NUEVO RECORD DE PUNTOS!'; }
        return 'PULSA ABRIR PARA OTRA';
    }

    llenarPanel(res) {
        const d = (c) => Money.pantalla(Money.fromCents(c));
        const filas = [
            ['CLIENTES', String(res.clientes) + (res.abandonos ? ' (' + res.abandonos + ' SE FUE)' : ''), TXT_PANEL],
            ['VENTAS', d(res.cobrado), TXT_PANEL],
            ['EXACTAS', String(res.exactas), TXT_PANEL],
            ['PROTESTAS', String(res.protestas), TXT_PANEL],
            ['PUNTOS', String(res.puntos), res.puntos < 0 ? TXT_MAL : TXT_PANEL],
            ['PERDIDAS', d(res.perdida), res.perdida > 0 ? TXT_MAL : TXT_PANEL],
            ['SUELDO BASE', d(res.sueldo_base), TXT_PANEL],
            ['DESCUENTO', d(res.descuento), res.descuento > 0 ? TXT_MAL : TXT_PANEL],
            ['SUELDO', d(res.sueldo), TXT_BIEN]
        ];
        filas.forEach(([a, b, color], i) => {
            this.poner(this.filas[i].izq, a, color);
            this.poner(this.filas[i].der, b, color);
        });
    }
}
