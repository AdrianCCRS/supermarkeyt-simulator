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
// Pantalla de la caja: los textos largos se desplazan despacio y los avisos duran lo que haga falta para leerlos.
const PAUSA_MARQUESINA = 1300;          // ms de pausa al principio y al final del recorrido
const MS_POR_PIXEL = 40;                // velocidad de desplazamiento (unos 25 px por segundo)
const FACTOR_AVISO = 1.4;               // los avisos duran un 40 % más de lo pedido
// Banda: los productos (32x32) llegan por arriba y se detienen al final, uno detrás de otro.
const VEL_BANDA = 0.04;                 // px por ms, la misma para la cinta y los productos
const SEP_BANDA = 34;                   // separación entre productos (32 + 2)
const Y_FIN_BANDA = 118 - 32;           // y del producto que está al final de la banda
// Prioridad de las animaciones del tendero: una más importante no se interrumpe por una menor.
const PRIO_CAJERO = { reposo: 0, teclear: 1, saludar: 2, celebrar: 3, molesto: 3 };
const FUENTE = { fontFamily: '"Press Start 2P"', fontSize: '8px', color: COLOR.tinta };

class CheckoutScene extends Phaser.Scene {
    constructor() {
        super('CheckoutScene');
        this.entrada = '';
        this.modo = 'CODIGO';
        this.entregando = false;   // true mientras se cierra y cambia la bolsa
        this.cobrando = false;     // true mientras se espera la respuesta del cobrador (el teclado queda bloqueado)
        this.dinero = null;        // billetes que paga el cliente: {cuentas: {valor: n}, suma: centavos}
        this.cuadre = null;        // efectivo real frente al tecleado, para la auditoría
        this.billetesObjs = [];    // sprites de los billetes en la bandeja
        this.cambioObjs = [];      // billetes y monedas del cambio sobre la bandeja
        this.dandoCambio = false;  // el cajero está sacando el cambio: aún no se puede entregar
        this.venta = Venta.crear((sku) => Juego.producto(sku));   // venta en curso: productos, total y cobro
        this.enBalanza = null;     // fruta que está en el plato de la balanza
        this.compra = {};          // inventario de compra del cliente: {sku: cantidad}, la fruta en kg
        this.jornadaJuego = Auditoria.jornada(JORNADA_CONFIG.sueldoBase);   // pérdidas, sobrecobros y puntos de la jornada
        this.registros = [];       // lo escaneado, en orden: {sku, cantidad, sprites}; VOID deshace el último
        this.qtyPendiente = null;  // cantidad armada con QTY para el próximo producto
        this.cola = [];            // productos en la banda, del primero (al final de la banda) al último
        this.bandaMoviendo = false;
        this.jornada = new ControlJornada(this);   // estado, reloj y cierre de la jornada (lo dibuja HudScene)
        this.listo = false;
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
        this.cameras.main.setViewport(0, HUD.alto, 480, 270);     // el menú ocupa los 24 px de arriba
        this.crearPlaceholders();
        this.anims.create({
            key: 'bolsa-cerrar', frameRate: 12,
            frames: this.anims.generateFrameNumbers('bolsa-cerrar', { start: 0, end: 7 })
        });
        this.crearAnimaciones();
        this.crearTienda();
        this.crearBanda();
        this.crearCaja();
        this.crearSeparadores();
        this.actualizarMiniPantalla('TOTAL', Money.pantalla('0.00'));

        if (this.faltantes.size) {
            console.info('[assets] usando placeholder para:', Array.from(this.faltantes).join(', '));
        }

        this.listo = true;
        this.scene.launch('HudScene');                             // menú de la jornada, encima del juego
        const abierta = Juego.jornadaActual();                     // jornada ya abierta en el servidor (la pone el backend)
        if (abierta) { this.jornada.entrar(abierta); } else { this.pantallaReposo(); }
    }

    /** ¿Hay un cliente en caja? (productos en la banda o en la bolsa, cobro o entrega en curso). */
    hayClienteEnCurso() {
        return this.cola.length > 0 || this.enBolsa > 0 || this.entregando || this.cobrando || this.venta.pagada || this.modo === 'EFECTIVO';
    }

    update(_t, delta) {
        this.jornada.tick(delta);
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

    /**
     * Llega un cliente con su inventario de compra. En la banda hay UN producto por unidad (la fruta, uno solo:
     * su cantidad es el peso). Ese inventario es lo que la venta tiene que igualar exactamente al cobrar.
     */
    nuevaCompra(compra) {
        this.cajeroAnimar('saludar');                                 // llega un cliente a la caja
        this.compra = Object.assign({}, compra);
        this.registros = [];
        this.qtyPendiente = null;
        const skus = [];
        Object.keys(compra).forEach((sku) => {
            const unidades = this.esFruta(sku) ? 1 : compra[sku];
            for (let i = 0; i < unidades; i++) { skus.push(sku); }
        });
        this.llegadaPedido(skus);
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
    /** Animaciones de clientes (si existen sus hojas) y del recibo. */
    crearAnimaciones() {
        [1, 2, 3, 4].forEach((n) => {
            const k = 'cliente-' + n + '-anim';
            if (!this.textures.exists(k)) { return; }
            const crear = (nombre, a, b, repetir) => this.anims.create({
                key: 'c' + n + '-' + nombre, frameRate: 10, repeat: repetir,
                frames: this.anims.generateFrameNumbers(k, { start: a, end: b })
            });
            crear('frente', 0, 5, -1);      // baja por la cola
            crear('derecha', 6, 11, -1);    // entra de perfil
            crear('bolsa', 12, 17, -1);     // se va con la bolsa
            crear('dinero', 18, 21, 0);     // extiende el dinero
            crear('coger', 22, 23, 0);      // coge la bolsa
        });
        if (this.textures.exists('clientes-protesta')) {              // el cliente protesta: una fila de 6 frames por cliente
            [1, 2, 3, 4].forEach((n) => this.anims.create({
                key: 'c' + n + '-protesta', frameRate: 10, repeat: 1,
                frames: this.anims.generateFrameNumbers('clientes-protesta', { start: (n - 1) * 6, end: (n - 1) * 6 + 5 })
            }));
        }
        if (this.textures.exists('cajero-extra')) {                   // animaciones del tendero (fila * 6 + columna)
            const f = (a, b) => this.anims.generateFrameNumbers('cajero-extra', { start: a, end: b });
            this.anims.create({ key: 'cajero-reposo', frames: f(0, 5), frameRate: 3, repeat: -1 });
            this.anims.create({ key: 'cajero-saludar', frames: f(6, 11), frameRate: 8 });
            this.anims.create({ key: 'cajero-teclear', frames: f(12, 15), frameRate: 14 });
            this.anims.create({ key: 'cajero-celebrar', frames: f(18, 23), frameRate: 9 });
            this.anims.create({ key: 'cajero-molesto', frames: f(24, 27), frameRate: 6, repeat: 1 });
        }
        this.anims.create({ key: 'recibo-imprimir', frameRate: 12, frames: this.anims.generateFrameNumbers('recibo-imprimir', { start: 0, end: 9 }) });
        this.anims.create({ key: 'recibo-arrancar', frameRate: 12, frames: this.anims.generateFrameNumbers('recibo-arrancar', { start: 0, end: 3 }) });
    }

    crearTienda() {
        this.add.tileSprite(0, 0, 160, 270, 'suelo').setOrigin(0);
        this.add.image(0, 0, 'pared').setOrigin(0);
        this.add.image(...TIENDA.cestas, 'cestas').setOrigin(0);
        this.add.image(...TIENDA.planta, 'planta').setOrigin(0);
        this.add.image(...TIENDA.mueble, 'mueble-trasero').setOrigin(0);

        // Fila de clientes (de arriba, la cola, a abajo, el atendido): empieza vacía; los clientes entran al abrir la jornada
        this.fila = [];

        this.crearBandaMini();
        const [cx, cy, cw, ch] = TIENDA.canal;
        this.bandaTienda = this.add.tileSprite(cx, cy, cw, ch, 'banda-mini').setOrigin(0);
        this.add.image(...TIENDA.mostrador, 'mostrador-caja').setOrigin(0);     // el canal es transparente
        this.crearMiniPuesto();
        this.cajeroSprite = this.add.sprite(...TIENDA.cajero, 'cajero').setOrigin(0);       // mira hacia la cola (izquierda)
        this.cajeroActual = 'reposo';
        this.cajeroOcupado = false;                                                          // true mientras da el cambio
        this.cajeroReposo();
        this.add.image(...TIENDA.luz, 'luz-carril').setOrigin(0);
        const [lx, ly, lw, lh] = TIENDA.luzCara;
        this.add.text(lx + lw / 2, ly + lh / 2, '1', { ...FUENTE, color: '#2ce8f5' }).setOrigin(0.5);   // nº de carril
    }

    // ------------------------------------------------------------------
    // Clientes: cola, entrada y salida
    // ------------------------------------------------------------------
    crearCliente(n, x, y) {
        const o = { c: this.add.sprite(x, y, 'cliente-' + n, 0).setOrigin(0.5, 1), n, y, cara: 0, nombre: Nombres.generar(), tag: null };
        this.bob(o);
        return o;
    }

    /** Nombre completo del cliente que se está atendiendo (el de abajo de la fila), para el cobro. */
    nombreClienteActual() {
        const o = this.fila[this.fila.length - 1];
        return o ? o.nombre.completo : 'Cliente';
    }

    /** Etiqueta con el nombre del cliente atendido, sobre su cabeza (solo el primer nombre). */
    refrescarEtiqueta() {
        this.fila.forEach((o, i) => {
            const atendido = i === this.fila.length - 1;
            if (!atendido && o.tag) { o.tag.destroy(); o.tag = null; }
        });
        const o = this.fila[this.fila.length - 1];
        if (o && !o.tag && !o.saliendo && !o.enMarcha) {
            o.tag = this.add.text(o.c.x, o.y - 44, o.nombre.nombre, { ...FUENTE, color: '#ffffff', stroke: '#181425', strokeThickness: 3 })
                .setOrigin(0.5, 1).setDepth(6);
            o.tag.x = Math.max(o.c.x, o.tag.width / 2 + 2);          // los nombres largos no se salen por la izquierda
        }
    }

    /** Llegan clientes por la izquierda hasta llenar la fila (4). alPrimero se llama cuando el primero llega a la caja. */
    llenarFila(alPrimero) {
        const c0 = TIENDA.cola;
        const huecos = 4 - this.fila.length;
        for (let k = 0; k < huecos; k++) {
            this.time.delayedCall(k * 1100, () => {
                const nuevo = this.crearCliente(Phaser.Math.Between(1, 4), -20, c0.y);
                const puesto = 3 - this.fila.length;                         // 3 = el de abajo (atendido), 0 = el de arriba
                this.fila.unshift(nuevo);
                this.mover(nuevo, c0.x, c0.y, 900, 'derecha', () => {
                    this.mover(nuevo, c0.x, c0.y + puesto * c0.paso, 500 * puesto + 1, 'frente', () => {
                        if (k === 0 && alPrimero) { alPrimero(); }
                    });
                });
            });
        }
    }

    /** Cierra la tienda: los clientes que seguían en la fila se van hacia abajo, uno tras otro. */
    despedirFila() {
        const fila = this.fila;
        this.fila = [];
        fila.forEach((o, i) => {
            this.tweens.killTweensOf(o.c);
            this.quieto(o);
            o.saliendo = true;
            if (o.tag) { o.tag.destroy(); o.tag = null; }
            this.time.delayedCall(i * 300, () => {
                this.animar(o, 'frente');
                this.tweens.add({ targets: o.c, y: 270 + 48, duration: 1900, ease: 'Linear', onComplete: () => o.c.destroy() });
            });
        });
    }

    /** Rebote suave de 1 px mientras espera. */
    bob(o) {
        this.quieto(o);
        o.bobTween = this.tweens.add({ targets: o.c, y: o.y - 1, duration: 500 + Math.random() * 200, yoyo: true, repeat: -1, ease: 'Stepped' });
    }

    quieto(o) {
        if (o.bobTween) { o.bobTween.remove(); o.bobTween = null; }
        o.c.y = o.y;
    }

    /** Reproduce una animación del cliente si su hoja existe. Devuelve si había animación. */
    animar(o, tipo) {
        const k = 'c' + o.n + '-' + tipo;
        if (!this.anims.exists(k)) { return false; }
        o.c.play(k);
        return true;
    }

    /** Vuelve a la pose de pie con su expresión (0 normal · 1 esperando · 2 molesto · 3 satisfecho). */
    pararAnim(o) {
        o.c.anims.stop();
        o.c.setTexture('cliente-' + o.n, o.cara);
    }

    /** Camina hasta (x, y). Con la hoja de animación anda; sin ella, se desliza. */
    mover(o, x, y, ms, anim, fin) {
        if (o.tag) { o.tag.destroy(); o.tag = null; }                  // el nombre reaparece al llegar
        o.enMarcha = true;
        this.quieto(o);
        this.animar(o, anim);
        this.tweens.add({
            targets: o.c, x, y, duration: ms, ease: 'Linear',
            onComplete: () => { o.enMarcha = false; o.y = y; this.pararAnim(o); this.bob(o); this.refrescarEtiqueta(); if (fin) { fin(); } }
        });
    }

    /** El atendido coge la bolsa y se va; la cola avanza un puesto y entra otro cliente por la izquierda. */
    clienteSale(cara) {
        const servido = this.fila.pop();
        const c0 = TIENDA.cola;
        servido.saliendo = true;
        if (servido.tag) { servido.tag.destroy(); servido.tag = null; }
        servido.cara = cara;
        this.quieto(servido);
        // Si protesta (cara 2) y existe su animación: primero se enfada, con un globito, y luego coge la bolsa y se va.
        const protesta = cara === 2 && this.anims.exists('c' + servido.n + '-protesta');
        const espera = protesta ? 1300 : 0;
        if (protesta) {
            servido.c.play('c' + servido.n + '-protesta');
            this.globoProtesta(servido);
        } else {
            servido.c.setTexture('cliente-' + servido.n, cara);
        }
        this.time.delayedCall(espera, () => {
            servido.c.setTexture('cliente-' + servido.n, cara);
            const conPose = this.anims.exists('c' + servido.n + '-coger');
            if (conPose) { servido.c.play('c' + servido.n + '-coger'); }
            this.time.delayedCall(conPose ? 500 : 250, () => {
                this.animar(servido, 'bolsa');
                this.tweens.add({ targets: servido.c, y: 270 + 48, duration: 1900, ease: 'Linear', onComplete: () => servido.c.destroy() });
            });
        });
        this.time.delayedCall(900 + espera, () => {
            this.fila.forEach((o) => this.mover(o, o.c.x, o.y + c0.paso, 700, 'frente'));
            if (this.jornada.admiteClientes) {
                const nuevo = this.crearCliente(Phaser.Math.Between(1, 4), -20, c0.y);
                this.fila.unshift(nuevo);
                this.mover(nuevo, c0.x, c0.y, 1000, 'derecha', () => { this.finClientes = true; this.siguienteSiListo(); });
            } else {                                                   // cerrando: no entra nadie más, la fila solo avanza
                this.time.delayedCall(800, () => { this.finClientes = true; this.siguienteSiListo(); });
            }
        });
    }

    /** Globito rojo con un grito sobre la cabeza del cliente que protesta (desaparece solo). */
    globoProtesta(o) {
        const gritos = ['OIGA!', 'ABUSO!', 'ASI NO!', 'NO, NO!'];
        const t = this.add.text(o.c.x, o.y - 44, Phaser.Utils.Array.GetRandom(gritos), { ...FUENTE, color: '#e43b44', stroke: '#ffffff', strokeThickness: 4 })
            .setOrigin(0.5, 1).setDepth(7);
        t.x = Math.max(o.c.x, t.width / 2 + 2);
        this.tweens.add({ targets: t, y: t.y - 4, duration: 160, yoyo: true, repeat: 3, ease: 'Stepped' });
        this.time.delayedCall(1250, () => this.tweens.add({ targets: t, alpha: 0, duration: 150, onComplete: () => t.destroy() }));
    }

    /** Llega el siguiente cliente a la banda cuando la bolsa ya se cambió y la cola terminó de avanzar. */
    siguienteSiListo() {
        if (!this.finBolsa || !this.finClientes) { return; }
        this.finBolsa = false;
        this.finClientes = false;
        if (!this.jornada.admiteClientes) { return this.jornada.clienteTerminado(); }     // cerrando: no entra otro cliente
        this.nuevaCompra(this.compraDelSiguiente());
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

    }

    /** Compra del próximo cliente: la aleatoria del juego (Juego.compraAleatoria), que el backend puede sustituir. */
    compraDelSiguiente() {
        return Juego.compraAleatoria((sku) => this.esFruta(sku));
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

        if ((enEscaner || enBalanza) && this.cobrando) { return this.rechazar(p, 'ESPERA', 'PROCESANDO'); }
        if ((enEscaner || enBalanza) && this.entregando) { return this.rechazar(p, 'ESPERA', 'BOLSA CERRANDO'); }
        if ((enEscaner || enBalanza) && this.venta.pagada) { return this.rechazar(p, 'YA COBRADO', 'ENTREGA'); }
        if (enEscaner) {
            if (fruta) { return this.rechazar(p, 'FRUTA', 'PESA Y CODIGO'); }
            // QTY no se limita: si cuentas más unidades de las que hay, cobras de más (el cliente protestará)
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
        // Dura más de lo pedido, y nunca menos de lo que tarda en desplazarse un texto largo entero.
        const duracion = Math.max(ms * FACTOR_AVISO, this.lineaArriba.tiempoLectura, this.lineaAbajo.tiempoLectura);
        this.temporizadorPantalla = this.time.delayedCall(duracion, () => this.restaurarPantalla());
    }

    restaurarPantalla() {
        if (this.entrada || this.modo === 'EFECTIVO') { this.refrescarEntrada(); }
        else { this.pantallaReposo(); }
    }

    /** Pantalla en reposo: el total acumulado de la venta (o el cambio, si ya se cobró). */
    pantallaReposo() {
        if (!this.jornada.operativa) { return this.mostrar('CERRADO', 'ABRE JORNADA'); }
        if (this.venta.pagada) {
            return this.mostrar('CAMBIO', Money.pantalla(Money.fromCents(this.venta.cambio)));
        }
        const t = this.venta.ticket();
        const etiqueta = this.qtyPendiente ? 'CANTIDAD x' + this.qtyPendiente : (t.descuento ? 'TOTAL -5%' : 'TOTAL');
        this.mostrar(etiqueta, Money.pantalla(Money.fromCents(t.total)));
    }

    /** Nombre del producto para la pantalla de la caja (si es largo, la pantalla lo desplaza). */
    nombreCorto(sku, kg, n) {
        const nombre = (Juego.producto(sku).nombre || sku).toUpperCase();
        return (kg ? kg + 'KG ' : (n > 1 ? 'x' + n + ' ' : '')) + nombre;
    }

    /** Lo que queda sin cobrar en la banda o la balanza se lo lleva el cliente (será una pérdida al cierre). */
    llevarseLoQueQueda() {
        const resto = this.cola.concat(this.enBalanza ? [this.enBalanza] : []);
        this.cola = [];
        this.enBalanza = null;
        this.pesoTexto.setText('0 kg');
        this.miniFrutaEn(null);
        resto.forEach((o) => { o.estado = 'moviendo'; o.disableInteractive(); });
        this.tweens.add({ targets: resto, x: '-=40', alpha: 0, duration: 500, onComplete: () => resto.forEach((o) => o.destroy()) });
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
                    p.kg = this.compra[p.sku] || 1;               // lo que pesa de verdad la compra del cliente
                    this.avisar('PESADO ' + p.kg + 'KG', 'TECLEA CODIGO', 1800);
                }
                this.pesoTexto.setText(p.kg + ' kg');
                this.miniFrutaEn(p.sku);
            }
        });
    }

    /** El producto pasa por el cristal del escáner (láser y OK) y entra en la bolsa. */
    escanear(p) {
        this.cajeroAnimar('teclear');
        this.entrada = '';                                          // un número sin confirmar con QTY no cuenta: se cobra 1
        const n = this.qtyPendiente || 1;
        this.qtyPendiente = null;
        p.cantidad = n;
        p.grupo = [p].concat(n > 1 ? this.tomarDeLaBanda(p.sku, n - 1) : []);     // las unidades que cuenta QTY
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

    /** QTY: retira de la banda k unidades más del mismo producto (las más cercanas al escáner). Los demás avanzan solos. */
    tomarDeLaBanda(sku, k) {
        const elegidos = this.cola.filter((o) => o.sku === sku && o.estado === 'banda').slice(0, k);
        this.cola = this.cola.filter((o) => !elegidos.includes(o));
        elegidos.forEach((o) => { o.estado = 'moviendo'; });
        return elegidos;
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
        this.cancelarCobroAbierto();
        const unidades = p.grupo || [p];                            // QTY: varias unidades entran juntas
        const sku = p.skuCobrado || p.sku;                          // lo que se COBRA (puede no ser lo que es, si se tecleó otro código)
        p.cantidad = p.kg || p.cantidad || 1;                       // la fruta cuenta por kg
        const r = this.venta.agregar(sku, p.cantidad);
        this.registros.push({ sku, cantidad: p.cantidad, sprites: unidades });
        this.avisar(this.nombreCorto(sku, p.kg, p.kg ? 0 : p.cantidad), Money.pantalla(Money.fromCents(r.delta)), 1500);   // precio de lo registrado, con IVA
        unidades.forEach((u) => this.itemsBolsa.push(u));
        this.enBolsa = this.itemsBolsa.length;
        this.reubicarBolsa();
        this.actualizarBolsa();
    }

    /** VOID: anula lo último que se registró. Sus unidades vuelven a la banda y hay que escanearlas otra vez. */
    anularUltimo() {
        if (this.entregando) { return this.avisar('ESPERA', 'BOLSA CERRANDO', 1400); }
        if (this.venta.pagada) { return this.avisar('YA COBRADO', 'NO SE ANULA', 1400); }
        const r = this.registros.pop();
        if (!r) { return this.avisar('NADA QUE', 'ANULAR', 1400); }
        this.cancelarCobroAbierto();
        const q = this.venta.quitar(r.sku, r.cantidad);
        this.avisar('ANULADO', '-' + Money.pantalla(Money.fromCents(q.delta)), 1500);
        this.itemsBolsa = this.itemsBolsa.filter((it) => !r.sprites.includes(it));
        this.enBolsa = this.itemsBolsa.length;
        r.sprites.forEach((it) => { it.grupo = null; it.cantidad = 0; it.skuCobrado = null; this.volverALaBanda(it); });
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
        const listo = this.enBolsa > 0 && this.venta.pagada && !this.dandoCambio;        // solo se entrega una venta cobrada
        this.botonEntregar.setFrame(listo ? 0 : 2);
        this.textoEntregar.setColor(listo ? '#ffffff' : '#181425');
    }

    crearBotonEntregar() {
        const [x, y] = [BANDA_X + BANDA.boton[0], BANDA.boton[1]];
        this.botonEntregar = this.add.sprite(x, y, 'boton-entregar', 2).setOrigin(0).setInteractive({ useHandCursor: true });
        this.textoEntregar = this.add.text(x + 48, y + 4, 'ENTREGAR', { ...FUENTE, color: '#181425' }).setOrigin(0.5, 0);
        const soltar = () => {
            this.textoEntregar.y = y + 4;
            if (!this.entregando) { this.actualizarBolsa(); }
        };
        this.botonEntregar.on('pointerdown', () => {
            if (this.entregando) { return; }
            if (this.enBolsa === 0) { return this.avisar('BOLSA VACIA', 'NADA QUE DAR', 1400); }
            if (!this.venta.pagada) { return this.avisar('COBRA PRIMERO', 'PULSA PAY', 1600); }
            if (this.dandoCambio) { return this.avisar('ESPERA', 'DANDO EL CAMBIO', 1200); }
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
        // Hito 2: aquí se llama a Api.checkout(venta.carrito(), efectivo) y se muestra el ticket.
        // Auditoría: se compara lo que el cliente se lleva con lo que se cobró.
        const liq = Auditoria.liquidar(this.compra, this.venta.carrito(), (sku) => Juego.producto(sku));
        const res = this.jornadaJuego.registrar(liq, this.venta.total(), this.cuadre || undefined);
        if (res.exacta) { this.cajeroAnimar('celebrar'); }                  // venta exacta: celebra
        else if (res.protesta) { this.cajeroAnimar('molesto'); }            // el cliente protesta: se molesta
        this.llevarseLoQueQueda();
        this.arrancarRecibo();
        this.quitarBilletes(false);
        this.recogerCambio();
        this.dinero = null;
        this.cuadre = null;
        this.finBolsa = false;
        this.finClientes = false;
        this.clienteSale(res.protesta ? 2 : (res.exacta ? 3 : 0));          // se va molesto, satisfecho o sin más
        this.venta = Venta.crear((sku) => Juego.producto(sku));
        this.modo = 'CODIGO';
        this.entrada = '';
        this.registros = [];
        this.qtyPendiente = null;
        // El tendero no sabe de las pérdidas hasta el cierre, pero un sobrecobro sí lo nota el cliente.
        if (res.protesta) { this.avisar('CLIENTE PROTESTA', 'COBRASTE DE MAS ' + Auditoria.PUNTOS_PROTESTA + ' PTS', 2600); }
        else if (res.exacta) { this.avisar('GRACIAS', 'VENTA EXACTA +' + Auditoria.PUNTOS_VENTA_EXACTA, 2200); }
        else { this.avisar('GRACIAS', 'VUELVA PRONTO', 1800); }
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
                onComplete: () => { this.bolsa.clearMask(); this.entregando = false; this.finBolsa = true; this.siguienteSiListo(); }
            });
        };

        this.tweens.add({                               // 1) los productos se hunden y desaparecen
            targets: items, y: '+=10', alpha: 0, duration: 200,
            onComplete: () => {
                items.forEach((it) => it.destroy());
                this.bolsaFrente.setVisible(false);
                this.textoExtra.setText('');
                if (this.faltantes.has('bolsa-cerrar')) {         // sin la animación: solo un parpadeo
                    this.tweens.add({ targets: this.bolsa, alpha: 0, duration: 150, yoyo: true, onYoyo: () => this.bolsaFrente.setVisible(true), onComplete: () => { this.entregando = false; this.finBolsa = true; this.siguienteSiListo(); } });
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
        // Los textos largos se desplazan (marquesina) y se recortan al interior de la pantalla
        this.pantalla = { izq: CX + px + 2, der: CX + px + pw - 2, ancho: pw - 4 };
        const mascara = this.make.graphics({ add: false }).fillRect(this.pantalla.izq, CY + py, this.pantalla.ancho, ph).createGeometryMask();
        this.lineaArriba.setMask(mascara);
        this.lineaAbajo.setMask(mascara);

        Object.entries(CAJA_TECLAS).forEach(([label, def]) => this.crearTecla(label, CX, CY, def));

        // Bandeja con los billetes del cliente y recibo que sale de la impresora
        this.add.image(...COBRO.bandeja, 'bandeja-efectivo').setOrigin(0);
        this.recibo = this.add.sprite(...COBRO.recibo, 'recibo-imprimir', 0).setOrigin(0).setVisible(false).setDepth(5);

        // Libro de códigos PLU, con páginas: 4 productos por página (2 en cada mitad del libro), ordenados por código
        const [libroX, libroY] = COBRO.libro;
        this.add.image(libroX, libroY, 'libro').setOrigin(0);
        this.libroPagina = 0;
        this.libroObjs = [];
        this.libroTotal = Math.ceil(Object.keys(PLU).length / PLU_POR_PAGINA);
        this.libroNumero = this.add.text(libroX + 101, libroY + 51, '', { ...FUENTE, color: COLOR.tinta }).setOrigin(0.5, 0).setDepth(2);
        const flecha = (x, texto, delta) => {
            const t = this.add.text(x, libroY + 51, texto, { ...FUENTE, color: COLOR.tinta }).setOrigin(0.5, 0).setDepth(2)
                .setInteractive({ useHandCursor: true, hitArea: new Phaser.Geom.Rectangle(-7, -4, 22, 16), hitAreaCallback: Phaser.Geom.Rectangle.Contains });
            t.on('pointerover', () => t.setColor('#e43b44'));
            t.on('pointerout', () => t.setColor(COLOR.tinta));
            t.on('pointerdown', () => this.cambiarPaginaLibro(delta));
            return t;
        };
        this.libroFlechas = [flecha(libroX + 82, '<', -1), flecha(libroX + 120, '>', 1)]       // abajo en la página derecha: < 1/3 >;
        this.input.keyboard.on('keydown-LEFT', () => this.cambiarPaginaLibro(-1));      // también con las flechas del teclado
        this.input.keyboard.on('keydown-RIGHT', () => this.cambiarPaginaLibro(1));
        this.mostrarPaginaLibro();
    }

    /** Pasa de página (da la vuelta: de la última a la primera y al revés). */
    cambiarPaginaLibro(delta) {
        if (!this.libroTotal) { return; }
        this.libroPagina = (this.libroPagina + delta + this.libroTotal) % this.libroTotal;
        this.mostrarPaginaLibro();
    }

    /** Dibuja los 4 productos de la página actual: icono y código (izquierda: los 2 primeros, derecha: los 2 siguientes). */
    mostrarPaginaLibro() {
        this.libroObjs.forEach((o) => o.destroy());
        this.libroObjs = [];
        const [, libroY] = COBRO.libro;
        const entradas = Object.entries(PLU).slice(this.libroPagina * PLU_POR_PAGINA, (this.libroPagina + 1) * PLU_POR_PAGINA);
        entradas.forEach(([codigo, sku], i) => {
            const mitad = i < 2 ? 0 : 1;
            const fila = i % 2;
            const x = 338 + mitad * 70;
            const y = libroY + 6 + fila * 26;
            this.libroObjs.push(this.add.image(x, y, sku).setOrigin(0).setDepth(2));
            this.libroObjs.push(this.add.text(x + 20, y + 4, codigo, FUENTE).setDepth(2));
        });
        this.libroNumero.setText((this.libroPagina + 1) + '/' + this.libroTotal);
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
        if (!this.jornada.operativa) { return this.avisar('CERRADO', 'ABRE LA JORNADA', 1600); }
        this.cajeroAnimar('teclear');
        if (this.cobrando) { return; }                       // esperando al cobrador: teclado bloqueado
        if (/^\d$/.test(label)) {
            if (this.venta.pagada) { return; }
            if (this.entrada.length < (this.modo === 'EFECTIVO' ? 7 : 4)) { this.entrada += label; }
            this.refrescarEntrada();
        } else if (label === 'PAY') {
            if (this.modo === 'EFECTIVO') { this.confirmarEfectivo(); }      // 2.ª pulsación: confirma el efectivo tecleado
            else { this.iniciarCobro(); }                                    // 1.ª: empieza el cobro
        } else if (label === 'QTY') {
            this.armarCantidad();
        } else if (label === 'VOID') {
            this.anularUltimo();
        } else if (label === 'CLR') {
            if (this.modo === 'EFECTIVO') { this.quitarBilletes(false); }     // cancela el cobro: el cliente guarda su dinero
            this.modo = 'CODIGO';
            this.entrada = '';
            this.qtyPendiente = null;
            this.pantallaReposo();
        } else if (label === 'ENT') {
            if (this.modo === 'EFECTIVO') { this.confirmarEfectivo(); }
            else { this.registrarCodigo(this.entrada); }
            this.entrada = '';
        }
    }

    /** QTY: el número tecleado será la cantidad del próximo producto que se escanee (hay que pasar al menos 1 por el escáner). */
    armarCantidad() {
        if (this.entregando) { return this.avisar('ESPERA', 'BOLSA CERRANDO', 1400); }
        if (this.venta.pagada) { return this.avisar('YA COBRADO', 'ENTREGA', 1400); }
        if (this.modo === 'EFECTIVO') { return; }
        const n = parseInt(this.entrada || '0', 10);
        this.entrada = '';
        if (!n) { return this.avisar('TECLEA LA', 'CANTIDAD', 1200); }
        if (n > 99) { return this.avisar('MAXIMO', '99', 1200); }
        this.qtyPendiente = n;
        this.avisar('CANTIDAD x' + n, 'ESCANEA UNO', 1400);
    }

    /** PAY: solo se cobra una venta con productos, ya escaneados todos, y que no esté cobrada. */
    iniciarCobro() {
        if (this.entregando) { return this.avisar('ESPERA', 'BOLSA CERRANDO', 1400); }
        if (this.venta.pagada) { return this.avisar('YA COBRADO', 'ENTREGA', 1400); }
        if (this.venta.vacia()) { return this.avisar('NADA QUE', 'COBRAR', 1400); }
        // Se puede cobrar aunque queden productos en la banda: el cliente se los llevará sin pagar (pérdida).
        if (this.children.list.some((o) => o.sku && o.active && (o.estado === 'arrastrando' || o.estado === 'moviendo'))) {
            return this.avisar('ESPERA', 'UN MOMENTO', 1000);
        }
        // El cliente saca su dinero: el tendero tiene que leer los billetes de la bandeja y teclear la suma.
        this.dinero = Cobro.asegurar(this.dinero, this.venta.total(), Math.random);      // siempre alcanzan para la cuenta de AHORA
        this.mostrarBilletes();
        const servido = this.fila[this.fila.length - 1];
        if (servido && this.animar(servido, 'dinero')) {
            this.quieto(servido);
            servido.c.once('animationcomplete', () => { this.pararAnim(servido); this.bob(servido); });
        }
        this.modo = 'EFECTIVO';
        this.entrada = '';
        this.refrescarEntrada();
    }

    /**
     * Confirma el efectivo tecleado: pide el cobro al cobrador (el simulador local o, más adelante, el backend).
     * Mientras llega la respuesta el teclado queda bloqueado: la API no es idempotente (un doble PAY crearía dos ventas).
     */
    confirmarEfectivo() {
        if (this.cobrando) { return; }
        if (!this.entrada) { return this.avisar('ESCRIBE EL', 'EFECTIVO', 1200); }
        const efectivo = parseInt(this.entrada, 10) * 100;
        this.entrada = '';
        if (!this.dinero || this.dinero.suma < this.venta.total()) {      // no debería pasar: la cuenta cambió sin cancelar el cobro
            this.cancelarCobroAbierto();
            return this.avisar('LA CUENTA', 'CAMBIO: PAY', 1600);
        }
        this.cobrando = true;
        this.mostrar('PROCESANDO', 'ESPERE...');
        Juego.cobrar({ carrito: this.venta.carrito(), efectivo, cliente: this.nombreClienteActual() })
            .then((r) => this.cobroOk(efectivo, r), (e) => this.cobroError(efectivo, e));
    }

    /** El cobrador confirmó el pago: la venta queda cobrada con SUS importes y sale el recibo. */
    cobroOk(efectivo, r) {
        this.cobrando = false;
        this.venta.marcarCobrada({ efectivo, total: r.total, cambio: r.cambio });
        this.cuadre = Auditoria.cuadreCaja(this.dinero ? this.dinero.suma : efectivo, efectivo, r.total);
        this.modo = 'CODIGO';
        this.quitarBilletes(true);
        this.imprimirRecibo();
        this.cajeroDaCambio(r.cambio);
        this.actualizarBolsa();            // ENTREGAR se activa cuando termina de salir el cambio
        this.pantallaReposo();             // CAMBIO + importe
    }

    /** El cobrador rechazó el cobro (efectivo insuficiente, stock, jornada cerrada, sin red…): no se cobró nada. */
    cobroError(efectivo, e) {
        this.cobrando = false;
        const faltan = this.venta.total() - efectivo;
        if (e && e.status === 422 && faltan > 0) { return this.avisar('FALTAN', Money.pantalla(Money.fromCents(faltan)), 1800); }
        this.avisar('ERROR ' + ((e && e.status) || ''), (e && e.mensaje) || 'SIN RESPUESTA', 2200);
    }

    // ------------------------------------------------------------------
    // Billetes, recibo y cambio (animaciones de la caja)
    // ------------------------------------------------------------------
    /** Si la cuenta cambia mientras se está cobrando, el cobro se cancela: el cliente guarda su dinero y sacará otro para la cuenta nueva. */
    cancelarCobroAbierto() {
        if (this.modo !== 'EFECTIVO') { return; }
        this.quitarBilletes(false);
        this.modo = 'CODIGO';
        this.entrada = '';
    }

    /** Los billetes del cliente aparecen en los compartimentos de la bandeja (una pila por valor). */
    mostrarBilletes() {
        this.quitarBilletes(false);
        const [bx, by] = COBRO.bandeja;
        const [bw, bh] = COBRO.billete;
        const [zx, zy, zw, zh] = COBRO.zonaValor;
        Object.keys(this.dinero.cuentas).map(Number).sort((a, b) => a - b).forEach((valor, k) => {
            const [cx, cy, cw, ch] = COBRO.compartimentos[k];
            const n = this.dinero.cuentas[valor];
            const paso = n > 1 ? Math.min(2, Math.floor(4 / (n - 1))) : 0;      // la pila cabe en el compartimento
            for (let i = 0; i < n; i++) {
                const x = bx + cx + Math.floor((cw - bw) / 2);
                const y = by + cy + ch - bh - 1 - i * paso;
                const img = this.add.image(x - 60, y, 'billetes', Cobro.BILLETES.indexOf(valor)).setOrigin(0).setDepth(3 + i).setAlpha(0);
                this.billetesObjs.push(img);
                this.tweens.add({ targets: img, x, alpha: 1, duration: 250, delay: k * 90 + i * 60, ease: 'Quad.easeOut' });
                if (i === n - 1) {                                            // el valor (2K, 10K…), escrito en la zona lisa del billete de arriba
                    const t = this.etiquetaBillete(String(valor / 1000) + 'K');
                    t.setPosition(x - 60 + zx + Math.floor((zw - t.ancho) / 2), y + zy + Math.floor((zh - 6) / 2)).setDepth(10).setAlpha(0);
                    this.billetesObjs.push(t);
                    this.tweens.add({ targets: t, x: x + zx + Math.floor((zw - t.ancho) / 2), alpha: 1, duration: 250, delay: k * 90 + i * 60, ease: 'Quad.easeOut' });
                }
            }
        });
    }

    /** Etiqueta de un billete dibujada píxel a píxel con GLIFOS_BILLETE (4 x 6, 1 px entre letras). */
    etiquetaBillete(texto) {
        const g = this.add.graphics().fillStyle(COLOR.contorno);
        let cursor = 0;
        texto.split('').forEach((c) => {
            GLIFOS_BILLETE[c].forEach((fila, y) => fila.split('').forEach((px, x) => {
                if (px === 'X') { g.fillRect(cursor + x, y, 1, 1); }
            }));
            cursor += 5;
        });
        g.ancho = cursor - 1;
        return g;
    }

    /** Retira los billetes: al cobrar pasan al cajón (suben y desaparecen); al cancelar, vuelven al cliente. */
    quitarBilletes(haciaCaja) {
        const objs = this.billetesObjs;
        this.billetesObjs = [];
        if (!objs.length) { return; }
        if (!haciaCaja) { return objs.forEach((o) => o.destroy()); }
        this.tweens.add({ targets: objs, y: '-=24', alpha: 0, duration: 350, onComplete: () => objs.forEach((o) => o.destroy()) });
    }

    imprimirRecibo() {
        this.recibo.setTexture('recibo-imprimir', 0).setVisible(true).play('recibo-imprimir');
    }

    arrancarRecibo() {
        if (!this.recibo.visible) { return; }
        this.recibo.setTexture('recibo-arrancar', 0).play('recibo-arrancar');
        this.recibo.once('animationcomplete', () => this.recibo.setVisible(false));
    }

    /** El tendero vuelve a su pose de espera (con respiración y parpadeo si existe la hoja de animaciones). */
    cajeroReposo() {
        this.cajeroActual = 'reposo';
        if (this.anims.exists('cajero-reposo')) { this.cajeroSprite.play('cajero-reposo'); }
        else { this.cajeroSprite.setTexture('cajero'); }
    }

    /** Anima al tendero (saludar, teclear, celebrar, molesto) y al terminar vuelve al reposo. Respeta las prioridades. */
    cajeroAnimar(nombre) {
        if (!this.anims.exists('cajero-' + nombre) || this.cajeroOcupado) { return; }
        const actual = this.cajeroActual;
        if (actual !== 'reposo' && PRIO_CAJERO[actual] > PRIO_CAJERO[nombre] && this.cajeroSprite.anims.isPlaying) { return; }
        this.cajeroActual = nombre;
        this.cajeroSprite.play('cajero-' + nombre);
        this.cajeroSprite.once('animationcomplete', () => { if (this.cajeroActual === nombre && !this.cajeroOcupado) { this.cajeroReposo(); } });
    }

    /**
     * El cajero da el cambio SOLO (el jugador no elige billetes): el cajón lo reparte en billetes (Cobro.desglosarCambio)
     * y lo que no llega a 2.000$ sale como un puñado de monedas. Todo cae a la bandeja de uno en uno; ENTREGAR espera al último.
     */
    cajeroDaCambio(cambio) {
        this.cajeroOcupado = true;
        this.cajeroSprite.anims.stop();
        if (this.textures.exists('cajero-anim')) {
            this.cajeroSprite.setTexture('cajero-anim', 2);
            this.time.delayedCall(450, () => this.cajeroSprite.setFrame(3));
        }
        this.time.delayedCall(1200, () => { this.cajeroOcupado = false; this.cajeroReposo(); });
        this.recogerCambio();
        const { billetes, monedas } = Cobro.desglosarCambio(cambio);
        const piezas = billetes.slice(0, 8).map((v) => ({ billete: v }));            // más de 8 no cabrían: el resto es solo cantidad
        if (monedas > 0) { piezas.push({ monedas }); }
        if (!piezas.length) { return; }
        this.dandoCambio = true;
        const [bx, by] = COBRO.bandeja;
        const [bw] = COBRO.billete;
        const [zx, zy, zw, zh] = COBRO.zonaValor;
        const anchoMonedas = monedas > 0 ? 22 : 0;
        const nB = billetes.slice(0, 8).length;
        const paso = nB > 1 ? Math.min(bw + 2, Math.floor((144 - 4 - anchoMonedas - bw) / (nB - 1))) : 0;
        let ultimo = 0;
        piezas.forEach((p, k) => {
            const demora = 350 + k * 230;
            ultimo = demora + 260;
            const objs = [];
            if (p.billete) {
                const x = bx + 2 + k * paso, y = by + 8;
                const img = this.add.image(x, y - 34, 'billetes', Cobro.BILLETES.indexOf(p.billete)).setOrigin(0).setDepth(30 - 2 * k).setAlpha(0);
                const t = this.etiquetaBillete(String(p.billete / 1000) + 'K');
                const ox = zx + Math.floor((zw - t.ancho) / 2), oy = zy + Math.floor((zh - 6) / 2);
                t.setPosition(x + ox, y - 34 + oy).setDepth(31 - 2 * k).setAlpha(0);
                objs.push(img, t);
                this.tweens.add({ targets: img, y, alpha: 1, duration: 260, delay: demora, ease: 'Quad.easeIn' });
                this.tweens.add({ targets: t, y: y + oy, alpha: 1, duration: 260, delay: demora, ease: 'Quad.easeIn' });
            } else {
                const g = this.add.graphics().setDepth(40).setAlpha(0);          // monedas: 1 a 3 según el monto
                const n = monedas < 50000 ? 1 : (monedas < 100000 ? 2 : 3);
                for (let i = 0; i < n; i++) {
                    const cx = 6 + i * 6, cy = 12 - (i === 2 ? 5 : 0);
                    g.fillStyle(COLOR.contorno).fillCircle(cx, cy, 5);
                    g.fillStyle(COLOR.amarillo).fillCircle(cx, cy, 4);
                    g.fillStyle(COLOR.naranja).fillRect(cx - 1, cy, 3, 3);
                    g.fillStyle(COLOR.blanco).fillRect(cx - 2, cy - 2, 2, 1);
                }
                g.setPosition(bx + 144 - 24, by + 6 - 34);
                objs.push(g);
                this.tweens.add({ targets: g, y: by + 6, alpha: 1, duration: 260, delay: demora, ease: 'Quad.easeIn' });
            }
            this.cambioObjs.push(...objs);
        });
        this.time.delayedCall(ultimo + 120, () => { this.dandoCambio = false; this.actualizarBolsa(); });
    }

    /** El cliente coge el cambio de la bandeja (o se cancela): desaparece hacia él. */
    recogerCambio() {
        const objs = this.cambioObjs;
        this.cambioObjs = [];
        this.tweens.killTweensOf(objs);
        if (!objs.length) { this.dandoCambio = false; return; }
        this.dandoCambio = false;
        this.tweens.add({ targets: objs, x: '-=40', alpha: 0, duration: 300, onComplete: () => objs.forEach((o) => o.destroy()) });
    }

    /**
     * ENT en modo CODIGO: el código tiene que existir y ser el de la fruta que está YA pesada en la balanza.
     * Si cuadra, la fruta entra en la bolsa y se añade a la venta (la caja muestra su precio por peso).
     */
    registrarCodigo(codigo) {
        const sku = PLU[codigo];
        const fruta = this.enBalanza;
        if (this.entregando) { return this.avisar('ESPERA', 'BOLSA CERRANDO', 1400); }
        if (this.venta.pagada) { return this.avisar('YA COBRADO', 'ENTREGA', 1400); }
        if (!sku) { return this.avisar('NO EXISTE', codigo, 1400); }
        if (!fruta || fruta.estado !== 'pesada') { return this.avisar('NADA PESADO', 'PESA LA FRUTA', 1400); }
        // El código tecleado es el que se cobra: si no es el de esta fruta, el error es del tendero.
        fruta.skuCobrado = sku;
        fruta.estado = 'moviendo';
        this.enBalanza = null;
        this.pesoTexto.setText('0 kg');
        this.miniFrutaEn(null);
        this.time.delayedCall(350, () => this.meterEnBolsa(fruta));
    }

    /** Lo que se está tecleando: un código de fruta (CODIGO) o el efectivo recibido junto al total (EFECTIVO). */
    refrescarEntrada() {
        if (this.modo === 'EFECTIVO') {
            const total = Money.pantalla(Money.fromCents(this.venta.total()));
            this.mostrar('TOTAL ' + total, '>' + Money.pantalla((this.entrada || '0') + '.00'));
        } else {
            this.mostrar('NUM: QTY/ENT', this.entrada);      // el número es una cantidad (QTY) o un código de fruta (ENT)
        }
    }

    /** Escribe en la pantalla de la caja: línea pequeña arriba y valor abajo. */
    mostrar(arriba, abajo) {
        this.actualizarMiniPantalla(arriba, abajo);
        this.escribirLinea(this.lineaArriba, arriba, false);
        this.escribirLinea(this.lineaAbajo, abajo, true);
    }

    /**
     * Escribe una línea de la pantalla. Si cabe, queda fija (a la izquierda, o a la derecha en la de abajo).
     * Si no cabe, se desplaza despacio de un extremo al otro, con una pausa en cada punta, hasta leerla entera.
     */
    escribirLinea(obj, texto, alineadaDerecha) {
        const p = this.pantalla;
        if (obj.marquesina) { obj.marquesina.remove(); obj.marquesina = null; }
        obj.setText(String(texto));
        obj.tiempoLectura = 0;
        if (obj.width <= p.ancho) {
            obj.setOrigin(alineadaDerecha ? 1 : 0, 0);
            obj.x = alineadaDerecha ? p.der : p.izq;
            return;
        }
        const exceso = obj.width - p.ancho;
        obj.setOrigin(0, 0);
        obj.x = p.izq;
        obj.tiempoLectura = PAUSA_MARQUESINA + exceso * MS_POR_PIXEL + PAUSA_MARQUESINA;   // una pasada completa
        obj.marquesina = this.tweens.add({
            targets: obj, x: p.izq - exceso, duration: exceso * MS_POR_PIXEL,
            hold: PAUSA_MARQUESINA, repeatDelay: PAUSA_MARQUESINA, yoyo: true, repeat: -1, ease: 'Linear'
        });
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
            if (a.opcional) { return; }                  // animaciones opcionales: sin ellas se usan deslizamientos
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
            case 'bandeja-efectivo':
                bloque(g, x, 0, w, h, C.gris5, C.gris3, C.gris4);
                COBRO.compartimentos.forEach(([cx, cy, cw, ch]) => bloque(g, x + cx, cy, cw, ch, C.gris4));
                return;
            case 'billetes': {
                const col = [C.gris1, C.madera, C.rojo, C.naranja, 0xb55088, C.verde][frame];
                bloque(g, x, 0, w, h, col, C.blanco, C.gris4);
                g.fillStyle(C.crema).fillRect(x + 14, 5, 18, 8);
                return;
            }
            case 'recibo-imprimir': case 'recibo-arrancar': {
                const imprimir = key === 'recibo-imprimir';
                if (imprimir && frame === 0) { return; }
                if (!imprimir && frame === 3) { return; }
                const largo = imprimir ? Math.min(46, 6 + frame * 5) : (frame === 2 ? 30 : 46);
                const dx = imprimir ? 0 : [0, 1, 6][frame];
                g.fillStyle(C.contorno).fillRect(x + 8 + dx, 6, 20, largo + 2);
                g.fillStyle(C.blanco).fillRect(x + 9 + dx, 7, 18, largo);
                for (let k = 0; k < Math.floor(largo / 6); k++) {
                    g.fillStyle(C.gris3).fillRect(x + 11 + dx, 10 + k * 6, 8 + ((k * 5) % 9), 1);
                }
                return;
            }
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
