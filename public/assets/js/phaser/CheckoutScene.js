/*
 * Escena de la caja: tres columnas en un lienzo lógico de 480x270.
 *
 *   x 0-160   TIENDA  fila de clientes, cajero e inicio de la banda
 *   x 160-320 BANDA   productos (x2), escáner, balanza y bolsa
 *   x 320-480 CAJA    pantalla, teclado y libro de códigos PLU
 *
 * Todo se dibuja con sprites. Si un PNG de ASSETS (assets.js) no existe,
 * se genera una textura placeholder con la misma clave y tamaño, así que el
 * código de la escena es el mismo con arte real o sin él.
 */
const CAPACIDAD_BOLSA = 20;
// Banda: los productos (32x32) llegan por arriba y se detienen al final, uno detrás de otro.
const VEL_BANDA = 0.04;                 // px por ms, la misma para la cinta y los productos
const SEP_BANDA = 34;                   // separación entre productos (32 + 2)
const Y_FIN_BANDA = 118 - 32;           // y del producto que está al final de la banda
const FUENTE = { fontFamily: '"Press Start 2P"', fontSize: '8px', color: COLOR.tinta };

class CheckoutScene extends Phaser.Scene {
    constructor() {
        super('CheckoutScene');
        this.entrada = '';
        this.modo = 'CODIGO';
        this.entregando = false;   // true mientras se cierra y cambia la bolsa
        this.enBalanza = null;     // fruta que está en el plato de la balanza
        this.cola = [];            // productos en la banda, del primero (al final de la banda) al último
        this.bandaMoviendo = false;
    }

    preload() {
        this.faltantes = new Set();
        this.load.on('loaderror', (file) => this.faltantes.add(file.key));

        Object.entries(ASSETS).forEach(([key, a]) => {
            if (a.frames) {
                this.load.spritesheet(key, IMG + a.path, { frameWidth: a.w, frameHeight: a.h });
            } else {
                this.load.image(key, IMG + a.path);
            }
        });
    }

    create() {
        this.crearPlaceholders();
        this.anims.create({
            key: 'bolsa-cerrar', frameRate: 12,
            frames: this.anims.generateFrameNumbers('bolsa-cerrar', { start: 0, end: 7 })
        });
        this.crearTienda();
        this.crearBanda();
        this.crearCaja();
        this.crearSeparadores();
        this.actualizarMiniPantalla('TOTAL', Money.pantalla('0.00'));

        if (this.faltantes.size) {
            console.info('[assets] usando placeholder para:', Array.from(this.faltantes).join(', '));
        }
    }

    update(_t, delta) {
        // Cada producto avanza hasta su sitio en la cola; la cinta solo gira mientras algo avanza.
        let avanza = false;
        this.cola.forEach((p, i) => {
            if (p.estado !== 'banda') { return; }
            const meta = this.yMetaBanda(i);
            if (p.y < meta) {
                p.y = Math.min(meta, p.y + VEL_BANDA * delta);
                avanza = true;
            }
        });
        this.bandaMoviendo = avanza;
        this.actualizarMiniBanda();
        if (avanza) {
            this.bandaTienda.tilePositionY -= VEL_BANDA * delta;
            this.bandaZoom.tilePositionY -= VEL_BANDA * delta;
        }
    }

    /** y donde se detiene el producto que ocupa el puesto i de la cola (0 = el primero, al final de la banda). */
    yMetaBanda(i) {
        return Y_FIN_BANDA - i * SEP_BANDA;
    }

    /** ¿Ha llegado ya el producto a su sitio? (solo entonces se puede coger). */
    haLlegado(p) {
        const i = this.cola.indexOf(p);
        return i >= 0 && p.y >= this.yMetaBanda(i) - 0.5;
    }

    /** Llegan productos a la banda desde arriba, en el orden de la lista (hito 2: el pedido del cliente). */
    llegadaPedido(skus) {
        skus.forEach((sku) => {
            const i = this.cola.length;
            const x = Phaser.Math.Between(BANDA_X + 10, BANDA_X + 160 - 10 - 32);
            const p = this.crearProducto(sku, x, this.yMetaBanda(i) - 120);
            this.cola.push(p);
        });
    }

    // ------------------------------------------------------------------
    // Columna 1: tienda
    // ------------------------------------------------------------------
    crearTienda() {
        this.add.tileSprite(0, 0, 160, 270, 'suelo').setOrigin(0);
        this.add.image(0, 0, 'pared').setOrigin(0);
        this.add.image(...TIENDA.expositor, 'expositor').setOrigin(0);
        this.add.image(...TIENDA.cestas, 'cestas').setOrigin(0);
        this.add.image(...TIENDA.planta, 'planta').setOrigin(0);
        this.add.image(...TIENDA.mueble, 'mueble-trasero').setOrigin(0);

        // Fila de clientes: el primero (abajo) es el que se está atendiendo
        const c0 = TIENDA.cola;
        this.clientes = [4, 3, 2, 1].map((n, i) => {
            const c = this.add.sprite(c0.x, c0.y + i * c0.paso, 'cliente-' + n, 0).setOrigin(0.5, 1);
            this.tweens.add({
                targets: c, y: c.y - 1, duration: 500 + i * 70,
                yoyo: true, repeat: -1, ease: 'Stepped'
            });
            return c;
        });

        this.crearBandaMini();
        const [cx, cy, cw, ch] = TIENDA.canal;
        this.bandaTienda = this.add.tileSprite(cx, cy, cw, ch, 'banda-mini').setOrigin(0);
        this.add.image(...TIENDA.mostrador, 'mostrador-caja').setOrigin(0);     // el canal es transparente
        this.crearMiniPuesto();
        this.add.image(...TIENDA.cajero, 'cajero').setOrigin(0);       // mira hacia la cola (izquierda)
        this.add.image(...TIENDA.luz, 'luz-carril').setOrigin(0);
        const [lx, ly, lw, lh] = TIENDA.luzCara;
        this.add.text(lx + lw / 2, ly + lh / 2, '1', { ...FUENTE, color: '#2ce8f5' }).setOrigin(0.5);   // nº de carril
    }

    /** Versión pequeña de lo que se juega en las otras columnas: escáner, balanza, caja y productos de la banda. */
    crearMiniPuesto() {
        this.miniEscaner = this.add.sprite(...TIENDA.miniEscaner, 'mini-escaner', 0).setOrigin(0);
        this.add.image(...TIENDA.miniBalanza, 'mini-balanza').setOrigin(0);
        this.add.image(...TIENDA.miniCaja, 'mini-caja').setOrigin(0);
        this.miniFruta = null;                                    // fruta posada en la mini balanza
        this.miniItems = new Map();                               // producto -> icono en la mini banda
        const [x, y, w, h] = TIENDA.miniCajaPantalla;
        this.miniPantalla = this.add.graphics();                  // dos rayitas verdes que imitan el texto
        this.miniPantalla.setData('rect', [x, y, w, h]);
    }

    /**
     * La mini caja se ve en planta: su pantalla es solo un canto de 1 px. Se enciende en verde una
     * raya cuya longitud depende de cuánto texto muestra la pantalla grande (se ve actividad, no texto).
     */
    actualizarMiniPantalla(arriba, abajo) {
        const [x, y, , h] = this.miniPantalla.getData('rect');
        const largo = Math.min(h, Math.round(Math.max(String(arriba).length, String(abajo).length) * 1.0));
        this.miniPantalla.clear().fillStyle(0x63c74d).fillRect(x, y + h - largo, 1, largo);
    }

    /** Fruta en la mini balanza (a mitad de tamaño) o vacía. */
    miniFrutaEn(sku) {
        if (this.miniFruta) { this.miniFruta.destroy(); this.miniFruta = null; }
        if (sku) { this.miniFruta = this.add.image(...TIENDA.miniPlato, sku).setScale(0.5).setOrigin(0); }
    }

    /** Los productos que esperan en la banda se ven también en la mini banda (icono a mitad de tamaño). */
    actualizarMiniBanda() {
        const [cx, cy, cw, ch] = TIENDA.canal;
        this.cola.forEach((p) => {
            let m = this.miniItems.get(p);
            if (!m) { m = this.add.image(0, 0, p.sku).setScale(0.5).setOrigin(0); this.miniItems.set(p, m); }
            m.x = Math.round(cx + ((p.x - (BANDA_X + 8)) / 112) * (cw - 8));
            m.y = Math.round(cy + ((p.y + 32) / 118) * (ch - 8));
            m.setVisible(p.y > -28);
        });
        this.miniItems.forEach((m, p) => {
            if (!this.cola.includes(p)) { m.destroy(); this.miniItems.delete(p); }
        });
    }

    /** Trozo central de 32 px de banda.png (sin los rieles) para la banda pequeña de la tienda. */
    crearBandaMini() {
        const tex = this.textures.createCanvas('banda-mini', 32, 32);
        tex.context.drawImage(this.textures.get('banda').getSourceImage(), 64, 0, 32, 32, 0, 0, 32, 32);
        tex.refresh();
    }

    // ------------------------------------------------------------------
    // Columna 2: banda ampliada
    // ------------------------------------------------------------------
    crearBanda() {
        const X = BANDA_X;
        this.bandaZoom = this.add.tileSprite(X, 0, 160, 118, 'banda').setOrigin(0);
        this.add.image(X + BANDA.mesa[0], BANDA.mesa[1], 'mesa').setOrigin(0);

        this.escaner = this.add.sprite(X + BANDA.escaner[0], BANDA.escaner[1], 'escaner', 0).setOrigin(0);
        const [bx, by] = BANDA.balanza;
        this.add.image(X + bx, by, 'balanza').setOrigin(0);
        const [dx, dy, dw] = BANDA.balanzaPantalla;
        this.pesoTexto = this.add.text(X + bx + dx + dw - 2, by + dy + 3, '0 kg', { ...FUENTE, color: '#63c74d' }).setOrigin(1, 0);

        // La bolsa se dibuja SIEMPRE vacía (frame 0) en dos capas: el fondo, y por delante de los
        // productos solo el frente (recorte), para que parezcan metidos dentro. Los productos que
        // se ven dentro son los escaneados de verdad, no un dibujo.
        const [bolsaX, bolsaY] = [X + BANDA.bolsa[0], BANDA.bolsa[1]];
        this.bolsa = this.add.sprite(bolsaX, bolsaY, 'bolsa', 0).setOrigin(0).setDepth(1);
        this.bolsaFrente = this.add.sprite(bolsaX, bolsaY, 'bolsa', 0).setOrigin(0).setDepth(3)
            .setCrop(0, BANDA.bolsaBoca[1] + BANDA.bolsaBoca[3], 144, 58);
        this.itemsBolsa = [];     // sprites de los productos que hay dentro, en orden de entrada
        this.enBolsa = 0;
        this.textoExtra = this.add.text(bolsaX + 72, bolsaY + 38, '', { ...FUENTE, color: '#181425' }).setOrigin(0.5, 0.5).setDepth(4);
        this.crearBotonEntregar();

        // Demo: llega un pedido de muestra (en el hito 2 lo genera cada cliente)
        this.llegadaPedido(['FRU-001', 'LAC-001', 'BEB-002', 'PAN-002', 'FRU-002']);
    }

    /** ¿Es una fruta/verdura sin código de barras? Estas hay que pesarlas antes de escanearlas. */
    esFruta(sku) {
        return Object.values(PLU).includes(sku);
    }

    /**
     * Un producto se maneja arrastrándolo. Estados:
     *  'banda' (esperando en la cinta) · 'arrastrando' · 'moviendo' (animación) · 'pesada' (en la balanza) · 'bolsa'
     * Reglas: la fruta no se escanea: se pesa, se teclea su código (libro) y entra en la bolsa con
     * el precio según su peso; los productos envasados no se pesan, se pasan por el escáner.
     */
    crearProducto(sku, x, y) {
        const p = this.add.image(x, y, sku).setScale(2).setOrigin(0).setInteractive({ useHandCursor: true, draggable: true });
        p.sku = sku;
        p.estado = 'banda';
        p.pesada = false;
        p.on('pointerdown', () => {
            if (p.estado === 'bolsa') { this.sacarDeBolsa(p); }     // un clic en la bolsa lo saca
        });
        p.on('dragstart', () => this.empezarArrastre(p));
        p.on('drag', (_ptr, dragX, dragY) => { if (p.arrastrando) { p.x = dragX; p.y = dragY; } });
        p.on('dragend', () => this.soltar(p));
        return p;
    }

    empezarArrastre(p) {
        const desdeBanda = p.estado === 'banda' && this.haLlegado(p);
        if (!desdeBanda && p.estado !== 'pesada') { p.arrastrando = false; return; }
        p.arrastrando = true;
        p.desde = p.estado;
        p.estado = 'arrastrando';
        p.setDepth(10);
        if (p.desde === 'banda') {
            this.cola = this.cola.filter((it) => it !== p);     // los de atrás avanzan solos
        } else {
            this.enBalanza = null;
            this.pesoTexto.setText('0 kg');
            this.miniFrutaEn(null);
        }
    }

    /** Zonas de la escena (rectángulos x, y, ancho, alto en coordenadas del lienzo). */
    zona(nombre) {
        const X = BANDA_X;
        if (nombre === 'escaner') { return new Phaser.Geom.Rectangle(X + BANDA.escaner[0], BANDA.escaner[1], 64, 56); }
        return new Phaser.Geom.Rectangle(X + BANDA.balanza[0], BANDA.balanza[1], 72, 56);
    }

    soltar(p) {
        if (!p.arrastrando) { return; }
        p.arrastrando = false;
        const centro = new Phaser.Geom.Point(p.x + 16, p.y + 16);
        const enEscaner = Phaser.Geom.Rectangle.ContainsPoint(this.zona('escaner'), centro);
        const enBalanza = Phaser.Geom.Rectangle.ContainsPoint(this.zona('balanza'), centro);
        const fruta = this.esFruta(p.sku);

        if ((enEscaner || enBalanza) && this.entregando) { return this.rechazar(p, 'ESPERA', 'BOLSA CERRANDO'); }
        if (enEscaner) {
            if (fruta) { return this.rechazar(p, 'FRUTA', 'PESA Y CODIGO'); }
            return this.escanear(p);
        }
        if (enBalanza) {
            if (!fruta) { return this.rechazar(p, 'NO SE PESA', 'ESCANEALO'); }
            if (this.enBalanza) { return this.rechazar(p, 'BALANZA', 'OCUPADA'); }
            return this.pesar(p);
        }
        this.volver(p);     // soltado en otro sitio: vuelve a donde estaba
    }

    /** Devuelve el producto a donde estaba (la banda o la balanza). */
    volver(p) {
        if (p.desde === 'pesada') { return this.pesar(p, true); }
        this.volverALaBanda(p);
    }

    /** Rechazo: el producto vuelve atrás con una sacudida y la pantalla de la caja avisa del motivo. */
    rechazar(p, linea1, linea2) {
        this.avisar(linea1, linea2, 1400);
        const x = p.x;
        this.tweens.add({
            targets: p, x: x + 4, duration: 50, yoyo: true, repeat: 3,
            onComplete: () => { p.x = x; this.volver(p); }
        });
    }

    /** Mensaje temporal en la pantalla de la caja; un aviso nuevo sustituye al anterior. */
    avisar(linea1, linea2, ms) {
        this.mostrar(linea1, linea2);
        if (this.temporizadorPantalla) { this.temporizadorPantalla.remove(); }
        this.temporizadorPantalla = this.time.delayedCall(ms, () => this.restaurarPantalla());
    }

    restaurarPantalla() {
        if (this.entrada || this.modo === 'EFECTIVO') { this.refrescarEntrada(); }
        else { this.mostrar('TOTAL', Money.pantalla('0.00')); }
    }

    /** La fruta se posa en el plato de la balanza y marca su peso. Falta teclear su código para cobrarla. */
    pesar(p, yaPesada) {
        p.estado = 'moviendo';
        this.enBalanza = p;
        const [px, py] = BANDA.balanza;
        const [ox, oy] = BANDA.balanzaPlato;
        p.setDepth(2);
        this.tweens.add({
            targets: p, x: BANDA_X + px + ox + 14, y: py + oy - 6, duration: 200, ease: 'Quad.easeOut',
            onComplete: () => {
                p.estado = 'pesada';
                if (!p.pesada) {
                    p.pesada = true;
                    p.kg = Phaser.Math.Between(1, 3);
                    this.avisar('PESADO ' + p.kg + 'KG', 'TECLEA CODIGO', 1800);
                }
                this.pesoTexto.setText(p.kg + ' kg');
                this.miniFrutaEn(p.sku);
            }
        });
    }

    /** El producto pasa por el cristal del escáner (láser y OK) y entra en la bolsa. */
    escanear(p) {
        p.estado = 'moviendo';
        const [ex, ey] = BANDA.escaner;
        this.tweens.add({
            targets: p, x: BANDA_X + ex + 8 + 8, y: ey + 10, duration: 200, ease: 'Quad.easeOut',
            onComplete: () => {
                this.escaner.setFrame(1);
                this.miniEscaner.setFrame(1);
                this.time.delayedCall(150, () => this.escaner.setFrame(2));
                this.time.delayedCall(450, () => { this.escaner.setFrame(0); this.miniEscaner.setFrame(0); });
                this.time.delayedCall(500, () => this.meterEnBolsa(p));
            }
        });
    }

    /** Vuelve al final de la banda (primer puesto de la cola); los que esperaban se echan hacia atrás. */
    volverALaBanda(p) {
        p.estado = 'moviendo';
        p.setDepth(0);
        this.cola.unshift(p);
        this.cola.forEach((it, i) => {
            if (it !== p && it.y > this.yMetaBanda(i)) {
                this.tweens.add({ targets: it, y: this.yMetaBanda(i), duration: 300, ease: 'Quad.easeOut' });
            }
        });
        this.tweens.add({
            targets: p, x: Phaser.Math.Clamp(p.x, BANDA_X + 10, BANDA_X + 160 - 10 - 32), y: this.yMetaBanda(0), scale: 2,
            duration: 300, ease: 'Quad.easeOut',
            onComplete: () => { p.estado = 'banda'; }
        });
    }

    /**
     * Hueco i de la bolsa (esquina superior izquierda del icono). Dentro de la bolsa los
     * productos se dibujan a su tamaño nativo (16x16) en 3 filas que se solapan en vertical
     * (7 + 6 + 7 = 20 huecos, empezando por la fila de delante). Pasados los 20, el resto se apila en el último hueco y el
     * frente de la bolsa muestra "+N".
     */
    huecoBolsa(i) {
        const [bx, by] = [BANDA_X + BANDA.bolsa[0] + BANDA.bolsaBoca[0], BANDA.bolsa[1] + BANDA.bolsaBoca[1]];
        // Se llena desde la fila de delante (abajo) hacia el fondo
        const FILAS = [{ n: 7, dx: 0, dy: 10 }, { n: 6, dx: 8, dy: 4 }, { n: 7, dx: 0, dy: -2 }];
        let resto = Math.min(i, CAPACIDAD_BOLSA - 1);
        for (const f of FILAS) {
            if (resto < f.n) { return { x: bx + 2 + f.dx + resto * 17, y: by + f.dy }; }
            resto -= f.n;
        }
    }

    /** El producto escaneado entra en la bolsa: sigue siendo el mismo sprite, y se puede volver a sacar. */
    meterEnBolsa(p) {
        this.itemsBolsa.push(p);
        this.enBolsa = this.itemsBolsa.length;
        this.reubicarBolsa();
        this.actualizarBolsa();
    }

    /** Saca un producto de la bolsa y lo devuelve a la banda (se puede volver a arrastrar). */
    sacarDeBolsa(p) {
        this.itemsBolsa = this.itemsBolsa.filter((it) => it !== p);
        this.enBolsa = this.itemsBolsa.length;
        p.desde = 'banda';
        this.volverALaBanda(p);
        this.reubicarBolsa();
        this.actualizarBolsa();
    }

    /** Coloca los productos de la bolsa en sus huecos (los últimos quedan por delante). */
    reubicarBolsa() {
        this.itemsBolsa.forEach((it, i) => {
            const h = this.huecoBolsa(i);
            it.setDepth(2 + h.y * 0.001);      // más abajo = más cerca = por delante
            this.tweens.add({
                targets: it, x: h.x, y: h.y, scale: 1, duration: 250, ease: 'Quad.easeOut',
                onComplete: () => { it.estado = 'bolsa'; }
            });
        });
    }

    /** El botón se activa si hay productos dentro de la bolsa. */
    actualizarBolsa() {
        const extra = this.enBolsa - CAPACIDAD_BOLSA;
        this.textoExtra.setText(extra > 0 ? '+' + extra : '');
        this.botonEntregar.setFrame(this.enBolsa > 0 ? 0 : 2);
        this.textoEntregar.setColor(this.enBolsa > 0 ? '#ffffff' : '#181425');
    }

    crearBotonEntregar() {
        const [x, y] = [BANDA_X + BANDA.boton[0], BANDA.boton[1]];
        this.botonEntregar = this.add.sprite(x, y, 'boton-entregar', 2).setOrigin(0).setInteractive({ useHandCursor: true });
        this.textoEntregar = this.add.text(x + 48, y + 4, 'ENTREGAR', { ...FUENTE, color: '#181425' }).setOrigin(0.5, 0);
        const soltar = () => {
            if (this.enBolsa > 0) { this.botonEntregar.setFrame(0); this.textoEntregar.y = y + 4; }
        };
        this.botonEntregar.on('pointerdown', () => {
            if (this.enBolsa === 0) { return; }
            this.botonEntregar.setFrame(1);
            this.textoEntregar.y = y + 5;
            this.entregar();
        });
        this.botonEntregar.on('pointerup', soltar);
        this.botonEntregar.on('pointerout', soltar);
    }

    /**
     * ENTREGAR: los productos se hunden en la bolsa, la bolsa se cierra (8 frames a 12 fps),
     * se queda cerrada un instante, sale hacia la derecha y entra otra vacía por la izquierda.
     * Hito 1: solo es la animación; en el hito 2 aquí se cierra el pedido y se llama a la API.
     */
    entregar() {
        if (this.entregando) { return; }
        this.entregando = true;
        const items = this.itemsBolsa;
        this.itemsBolsa = [];
        this.enBolsa = 0;
        this.actualizarBolsa();
        items.forEach((it) => { it.estado = 'moviendo'; it.disableInteractive(); });

        // La bolsa sale y entra recortada a su columna, para no pasar por encima de la caja.
        if (!this.mascaraBolsa) {
            this.mascaraBolsa = this.make.graphics({ add: false }).fillRect(BANDA_X, 0, 160, 270).createGeometryMask();
        }
        this.bolsa.setMask(this.mascaraBolsa);

        const x0 = this.bolsa.x;
        const reiniciar = () => {                       // bolsa nueva, vacía y abierta
            this.bolsa.setTexture('bolsa', 0).setX(BANDA_X - 150);
            this.bolsaFrente.setVisible(true);
            this.tweens.add({
                targets: this.bolsa, x: x0, duration: 350, ease: 'Quad.easeOut',
                onComplete: () => { this.bolsa.clearMask(); this.entregando = false; }
            });
        };

        this.tweens.add({                               // 1) los productos se hunden y desaparecen
            targets: items, y: '+=10', alpha: 0, duration: 200,
            onComplete: () => {
                items.forEach((it) => it.destroy());
                this.bolsaFrente.setVisible(false);
                this.textoExtra.setText('');
                if (this.faltantes.has('bolsa-cerrar')) {         // sin la animación: solo un parpadeo
                    this.tweens.add({ targets: this.bolsa, alpha: 0, duration: 150, yoyo: true, onYoyo: () => this.bolsaFrente.setVisible(true), onComplete: () => { this.entregando = false; } });
                    return;
                }
                this.bolsa.setTexture('bolsa-cerrar', 0).play('bolsa-cerrar');   // 2) se cierra
                this.bolsa.once('animationcomplete', () => {
                    this.time.delayedCall(500, () => {                          // 3) se queda cerrada
                        this.tweens.add({                                        // 4) sale por la derecha
                            targets: this.bolsa, x: BANDA_X + 165, duration: 350, ease: 'Quad.easeIn',
                            onComplete: reiniciar                                // 5) entra una nueva
                        });
                    });
                });
            }
        });
    }

    // ------------------------------------------------------------------
    // Columna 3: caja registradora y libro PLU
    // ------------------------------------------------------------------
    crearCaja() {
        const g = this.add.graphics();
        g.fillStyle(COLOR.maderaOsc).fillRect(320, 0, 160, 270);
        g.fillStyle(COLOR.madera);
        for (let y = 0; y < 270; y += 12) { g.fillRect(320, y, 160, 10); }

        const CX = 328, CY = 6;
        this.add.image(CX, CY, 'caja').setOrigin(0);

        // Pantalla (122x22 px): línea pequeña arriba (modo) y valor abajo, a la derecha
        const [px, py, pw, ph] = CAJA_PANTALLA;
        const verde = { ...FUENTE, color: '#63c74d' };
        this.lineaArriba = this.add.text(CX + px + 2, CY + py + 2, 'TOTAL', verde);
        this.lineaAbajo = this.add.text(CX + px + pw - 2, CY + py + ph - 10, Money.pantalla('0.00'), verde).setOrigin(1, 0);

        Object.entries(CAJA_TECLAS).forEach(([label, def]) => this.crearTecla(label, CX, CY, def));

        // Libro de códigos PLU
        this.add.image(328, 164, 'libro').setOrigin(0);
        Object.entries(PLU).forEach(([codigo, sku], i) => {
            const pagina = i < 2 ? 0 : 1;
            const fila = pagina === 0 ? i : i - 2;
            const x = 338 + pagina * 70;
            const y = 178 + fila * 26;
            this.add.image(x, y, sku).setOrigin(0);
            this.add.text(x + 20, y + 4, codigo, FUENTE);
        });
    }

    /** Tecla con sprite de 2 frames (normal · pulsada) y el rótulo escrito con la fuente del juego. */
    crearTecla(label, CX, CY, [x, y, w, h, hoja, color]) {
        const t = this.add.sprite(CX + x, CY + y, hoja, 0).setOrigin(0).setInteractive({ useHandCursor: true });
        const txt = this.add.text(CX + x + w / 2, CY + y + 2, label, { ...FUENTE, color: color || '#181425' }).setOrigin(0.5, 0);
        const soltar = () => { t.setFrame(0); txt.y = CY + y + 2; };
        t.on('pointerdown', () => { t.setFrame(1); txt.y = CY + y + 3; this.pulsarTecla(label); });
        t.on('pointerup', soltar);
        t.on('pointerout', soltar);
    }

    /**
     * Teclado (hito 1, demo). Dos modos de entrada:
     *  - CODIGO: el código de 4 cifras de una fruta (el que está en el libro). ENT lo busca.
     *  - EFECTIVO: se activa con PAY; los dígitos se muestran como dinero (12.000$).
     * CLR vuelve al estado inicial.
     */
    pulsarTecla(label) {
        if (/^\d$/.test(label)) {
            if (this.entrada.length < (this.modo === 'EFECTIVO' ? 7 : 4)) { this.entrada += label; }
            this.refrescarEntrada();
        } else if (label === 'PAY') {
            this.modo = 'EFECTIVO';
            this.entrada = '';
            this.refrescarEntrada();
        } else if (label === 'CLR') {
            this.modo = 'CODIGO';
            this.entrada = '';
            this.mostrar('TOTAL', Money.pantalla('0.00'));
        } else if (label === 'ENT') {
            if (this.modo === 'EFECTIVO') {
                this.mostrar('PAGO CON', Money.pantalla((this.entrada || '0') + '.00'));
            } else {
                this.registrarCodigo(this.entrada);
            }
            this.entrada = '';
        }
        // VOID y QTY se conectan en el hito 2
    }

    /**
     * ENT en modo CODIGO: el código tiene que existir, y la fruta de la balanza tiene que ser la suya.
     * Si todo cuadra se cobra según el peso (hoy 1 kg = 1 unidad) y la fruta entra en la bolsa.
     */
    registrarCodigo(codigo) {
        const sku = PLU[codigo];
        const fruta = this.enBalanza;
        if (this.entregando) { return this.avisar('ESPERA', 'BOLSA CERRANDO', 1400); }
        if (!sku) { return this.avisar('NO EXISTE', codigo, 1400); }
        if (!fruta) { return this.avisar('NADA PESADO', 'PESA LA FRUTA', 1400); }
        if (fruta.sku !== sku) { return this.avisar('CODIGO', 'NO COINCIDE', 1400); }

        const unitario = Juego.precioDe(sku);
        const total = unitario ? Money.fromCents(Money.toCents(unitario) * fruta.kg) : null;
        this.avisar(sku + ' ' + fruta.kg + 'KG', total ? Money.pantalla(total) : 'OK', 2200);

        fruta.estado = 'moviendo';
        fruta.precioLinea = total;
        this.enBalanza = null;
        this.pesoTexto.setText('0 kg');
        this.miniFrutaEn(null);
        this.time.delayedCall(350, () => this.meterEnBolsa(fruta));
    }

    refrescarEntrada() {
        if (this.modo === 'EFECTIVO') {
            this.mostrar('EFECTIVO', Money.pantalla((this.entrada || '0') + '.00'));
        } else {
            this.mostrar('CODIGO', this.entrada);
        }
    }

    /** Escribe en la pantalla de la caja: línea pequeña arriba y valor abajo. */
    mostrar(arriba, abajo) {
        this.actualizarMiniPantalla(arriba, abajo);
        this.lineaArriba.setText(arriba);
        this.lineaAbajo.setText(abajo);
    }

    crearSeparadores() {
        const g = this.add.graphics();
        g.fillStyle(COLOR.contorno);
        g.fillRect(159, 0, 2, 270);
        g.fillRect(319, 0, 2, 270);
    }

    // ------------------------------------------------------------------
    // Placeholders: texturas generadas para los PNG que aún no existen
    // ------------------------------------------------------------------
    crearPlaceholders() {
        this.faltantes.forEach((key) => {
            const a = ASSETS[key];
            const frames = a.frames || 1;
            const g = this.make.graphics({ x: 0, y: 0, add: false });
            for (let f = 0; f < frames; f++) {
                Placeholders.dibujar(g, key, f * a.w, a.w, a.h, f);
            }
            if (this.textures.exists(key)) { this.textures.remove(key); }
            g.generateTexture(key, a.w * frames, a.h);
            g.destroy();
            const tex = this.textures.get(key);
            for (let f = 0; f < frames; f++) { tex.add(f, 0, f * a.w, 0, a.w, a.h); }
        });
    }
}

/* Dibujos simples con la paleta para que los placeholders se lean como pixel art. */
const Placeholders = (function () {
    const C = COLOR;

    // Rectángulo con contorno, brillo arriba y sombra abajo
    function bloque(g, x, y, w, h, fill, luz, sombra) {
        g.fillStyle(C.contorno).fillRect(x, y, w, h);
        g.fillStyle(fill).fillRect(x + 1, y + 1, w - 2, h - 2);
        if (luz !== undefined) { g.fillStyle(luz).fillRect(x + 1, y + 1, w - 2, 1); }
        if (sombra !== undefined) { g.fillStyle(sombra).fillRect(x + 1, y + h - 2, w - 2, 1); }
    }

    function persona(g, x, camiseta, frame, gorra) {
        bloque(g, x + 7, 18, 18, 13, camiseta, C.blanco);          // torso
        bloque(g, x + 9, 3, 14, 15, C.piel, undefined, C.pielOsc);  // cabeza
        g.fillStyle(gorra || C.maderaOsc).fillRect(x + 9, 3, 14, 4); // pelo / gorra
        g.fillStyle(C.contorno).fillRect(x + 12, 10, 2, 2).fillRect(x + 18, 10, 2, 2); // ojos
        const boca = [[14, 14, 4, 1], [14, 14, 4, 1], [13, 15, 6, 1], [13, 14, 6, 2]][frame];
        g.fillRect(x + boca[0], boca[1], boca[2], boca[3]);
        if (frame === 2) { g.fillStyle(C.rojo).fillRect(x + 10, 12, 2, 1).fillRect(x + 20, 12, 2, 1); }
        if (frame === 1) { g.fillStyle(C.cian).fillRect(x + 22, 5, 1, 2); }
    }

    const CAMISETAS = { 'cliente-1': C.amarillo, 'cliente-2': C.azul, 'cliente-3': C.rosa, 'cliente-4': C.verde };
    const CATEGORIA = { FRU: C.rojo, LAC: C.blanco, CAR: C.rosa, DES: C.naranja, BEB: C.azul, PAN: C.arena, LIM: C.cian, HIG: C.verde };

    function dibujar(g, key, x, w, h, frame) {
        if (CAMISETAS[key]) { return persona(g, x, CAMISETAS[key], frame); }
        if (CATEGORIA[key.slice(0, 3)] && key.length === 7) {
            return bloque(g, x + 3, 2, 10, 13, CATEGORIA[key.slice(0, 3)], C.blanco, C.gris3);
        }
        const pulsada = frame === 1;
        switch (key) {
            case 'suelo':
                g.fillStyle(C.crema).fillRect(x, 0, 16, 16);
                g.fillStyle(C.arena).fillRect(x, 0, 8, 8).fillRect(x + 8, 8, 8, 8);
                return;
            case 'estanteria':
                bloque(g, x, 0, w, h, C.maderaOsc);
                [3, 21].forEach((y) => {
                    g.fillStyle(C.madera).fillRect(x + 3, y + 14, w - 6, 2);
                    for (let i = 0; i < 13; i++) {
                        g.fillStyle([C.rojo, C.verde, C.azul, C.amarillo, C.rosa][(i + y) % 5])
                            .fillRect(x + 5 + i * 8, y + 3, 5, 11);
                    }
                });
                return;
            case 'nevera':
                bloque(g, x, 0, w, h, C.gris5, C.gris3, C.gris4);
                for (let y = 6; y < h - 18; y += 20) {
                    g.fillStyle(C.gris3).fillRect(x + 3, y + 16, w - 6, 2);
                    g.fillStyle([C.rojo, C.azul, C.amarillo, C.verde][(y / 20) % 4]).fillRect(x + 5, y + 3, w - 10, 13);
                }
                return;
            case 'mostrador':
                bloque(g, x, 0, w, h, C.gris3, C.gris2, C.gris4);
                return;
            case 'cajero':
                return persona(g, x, C.verdeOsc, 0, C.verde);
            case 'banda':
                g.fillStyle(C.gris5).fillRect(x, 0, w, 32);
                g.fillStyle(C.gris4).fillRect(x, 0, w, 2).fillRect(x, 16, w, 2);
                return;
            case 'escaner':
                bloque(g, x, 0, w, h, C.gris3, C.gris2, C.gris4);
                bloque(g, x + 8, 8, w - 16, h - 16, C.gris5);
                g.fillStyle(pulsada ? C.rojo : C.rojoOsc).fillRect(x + 10, h / 2 - 1, w - 20, 2);
                return;
            case 'balanza':
                bloque(g, x, 0, w, h, C.gris1, C.blanco, C.gris2);
                bloque(g, x + 6, 5, w - 12, 14, C.contorno);
                bloque(g, x + 6, 24, w - 12, h - 30, C.gris2, C.blanco, C.gris3);
                return;
            case 'bolsa':
                bloque(g, x, 6, w, h - 6, C.arena, C.crema, C.madera);
                g.fillStyle(C.madera).fillRect(x + 4, 10, w - 8, 1);
                bloque(g, x + w / 2 - 20, 0, 40, 8, C.madera);
                return;
            case 'caja':
                bloque(g, x, 0, w, h, C.crema, C.blanco, C.arena);
                bloque(g, x + 6, 6, w - 12, 30, C.contorno);
                return;
            case 'tecla': case 'tecla-num': case 'tecla-ancha':
                bloque(g, x, pulsada ? 1 : 0, w, h - (pulsada ? 1 : 0),
                    pulsada ? C.gris1 : C.blanco, pulsada ? undefined : C.blanco, C.gris2);
                if (!pulsada) { g.fillStyle(C.gris3).fillRect(x + 1, h - 1, w - 2, 1); }
                return;
            case 'libro':
                bloque(g, x, 0, w, h, C.verdeMuyOsc);
                bloque(g, x + 4, 3, w / 2 - 6, h - 6, C.crema, C.blanco, C.arena);
                bloque(g, x + w / 2 + 2, 3, w / 2 - 6, h - 6, C.crema, C.blanco, C.arena);
                g.fillStyle(C.gris5).fillRect(x + w / 2 - 2, 2, 4, h - 4);
                return;
            default:
                bloque(g, x, 0, w, h, C.gris2);
        }
    }

    return { dibujar };
})();
