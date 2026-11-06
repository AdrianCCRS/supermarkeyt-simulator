# Guía de assets para quien no es diseñador

Hay tres caminos, de más fácil a más laborioso. Lo práctico es **combinarlos**:

| Camino | Para qué | Calidad / esfuerzo |
|---|---|---|
| **A. Descargar packs CC0** | UI, fuentes, sonidos y algunos objetos | Alta / mínimo |
| **B. Pixel art «por código» con un LLM** (Claude, ChatGPT…) | Productos de 16×16, iconos y efectos | Buena y 100 % coherente / bajo |
| **C. Generador de imágenes** (ChatGPT Images, Gemini, etc.) + limpieza | Clientes, fondo y mostrador | Variable / medio (siempre requiere limpieza) |

**Especificaciones comunes** (las mismas que en [PLAN_JUEGO.md](PLAN_JUEGO.md)):
paleta **Endesga 32** · PNG con transparencia · sin antialiasing · **vista cenital 3/4** (desde arriba,
viendo un poco el frente) · luz desde arriba a la izquierda · contorno oscuro de 1 px (`#181425`).

---

## Lista de assets (layout de tres columnas)

Lienzo lógico de **480×270**. Entrega cada PNG **a su tamaño exacto, sin ampliar** (el juego lo escala).
Los que faltan se ven como placeholder; al dejar el PNG en su ruta aparece solo, sin tocar código.
La fuente de verdad es `public/assets/js/phaser/assets.js`.

Las «tiras» son frames del mismo tamaño puestos uno al lado del otro, de izquierda a derecha.

### Columna 1: tienda (`public/assets/img/tienda/` y `characters/`)
| Archivo | Tamaño | Frames | Descripción |
|---|---|---|---|
| `tienda/suelo.png` | 16×16 | — | Baldosa que se repite (debe encajar consigo misma por los 4 lados): rombos crema y terracota |
| `tienda/estanteria.png` | 112×40 | — | Estantería vista desde arriba-frente, 2 baldas con productos de colores |
| `tienda/mostrador.png` | 56×214 | — | Mostrador **vertical**, gris metálico. Deja libre una franja central de 32 px (x 12–44), por donde pasa la banda |
| `tienda/cajero.png` | 32×32 | — | Cajero chibi con gorra y polo verdes, visto desde arriba-frente |
| `characters/cliente-1.png` … `cliente-4.png` | 128×32 | 4 de 32×32 | Cliente chibi de cuerpo entero. Frames: **normal · esperando · molesto · satisfecho** |

### Columna 2: banda (`public/assets/img/banda/`)
**Hecha** (diseñada en Aseprite; fuente `assets-src/banda.aseprite`, posiciones en `banda/banda-layout.json`):
`banda.png`, `mesa.png`, `escaner.png` (3 frames), `balanza.png`, `bolsa.png` (3 frames: vacía · con productos · llena) y `boton-entregar.png` (3 frames: normal · pulsado · desactivado).
Pendiente de retocar: las asas de la bolsa quedaron flojas.

### Columna 3: caja (`public/assets/img/caja/`)
| Archivo | Tamaño | Frames | Descripción |
|---|---|---|---|
| `caja/caja-cuerpo.png` + 7 `caja/tecla-*.png` | 144×151 y tiras de 2 frames | — | **Hecho** (diseñados en Aseprite; fuente en `assets-src/caja.aseprite`, posiciones en `caja/caja-layout.json`). Las teclas llevan el rótulo escrito por el juego |
| `caja/libro.png` | 144×102 | — | Libro abierto con tapa verde oscura, dos páginas crema **en blanco** y espiral en el centro (el juego dibuja los iconos y códigos encima) |

> La pantalla de la caja, la balanza y el libro van **sin texto**: los rótulos (4016, «2 kg»…)
> los escribe el juego con la fuente pixel.

### Productos (`public/assets/img/icons/`)
Un icono de **16×16** por SKU (`fru-001.png` …). En la banda se dibuja a ×2.
Ya están 9 de 20: `fru-001..003`, `lac-001`, `lac-003`, `beb-002`, `beb-003`, `pan-001`, `pan-002`
(casi todos del pack *Free pixel food 16x16*, CC BY: ver `CREDITS.md`).
**Faltan 11:** `lac-002`, `car-001..003`, `des-001..003`, `beb-001`, `lim-001`, `lim-002`, `hig-001`.
Lo mejor es hacerlos por el camino B, imitando el estilo del pack: contorno oscuro y 3 tonos por color.

---

## A. Qué descargar (y dónde)

Antes de descargar, **comprueba la licencia en la página del asset** y anótala en `CREDITS.md`.
CC0 = uso libre sin atribución. CC-BY = obliga a citar al autor. Evita los assets sin licencia clara.

| Necesidad | Recurso | Licencia habitual |
|---|---|---|
| Paneles, botones, barras y cursores | Kenney — *Pixel UI Pack* (kenney.nl/assets/pixel-ui-pack) | CC0 |
| Iconos genéricos | Kenney — *Game Icons*, *Input Prompts Pixel* | CC0 |
| Personajes base | Kenney — *Roguelike Characters* (sirven de base para editar) | CC0 |
| Sonidos de UI / clic | Kenney — *Interface Sounds*, *UI Audio* | CC0 |
| Monedas / caja | Kenney — *RPG Audio*, *Impact Sounds* | CC0 |
| Beep del escáner y efectos propios | **jsfxr** (sfxr.me): botones *Pickup/Coin* y *Blip/Select*; exporta WAV | Tú eres el autor |
| Música de fondo | OpenGameArt.org, filtrando por *CC0* y buscando «shop» o «chiptune» | Revisar cada pista |
| Fuente pixel | Google Fonts — *Press Start 2P* o *Silkscreen* (descargar el TTF y servirlo local) | OFL |
| Comida / objetos | itch.io → búsqueda «pixel food» o «supermarket pixel», filtrando por *Free* | **Revisar cada uno** |
| Paleta | lospec.com/palette-list/endesga-32 → descargar `.hex` y `.png` | Libre |

Guardado: `public/assets/img/ui/`, `public/assets/audio/`, `public/assets/fonts/`.
Los ZIP originales van a una carpeta fuera de `public/` (p. ej. `assets-src/`, añadida a `.gitignore`).

---

## B. Pixel art «por código» con un LLM (el más recomendable para productos)

Los modelos de texto **no dibujan**, pero sí escriben una cuadrícula de caracteres sin
equivocarse en la paleta. Un script la convierte en PNG. El resultado sale perfecto en píxeles
y todos los productos comparten paleta y tamaño.

### Prompt base (copiar tal cual y cambiar solo la última línea)

```
Eres un artista de pixel art. Dibuja un sprite de 16x16 píxeles.

Formato de salida: EXACTAMENTE 16 líneas de 16 caracteres cada una, dentro de un bloque de código, sin nada más.
Cada carácter es un color de esta paleta:
.  transparente
o  #181425 (contorno)
w  #ffffff   g  #8b9bb4   G  #5a6988
r  #e43b44   R  #a22633   p  #f6757a
y  #fee761   Y  #feae34   b  #b86f50   B  #733e39
l  #63c74d   L  #3e8948   c  #2ce8f5   u  #0099db   U  #124e89
k  #e8b796   K  #c28569

Reglas: contorno de 1 px con 'o' alrededor de toda la silueta; luz desde arriba a la izquierda
(usa el tono claro en esa zona y el oscuro abajo a la derecha); el objeto ocupa unos 12-14 px y queda centrado;
vista frontal (los iconos sí van de frente); sin texto legible; formas simples y reconocibles.

Objeto: <DESCRIPCIÓN DEL PRODUCTO>
```

Si una fila no tiene 16 caracteres, pide: «Corrige: cada línea debe tener exactamente 16 caracteres».
Si no te gusta, pide «otra versión, más reconocible» (suele bastar con 2 o 3 intentos).

### Los 20 productos del seed

Guardar como `public/assets/img/icons/<sku en minúsculas>.png` (p. ej. `lac-002.png`). Solo faltan los 11 de la lista de arriba.

| SKU | Descripción para el prompt |
|---|---|
| FRU-001 | una manzana roja brillante con hoja verde pequeña y tallo marrón |
| FRU-002 | un racimo de tres bananas amarillas con puntas marrones |
| FRU-003 | un tomate rojo redondo con corona verde |
| LAC-001 | un cartón de leche blanco y azul con tapa |
| LAC-002 | un pack de 4 vasitos de yogur blancos con tapas azul claro |
| LAC-003 | una cuña triangular de queso amarillo con agujeros |
| CAR-001 | una bandeja blanca con pechuga de pollo rosada cubierta de plástico |
| CAR-002 | una bandeja blanca con carne molida roja oscura |
| CAR-003 | un filete de salmón naranja-rosado con líneas blancas, sobre papel |
| DES-001 | una bolsa de arroz blanca con etiqueta azul |
| DES-002 | un paquete alargado de espagueti amarillo con ventana transparente |
| DES-003 | una botella de aceite de oliva verde-amarilla con tapa oscura |
| BEB-001 | una botella de agua de plástico azul claro con tapa azul |
| BEB-002 | una botella grande de refresco de cola marrón oscura con etiqueta roja |
| BEB-003 | un cartón de zumo de naranja con una naranja dibujada |
| PAN-001 | un pan de molde rectangular dorado en bolsa |
| PAN-002 | una baguette dorada diagonal con cortes |
| LIM-001 | una botella de detergente azul con asa y tapa roja |
| LIM-002 | tres rollos de papel de cocina blancos apilados |
| HIG-001 | un bote de gel de ducha rosa con tapa blanca |

### Otros sprites que salen bien por este camino
- `fx/destello.png`: estrella de destello amarilla de 4 puntas (16×16).
- `fx/moneda.png`: moneda dorada de frente (16×16). Pide además 4 frames de giro: «4 sprites de 16×16 de la misma moneda girando».
- `fx/error.png`: una X roja gruesa (16×16).
- `fx/estrella.png`: estrella de puntuación amarilla (16×16).
- `ui/corazon.png`: corazón de paciencia (16×16), en versión llena y vacía.

### Script `tools/grid2png.py` (Python + Pillow)

Se guarda la respuesta del LLM en `assets-src/grids/fru-001.txt` y se ejecuta
`python3 tools/grid2png.py assets-src/grids/fru-001.txt public/assets/img/products/fru-001.png`.
*(Este script, igual que `pixelizar.py`, todavía no existe: queda pendiente de escribir.)*

---

## C. Generador de imágenes + limpieza (clientes, fondo y mostrador)

Los generadores de imágenes producen «falso pixel art»: píxeles de tamaño irregular, cientos de
colores y bordes difuminados. **Siempre** hay que pasar el resultado por `tools/pixelizar.py`, que:
1. quita el fondo (el color plano que se pidió),
2. reduce la imagen con *nearest-neighbor* al tamaño final (p. ej. 32×40),
3. ajusta los colores a la paleta Endesga 32,
4. guarda el PNG con transparencia.

Después, abre el resultado en **Piskel** (piskelapp.com, gratis, en el navegador) o **LibreSprite**
y corrige a mano los píxeles sueltos. Son 5 minutos por sprite.

### Bloque de estilo (pegarlo al principio de TODOS los prompts de imagen)

```
Pixel art de 16 bits, estilo de videojuego indie de tienda acogedor. Vista cenital 3/4 (desde arriba, viendo un poco el frente).
Píxeles grandes y bien definidos, contorno oscuro de 1 píxel, sombreado simple de 2-3 tonos,
luz desde arriba a la izquierda, colores cálidos y saturados. Sin texto, sin marcas de agua, sin logos.
Un solo objeto centrado sobre un fondo plano color magenta puro (#FF00FF), sin sombra en el suelo.
```

> El fondo magenta sirve para que el script lo borre sin tocar el sprite.
> No escribas nombres de juegos («como Discounty», «como Stardew»): describe el estilo con palabras.

### Clientes (4 personajes × 4 expresiones)

Cuerpo entero chibi, de **32×32**, en tira de 4 frames (**128×32**):
`normal · esperando · molesto · satisfecho`. Archivos `characters/cliente-1.png` … `cliente-4.png`.

**Paso 1, personaje base:**
```
[BLOQUE DE ESTILO]
Personaje chibi de cuerpo entero (cabeza muy grande, cuerpo pequeño), de pie, mirando hacia abajo-frente,
brazos a los lados. <DESCRIPCIÓN>. Expresión neutral y amable.
```
| # | `<DESCRIPCIÓN>` |
|---|---|
| 1 | mujer joven de pelo castaño largo con coleta, camiseta amarilla |
| 2 | señor mayor calvo con bigote gris, gafas y chaleco marrón |
| 3 | chico adolescente de pelo negro desordenado, sudadera azul con capucha |
| 4 | mujer adulta de pelo rizado oscuro y corto, blusa verde y pendientes |

**Paso 2, expresiones** (en la *misma conversación* y adjuntando la imagen del paso 1):
```
El MISMO personaje exacto, misma ropa, misma pose y mismo fondo magenta. Solo cambia la cara a: <EXPRESIÓN>.
```
- esperando: «mirando de reojo, boca recta, una gota de sudor»
- molesto: «cejas fruncidas, boca hacia abajo, mejillas rojas»
- satisfecho: «ojos cerrados felices, gran sonrisa»

A 32×32 la cara ocupa unos 10×8 píxeles: si la IA cambia al personaje, lo más rápido es pintar
las 3 caras en Piskel sobre una copia de la base.

### Escenario y caja

Usa los tamaños y descripciones de la [lista de assets](#lista-de-assets-layout-de-tres-columnas):
el prompt es `[BLOQUE DE ESTILO]` + la descripción de la tabla. Dos consejos:
- La **baldosa** del suelo y la **banda** salen mejor por el camino B (cuadrícula de 16×16 o 32×32), porque tienen que repetirse sin costura.
- Las **teclas** también: son rectángulos de 2 tonos y una IA de imágenes casi siempre les mete texto.

### Billetes (opcional, para el mini-juego del cambio)

No copies los billetes reales. Inventa billetes simplificados, distinguibles por color:
`2.000 gris · 5.000 marrón · 10.000 rojo · 20.000 naranja · 50.000 morado · 100.000 verde`.
Por código (camino B) a 24×12: «billete rectangular <color> con un círculo claro a la izquierda y el número <N> en píxeles».

---

## D. Checklist por asset (antes de añadirlo a `public/`)

- [ ] Tamaño exacto (el de la lista de assets) y PNG con transparencia real.
- [ ] Solo colores de Endesga 32 (`pixelizar.py` lo garantiza).
- [ ] Nombre en minúsculas, sin espacios, igual a la ruta que figura en `phaser/assets.js`.
- [ ] Se ve bien a ×3 en el juego (pruébalo en el canvas, no en el visor de imágenes).
- [ ] Origen y licencia anotados en `CREDITS.md` («generado con <modelo> por <tú>», «Kenney, CC0», etc.).

## E. Resumen por camino

| Asset | Camino recomendado |
|---|---|
| 11 iconos de productos que faltan · baldosa del suelo · banda · teclas | B (cuadrícula con un LLM) |
| Clientes · cajero · estantería · mostrador · escáner · balanza · bolsa · caja · libro | C (generador de imágenes + `pixelizar.py` + retoque en Piskel) |
| Sonidos, fuente (ya incluida) | A (descargar) |
