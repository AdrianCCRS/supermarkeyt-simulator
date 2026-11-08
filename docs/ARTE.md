# Guía de arte (pixel art con Aseprite)

Reglas y decisiones para dibujar assets del juego. La usa el agente `pixel-artist` (`.claude/agents/pixel-artist.md`).

## Reglas comunes (todos los encargos)
- Tamaño nativo siempre; sin antialiasing, degradados, dithering, píxeles sueltos ni semitransparencias (alfa solo 0 o 255).
- Contorno exterior de 1 px en `#181425`; 3 tonos por superficie; luz arriba a la izquierda; vista 3/4 arriba-frente.
- **Ningún texto ni número en los sprites**: el juego escribe encima.
- Paleta Endesga 32 exacta, sin aproximaciones:
  `be4a2f d77643 ead4aa e4a672 b86f50 733e39 3e2731 a22633 e43b44 f77622 feae34 fee761 63c74d 3e8948 265c42 193c3e 124e89 0099db 2ce8f5 ffffff c0cbdc 8b9bb4 5a6988 3a4466 262b44 181425 ff0044 68386c b55088 f6757a e8b796 c28569`
- Los iconos del pack (`assets-src/iconos-pack/<cat>/<nombre>.png`, 16×16) se colocan sin recolorear, alineados por su caja opaca.
- Pantallas y caras que escribe el juego: bloques `193c3e` lisos.
- No tocar backend (PHP/MySQL/API) ni archivos no pedidos. Si una medida pedida es inconsistente o imposible, avisar y explicar, sin parches ocultos.

## Cómo se trabaja
1. **Dibujar con Lua dentro de Aseprite**: herramienta MCP `run_lua_script` con `script = dofile("<ruta>/assets-src/scripts/lua/<pieza>.lua")`. (El parámetro se llama `script`, no `script_path`.)
2. `assets-src/scripts/lua/lib.lua`: helper (`L.new`, `px`, `rect`, `frame`, `rows` ASCII+leyenda, `blit`, `row`, `save` con paleta Endesga). Las piezas nuevas más simples (`anim.lua`, `cobro.lua`, `billetes2.lua`) son autónomas: definen sus propios helpers (`C(hex)`, `R`, `ascii`, `outline`, `savePNG`).
3. **Comprobar con Python** (`python3 -I -W ignore`): tamaños, paleta, alfa, zonas lisas de un solo color, identidad de iconos, solapes, pies en y=37, etc. Ejemplos: `assets-src/scripts/chk_anim.py`, `check*.py`.
4. **Componer y mirar**: composiciones ampliadas (×3/×4/×6) en el scratchpad o en `assets-src/previews/`; GIFs de revisión solo en `assets-src/previews/`, nunca en `public/`.
5. **Fuentes**: un `.aseprite` por tema en `assets-src/` (una capa por pieza o por personaje; etiquetas por animación).
6. Los scripts escriben PNG en `public/assets/img/...` y los temporales en `assets-src/scripts/out/`.

## Mapa de scripts (`assets-src/scripts/lua/`)
| Script | Genera |
|---|---|
| `pared.lua`, `expo.lua`, `deco.lua`, `clientes.lua`, `cajero.lua`, `iconos.lua`, `asm*.lua` | Primer encargo: pared-estanterías, expositor, personajes, 11 iconos, `tienda.aseprite` |
| `puesto.lua`, `mueble.lua`, `nevera.lua`, `mostrador*.lua` | Mostrador, mueble trasero, luz de carril (versiones sucesivas) |
| `minis.lua` | mini-escáner, mini-balanza, mini-caja, luz-carril, cajero-izq |
| `caja_planta.lua` | mini-caja vista cenital |
| `anim.lua` | `cliente-N-anim.png`, `cajero-anim.png`, `animaciones-personajes.aseprite` |
| `cobro.lua` | recibo-imprimir/arrancar, billetes (versión 32×14, ya sustituida), bandeja-efectivo, libro, `cobro.aseprite` |
| `billetes2.lua` | billetes colombianos 38×18 + `billetes.aseprite` |

## Decisiones y cifras reales (lo no obvio)
- **Tienda**: columna de 160×270 a la izquierda de la banda (x160..319). Layout en `public/assets/img/tienda/tienda-layout.json` (mantenerlo al día). Las 45 variantes distintas de iconos en la pared eran geométricamente imposibles; se avisó y se mantuvieron las posibles.
- **Personajes** 32×38 (no 32×32). `cajero-izq.png` mira a la izquierda. El frame 1 de cada animación es idéntico al sprite base (comprobado por script).
- **Animaciones** (`public/assets/img/characters/`): `cliente-N-anim.png` 192×152 (6×4 frames de 32×38; filas: caminar_frente, caminar_derecha, caminar_frente_bolsa, dar_dinero_y_coger_bolsa), `cajero-anim.png` 128×38 (4 frames), `animaciones-layout.json`. Pies siempre en y=37; cambio de contorno entre frames ≤3 px. Puntos débiles conocidos: torso de perfil algo ruidoso (cliente-2), piernas de perfil poco visibles (cliente-4), brazo diagonal fino en la fila 4.
- **Cobro** (`public/assets/img/caja/`, `cobro-layout.json`): caja en (8,6) de la columna; bandeja en (8,160) con compartimentos [4,4,40,22],[52,4,40,22],[100,4,40,22]; libro 144×68 en (8,198) (sustituye al de 144×102, línea tenue de renglón a 26 px); ticket 18 px de ancho × 46 de largo, crece 8,16,24,32,40,43,46.
- **Billetes** 38×18 (`billetes-layout.json`): zona de valor x14..31, y5..12 (18×8, un solo color), bustos 10×12 en x2..11, motivo 5×12 en x32..36. Orden 2000, 5000, 10000, 20000, 50000, 100000. Una pila de 3 billetes cabe en un compartimento de la bandeja con cada billete 2 px más arriba (3×18 → 22 px). Los bustos son siluetas simplificadas, no retratos.
- El billete anterior (32×14) está en `assets-src/sin-usar/billetes-32x14.png`.

## HUD de la jornada (`public/assets/img/hud/`, script `hud.lua`, comprobación `assets-src/scripts/chk_hud.py`)
- Sin MCP Aseprite disponible se ejecutó con `aseprite -b --script assets-src/scripts/lua/hud.lua`. Fuente: `assets-src/hud.aseprite` (una capa por pieza, apiladas en un lienzo 480x240).
- `hud-barra.png` 480x24: ranuras (LCD `193c3e` lisas) jornada [18,4,84,16], reloj [108,4,60,16], clientes [174,4,60,16], puntos [240,4,60,16], ventas [306,4,90,16]; zona de botón [408,4,68,16] lisa `262b44`; hueco de lámpara [6,8,8,8] `262b44`. El bisel de cada hueco queda fuera del rectángulo.
- `hud-boton.png` 408x16: frames 68x16 (verde normal/pulsado/apagado, rojo normal/pulsado/apagado); zona lisa de texto [3,3,62,10] en cada frame. Pulsado = relieve invertido, el texto debe bajar 1 px por código.
- `hud-lampara.png` 3 frames 8x8 (rojo, verde, ámbar); `hud-iconos.png` 4x10x10 (reloj, persona, estrella, moneda).
- `panel-cierre.png` 224x168: marco de madera con tablero pizarra; título lisa [6,6,212,11] (banda y0..17), cuerpo liso [6,22,212,140].

## Entorno de la página (`public/assets/img/entorno/`, script `entorno.lua`, comprobación `assets-src/scripts/chk_entorno.py`)
- Ejecutado con `aseprite -b --script`. Fuente `assets-src/entorno.aseprite` (una capa por pieza en una hoja 512x300). Previews en `assets-src/previews/entorno-tiles.png` y `entorno-fachadas-x3.png`.
- Tiles: `toldo` 32x20 (periodo 16 en x, sin contorno lateral), `ladrillo` 16x16 (x e y), `acera` 32x16 (periodo 16 en x), `mini-suelo` 16x16 (x e y).
- Zonas lisas: cartel [8,12,176,24]; fachadas: friso [8,9,96,12] y letrero colgante [80,51,18,6].
- Las nubes usan contorno `181425` como el resto de reglas.

## Logo «Tiendas D2» (`public/assets/img/entorno/`, script `logo_d2.lua`, comprobación `assets-src/scripts/chk_logo.py`)
- Parodia de una marca real; única pieza con texto dibujado a mano (fuente 7 letras propia, 9 px de alto). Ejecutado con `aseprite -b --script`. Fuente `assets-src/logo-d2.aseprite` (una capa por pieza, hoja 200x84). Previews x6 en `assets-src/previews/logo-d2*-x6.png`.
- `logo-d2.png` 64x80, `logo-d2-mini.png` 32x40 (sin «Tiendas», sin carita), `logo-d2-horizontal.png` 96x24 (sin carita). Detalle propio: carita sonriente bajo el 2 (solo en la grande). Sin zonas lisas reservadas para texto del juego.

## Tendero «Tiendas D2» (script `cajero_d2.lua`, comprobación `assets-src/scripts/chk_cajero_d2.py`)
- Sustituye al cajero verde: polo rojo (`e43b44`/`a22633`/`f6757a`), pelo con tupe `733e39`/`3e2731`/`262b44`, barba corta, cordón `fee761`, credencial blanca 3x4 en (13,22), parche D2 4x4 en (17,21), pantalón `3a4466`/`262b44`, zapatos `3e2731`. Originales verdes en `assets-src/originales-cajero/`. Fuente `assets-src/cajero-d2.aseprite`; `animaciones-personajes.aseprite` (capa cajero) NO se actualizó.
- Respiración (frame 2): sube/baja cabeza y hombros (filas 0-19 +1 px, se descarta la fila 20); el pecho y los brazos no se mueven. Contorno vs frame 1: -2, +2 (frame 4 suma los billetes, +16 como el original).

## Tendero D2: hoja de animaciones extra (script `cajero_extra.lua`, comprobación `assets-src/scripts/chk_cajero_extra.py`, GIFs `gif_cajero_extra.py`)
- `public/assets/img/characters/cajero-extra.png` 192x190 (6 col x 5 filas de 32x38) + `cajero-extra-layout.json` ([{fila,nombre,frames}]). Fuente `assets-src/cajero-extra.aseprite` (1 capa, 26 frames, etiquetas reposo/saludar/teclear/celebrar/molesto). Previews x6 en `assets-src/previews/cajero-extra-*-x6.gif`.
- Filas: 0 reposo (6), 1 saludar (6), 2 teclear (4, cols 4-5 vacías), 3 celebrar (6), 4 molesto (4, cols 4-5 vacías). Frame 1 de reposo == `cajero-izq.png`.
- El sprite ocupa las 38 filas (tupe en y=0): no se puede subir el cuerpo. El salto se hace recogiendo las piernas (filas de pantalón quitadas): pies en y=36, 35, 36 (frames 2-4 de celebrar); agachado = torso 1 px abajo y 1 fila menos de pantalón (pies en 37). La respiración solo baja (0/+1), no sube.
- El brazo adelantado ya llega a x=0, así que "avanzar hacia la caja" en teclear es estirar/recoger (mano x=1..0) y bajar 1 px (pulsar).
- Contorno: salto >3 px en el saludo (levantar brazo: +15/-13) y celebrar (puños arriba: ±48..52) por cambio de pose; el resto ≤4.

## Protesta de los clientes (script `protesta.lua`, comprobación `assets-src/scripts/chk_protesta.py`, GIFs `gif_protesta.py`)
- `public/assets/img/characters/clientes-protesta.png` 192x152 (6 col x 4 filas de 32x38; fila = cliente 1..4) + `clientes-protesta-layout.json` ([{fila,cliente,frames}]). Fuente `assets-src/clientes-protesta.aseprite` (1 capa, 24 frames, etiquetas cliente-1..4). Previews x6 en `assets-src/previews/cliente-N-protesta-x6.gif`.
- Frame 1 == frame 0 de `cliente-N.png` (comprobado). Frames 2-5: cabeza «molesto» (cejas en V, mejillas rojas) + boca (abierta roja / dientes apretados), brazos doblados con puños arriba (fila superior del puño 12 o 15; 17 en el frame 6), cabeza inclinada cortando las filas 0-9 ±1 px, pisotón: pie izq. sube 1 px (frame 2), der. (frame 4); frames 3 y 5 = impacto (cuerpo -1 px abajo, pantalón 1 fila menos). Símbolo de enfado rojo 5x5 en (0,0) en frames 2-5. Cliente 4: brazos 1 px más afuera por el pelo ancho.
- Pies en y=37 salvo el pie levantado (36).
