# Plan del juego (capa de frontend)

El backend ya resuelve la parte comercial: precios, IVA, stock, jornadas y ventas.
Este plan explica cómo construir **encima** de él una experiencia jugable en pixel art,
sin tocar la lógica de PHP.

Assets e instrucciones para generarlos con IA: [ASSETS_IA.md](ASSETS_IA.md).

---

## 1. Decisiones cerradas

| Tema | Decisión | Motivo |
|---|---|---|
| Motor | **Phaser 3.90.0**, archivo local en `assets/js/vendor/` (igual que jQuery) | Es la versión 3.x más documentada; funciona sin bundler ni npm |
| Perspectiva | **Vista cenital 3/4** dividida en **tres columnas**: tienda · banda · caja | Pone el foco en la operación de caja (escanear, pesar, teclear PLU y cobrar) |
| Resolución lógica | Canvas de **480 × 270**, `pixelArt: true`, `Scale.FIT` (×2 = 960×540, ×3 = 1440×810, ×4 = 1920×1080) | Cabe el texto de la caja y del libro con una fuente pixel de 8 px |
| Tamaño de sprites | Productos: icono de **16 × 16**, que en la banda se dibuja a ×2 · clientes de **32 × 32** · el resto a medida (ver `phaser/assets.js`) | Un solo PNG por producto sirve para la banda, el libro y el ticket |
| Paleta | **Endesga 32** (lospec.com/palette-list/endesga-32) | Si todos los assets se ajustan a una misma paleta de 32 colores, el estilo queda coherente aunque vengan de fuentes distintas |
| UI de caja | **Dentro de Phaser**: pantalla, teclado (PAY, CLR, VOID, QTY, 0–9, ENT) y libro PLU | Con un teclado y un libro dibujados en pixel art, hacerlos en HTML rompería el estilo. jQuery se queda con la API, la jornada, el ticket y los mensajes |
| Frutas | No tienen código de barras: van a la **balanza** y se cobran tecleando su **PLU** (mapa `PLU` en `assets.js`). Los kg enteros son la cantidad que se envía a la API | No cambia el backend, que vende estos productos en unidades de 1 kg |
| Comunicación Phaser ↔ jQuery | Bus de eventos con jQuery: `const Bus = $({});` | No añade dependencias y deja **una sola** fuente de verdad (`GameState`) |
| Imágenes de productos | El frontend construye la ruta a partir del SKU: `assets/img/icons/fru-001.png` | No hay que modificar la BD; `imagen_url` del seed se ignora en el juego |
| Assets opcionales | Cada PNG que falta se sustituye por un placeholder generado del mismo tamaño | El juego se desarrolla sin esperar al arte; para poner arte real basta con dejar el archivo en su sitio |
| Sin frameworks extra | Sin React, sin npm, sin build | Mantiene el stack PHP + jQuery del proyecto |

**Regla de oro:** el navegador **propone** la venta y la API la **confirma**. Subtotal, IVA,
descuento, total y cambio se leen siempre de la respuesta de `checkout.php`.

---

## 2. Pantalla

```
  topbar HTML: jornada · (puntos) 
┌──────────── 0..160 ───────────┬─────────── 160..320 ──────────┬─────────── 320..480 ──────────┐
│ TIENDA                        │ BANDA (zoom)                  │ CAJA                          │
│ [estantería]                  │  🍎      🥤                    │ ┌ pantalla: TOTAL / PLU ────┐ │
│                   ┌mostrador┐ │      🥛     → la banda baja → │ └───────────────────────────┘ │
│ (cliente 4)       │ ║banda║ │ │   🥖                          │ [PAY][CLR]  [1][2][3]        │
│ (cliente 3)       │ ║     ║ │ │ ═════════════════════════════ │ [VOID][QTY] [4][5][6]        │
│ (cliente 2)       │ ║     ║ │ │ [ESCÁNER]       [BALANZA 2kg] │             [7][8][9]        │
│ (cliente 1) ←     │ ║     ║ │ │ ┌──────── BOLSA ───────────┐  │             [0][ ENT ]       │
│           (cajero)│         │ │ │  productos ya cobrados   │  │ ┌ libro PLU ────┬───────────┐│
│                   └─────────┘ │ └──────────────────────────┘  │ │🍎 4016 🍌 4011│🍅 4664    ││
└───────────────────────────────┴───────────────────────────────┴───────────────────────────────┘
```

Coordenadas exactas: `public/assets/js/phaser/CheckoutScene.js`. El ticket y los mensajes
de error son HTML, y el ticket aparece encima del juego cuando la API confirma la venta.

**Flujo del jugador (se arrastra con el ratón):**
- **Producto envasado:** de la banda al escáner (bip) → entra solo en la bolsa.
- **Fruta (sin código de barras):** de la banda a la balanza (marca los kg) → buscar su código en el libro →
  teclearlo y pulsar ENT → la pantalla muestra el precio según el peso (hoy 1 kg = 1 unidad) → entra sola en la bolsa.
  La fruta no pasa por el escáner, y lo envasado no se pesa. Si el código no coincide con la fruta pesada, se avisa.
- Cada producto escaneado muestra su **precio con IVA** en la pantalla de la caja y luego vuelve al **total acumulado**
  (con `-5%` si llega al umbral de descuento). La estimación replica `PricingService.php` y se comprueba contra él.
- **Cobro:** `PAY` solo funciona con productos en la bolsa y nada pendiente en la banda ni la balanza. Se teclea el efectivo
  (se ve el total y lo tecleado) y `ENT` lo confirma: si no alcanza dice `FALTAN`, si alcanza muestra el `CAMBIO`.
- **Inventario de compra:** cada cliente trae `{sku: cantidad}` (la fruta, en kg). En la banda hay un producto por unidad, y la
  fruta pesa lo que dice su inventario. Es lo que el cliente SE LLEVA, y se compara con lo que el tendero COBRÓ.
- **El tendero es responsable de sus errores** (el juego casi no los impide):
  - Productos que quedan en la banda al cobrar se los lleva el cliente sin pagar → **pérdida**.
  - Cobrar de menos (QTY o escaneo de menos, o una fruta con el código de otra más barata) → **pérdida**.
  - Cobrar de más (QTY mayor a las unidades reales, fruta con el código de otra más cara) → **sobrecobro**:
    el cliente protesta al momento (`CLIENTE PROTESTA`, −50 puntos). Una venta exacta da +100.
  - Las pérdidas NO se avisan en el momento: aparecen en el cierre de la jornada (ver [CIERRE_JORNADA.md](CIERRE_JORNADA.md)).
- **QTY:** teclear un número + `QTY` + escanear UNA unidad cuenta esa cantidad y retira de la banda las demás unidades del mismo
  producto (si hay menos, retira las que haya y cobra la cantidad tecleada). Siempre hay que pasar al menos una por el escáner.
  **VOID** anula lo último registrado: sus unidades vuelven a la banda y hay que escanearlas otra vez.
- Cobrada la venta queda **bloqueada** (no se añade ni se quita nada). **ENTREGAR** solo funciona con la venta cobrada:
  sin cobrar avisa `COBRA PRIMERO`. Al entregar se cierra la bolsa y empieza una venta nueva
  (hito 2: ahí se llama a `checkout.php` con `venta.carrito()` y el efectivo).
- **Banda:** gira solo mientras algún producto avanza; se detiene cuando todos han llegado.

---

## 3. Bucle de juego (máquina de estados)

```
ESPERANDO_JORNADA ──abrir──► SIN_CLIENTE ──spawn──► LLEGANDO ──tween fin──► EN_CINTA
                                  ▲                                         │ clic en producto
                                  │                                         ▼
                              SALIENDO ◄──resultado── COBRANDO ◄──"Cobrar"── ESCANEANDO
                                                         │ 409/422
                                                         └──► ESCANEANDO (aviso)
```

| Estado | Qué pasa | Quién lo hace |
|---|---|---|
| `SIN_CLIENTE` | 1–2 s de espera y luego se genera un cliente | `game-state.js` |
| `LLEGANDO` | El sprite entra desde un lado y aparece el bocadillo con el pedido | `CheckoutScene` |
| `EN_CINTA` / `ESCANEANDO` | Los productos del pedido aparecen en la cinta. Al hacer clic en uno, viaja al escáner, suena un *beep* y se emite `Bus: producto:escaneado {sku}` | Phaser emite, `GameState` actualiza el carrito y `checkout-ui` lo dibuja |
| `COBRANDO` | `Api.checkout(...)` con el botón deshabilitado | `checkout-ui.js` |
| Resultado | Se dibuja el ticket con la respuesta, se calculan los puntos y se recarga el catálogo (el stock cambió) | `checkout-ui` + `scoring.js` |
| `SALIENDO` | El cliente se va con la cara de satisfecho o de molesto | `CheckoutScene` |

### Generación del pedido (`order-generator.js`, función pura)
- Entre 1 y 5 SKUs distintos, tomados de `state.productos` con `stock > 0`.
- Cantidad de 1 a 3, sin pasar del stock disponible.
- El efectivo del cliente es el billete colombiano más pequeño que cubra el total estimado más un margen:
  2.000 · 5.000 · 10.000 · 20.000 · 50.000 · 100.000. A veces paga con varios billetes.
- El total estimado se calcula en **centavos** con `Money.toCents` (es solo una estimación; el total real lo da el servidor).

### Puntuación (`scoring.js`, función pura)
| Concepto | Puntos |
|---|---|
| Venta confirmada por la API | +100 |
| Carrito idéntico al pedido | +50 |
| Cada producto de más o de menos | −30 |
| Paciencia restante | + (paciencia % × 1) |
| Cliente que se va sin pagar (paciencia en 0) | −100 |
| Racha de 3 ventas perfectas | ×1.5 |

En la fase 3 se puede añadir el **mini-juego del cambio**: el jugador arma el cambio con
billetes y monedas, y se compara con el `cambio` que devuelve el servidor.

### Errores de la API dentro del juego
- `409 Stock insuficiente` → el cliente pone cara de molesto y se le ofrece «quitar producto».
- `409 jornada cerrada` → se vuelve a `ESPERANDO_JORNADA`.
- `422` → aviso junto al formulario, sin perder el carrito.

---

## 4. Archivos nuevos

```
public/
├── index.html                    # se añade <div id="game"> y el panel nuevo
└── assets/
    ├── css/
    │   ├── styles.css            # ya existe
    │   └── game.css              # layout, fuente pixel, image-rendering: pixelated
    ├── fonts/                    # fuente pixel (p. ej. "Press Start 2P", OFL)
    ├── js/
    │   ├── vendor/phaser-3.90.0.min.js
    │   ├── money.js · api.js     # ya existen, sin cambios
    │   ├── bus.js                # const Bus = $({});
    │   ├── game-state.js         # estado del juego + transiciones (única fuente de verdad)
    │   ├── order-generator.js    # pedidos y billetes (puro)
    │   ├── scoring.js            # puntos (puro)
    │   ├── checkout-ui.js        # DOM: carrito, cobro, ticket
    │   ├── phaser/
    │   │   ├── assets.js         # manifiesto de PNG (tamaños) + PLU + paleta
    │   │   ├── config.js         # new Phaser.Game({...})
    │   │   ├── BootScene.js      # preload de sprites, audio y animaciones
    │   │   └── CheckoutScene.js  # cliente, cinta, escáner, efectos
    │   └── app.js                # arranque: jornada + catálogo → iniciar juego
    ├── img/
    │   ├── icons/  tienda/  banda/  caja/  characters/  fx/
    │   └── placeholder.svg
    └── audio/
CREDITS.md                         # autor y licencia de cada asset externo
tools/
├── pixelizar.py                  # imagen de IA → sprite limpio (ver ASSETS_IA.md)
└── grid2png.py                   # matriz de texto → PNG (ver ASSETS_IA.md)
```

Orden de carga de los `<script>`: jquery → phaser → money → api → bus → order-generator →
scoring → game-state → checkout-ui → phaser/BootScene → phaser/CheckoutScene → phaser/config → app.

### Eventos del bus (el contrato entre ambas mitades)
| Evento | Lo emite | Datos |
|---|---|---|
| `cliente:llego` | GameState | `{cliente, pedido, efectivo}` |
| `producto:escaneado` | CheckoutScene | `{sku}` |
| `carrito:cambio` | GameState | `{carrito}` |
| `cobro:ok` | checkout-ui | `{venta, puntos}` |
| `cobro:error` | checkout-ui | `{status, mensaje}` |
| `cliente:se_fue` | GameState | `{satisfecho: bool}` |
| `paciencia:tick` | GameState | `{pct}` |

Phaser **nunca** toca el DOM y jQuery **nunca** toca sprites; los dos se hablan solo a través del bus.

---

## 5. Hitos (cada uno debe dejar algo jugable)

> **Truco clave:** hasta el hito 4 se usan rectángulos de colores como placeholders
> (`this.add.rectangle`). El código no espera a los assets; los sprites se cambian
> después sin tocar la lógica, porque todo se carga por clave (`'FRU-001'`, `'cliente-1'`).

### Hito 1 — Esqueleto visual de tres columnas
- [x] Phaser 3.90.0 en `vendor/` y la fuente Press Start 2P en `assets/fonts/`.
- [x] `phaser/assets.js`: manifiesto de assets con tamaños y placeholders automáticos.
- [x] Tienda (fila de clientes, cajero y banda), banda ampliada (escáner, balanza y bolsa) y caja (pantalla, teclado y libro PLU).
- [x] Demo: clic en un producto → escáner o balanza → bolsa. Teclear un PLU + ENT.
- [ ] Sustituir los placeholders por arte real (lista en [ASSETS_IA.md](ASSETS_IA.md#lista-de-assets-layout-de-tres-columnas)).
- **Listo cuando:** se ve nítido a ×2 y ×3 en Firefox y Chrome.

### Hito 2 — Un cliente, un cobro (2–3 días)
- [ ] `bus.js`, `game-state.js` y `order-generator.js`.
- [ ] El catálogo de la API genera un pedido y los productos aparecen en la cinta.
- [ ] Clic en un producto → `producto:escaneado` → se dibuja el carrito en el panel.
- [ ] «Cobrar» → `Api.checkout` → ticket con la respuesta → recarga del catálogo.
- [ ] Doble clic protegido (botón deshabilitado mientras la petición está en curso).
- **Listo cuando:** se puede completar una venta real y aparece en `ventas.php?jornada_id=…`.

### Hito 3 — Bucle completo (2 días)
- [ ] Cliente → venta → siguiente cliente, sin fin.
- [ ] Barra de paciencia, `scoring.js` y puntuación en la topbar.
- [ ] Manejo de 409/422 dentro del juego.
- [ ] Botones de abrir y cerrar jornada (ya están en el HTML).

### Hito 4 — Assets reales (en paralelo desde el hito 1)
- [ ] Sprites de productos (20), clientes (4 × 4 expresiones), escenario e interfaz.
- [ ] `BootScene` los precarga; los placeholders se sustituyen por sprites.
- [ ] Iconos de productos también en el ticket HTML (`image-rendering: pixelated`).
- [ ] `CREDITS.md` completo.

### Hito 5 — Darle vida (2–3 días)
- [ ] Tweens de llegada y salida, rebote, destello al escanear, monedas al cobrar y estrellas al puntuar.
- [ ] Sonidos: beep, caja registradora, monedas, error y llegada del cliente.
- [ ] Resumen de jornada al cerrarla (datos de `jornada_cerrar.php`): ventas, total y puntos.

### Hito 6 — Extras opcionales
- [ ] Mini-juego del cambio con billetes.
- [ ] Frutas sin código de barras: se cobran tecleando el código (PLU) en el panel.
- [ ] Récord guardado en `localStorage`.
- [ ] Dificultad creciente: más productos por cliente y menos paciencia.

---

## 6. Qué **no** hacer
- No calcular el total definitivo en JS ni dar por buena una venta antes del 201.
- No usar capturas, sprites ni la interfaz de Discounty u otros juegos, y no poner «estilo Discounty» en los prompts. Sirven como referencia de *sensación*, no de contenido.
- No mezclar paletas: todo asset pasa por `tools/pixelizar.py` antes de entrar a `public/`.
- No escalar con factores no enteros (×2,5): los píxeles se deforman.
