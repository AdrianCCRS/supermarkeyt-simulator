-- Panel "Top 5" (pizarra con marco de madera): panel-ranking, ranking-vacio, ranking-fila-tu, ranking-corona.
-- Ejecutar: aseprite -b --script assets-src/scripts/lua/ranking.lua   (o run_lua_script con dofile)
local L = dofile("/home/adrianccrs/Documents/Dev/PHP/supermarket-simulator/assets-src/scripts/lua/lib.lua")
local OUT = L.ROOT .. "public/assets/img/ranking/"
os.execute("mkdir -p " .. OUT)

local W, H = 160, 120
local OL = "181425"

-- colores
local WOOD_HI, WOOD, WOOD_SH = "e4a672", "b86f50", "733e39"
local BOARD, ROW, ROW_HI, ROW_SH = "193c3e", "265c42", "3e8948", "193c3e"
local CHALK, CHALK_M, CHALK_D = "c0cbdc", "8b9bb4", "5a6988"

local function frame(o)
  -- contorno exterior
  o:frame(0, 0, W, H, OL)
  -- madera 4 px: luz arriba-izquierda
  o:rect(1, 1, W - 2, H - 2, WOOD)
  o:rect(1, 1, W - 2, 1, WOOD_HI); o:rect(1, 1, 1, H - 2, WOOD_HI)
  o:rect(1, H - 2, W - 2, 1, WOOD_SH); o:rect(W - 2, 1, 1, H - 2, WOOD_SH)
  -- canal interior (sombra)
  o:frame(4, 4, W - 8, H - 8, WOOD_SH)
  -- tornillos 2x2 en las esquinas del marco
  for _, p in ipairs({ { 2, 2 }, { W - 4, 2 }, { 2, H - 4 }, { W - 4, H - 4 } }) do
    o:rect(p[1], p[2], 2, 2, CHALK_M)
  end
  -- tablero
  o:rect(5, 5, W - 10, H - 10, BOARD)
  -- raya de tiza bajo el titulo
  o:rect(8, 24, W - 16, 1, CHALK_D)
end

-- una fila (x=8, ancho 144, alto 16). hi/body/sh/div = colores
local function row(o, x, y, body, hi, sh, div)
  o:rect(x, y, 144, 16, body)
  o:rect(x, y, 144, 1, hi)
  o:rect(x, y + 15, 144, 1, sh)
  o:rect(x + 17, y + 1, 1, 14, div)
  o:rect(x + 100, y + 1, 1, 14, div)
end

local function crown(o, x, y)
  local rows = {
    ".O....O....O.",
    "OfO..OfO..OfO",
    "OffO.OfO.OffO",
    "OffffOfOffffO",
    "OfffffffffmmO",
    "OfmmmmmmmmmmO",
    "OfmmmgggmmmmO",
    "OdddddddddddO",
    "OOOOOOOOOOOOO" }
  o:rows(x, y, rows, { O = OL, f = "fee761", m = "feae34", d = "f77622", g = "e43b44" })
end

local function trophy(o, x, y)
  local rows = {
    "...ccccccccc...",
    "ccc.cccccccs.cc",
    "c.c.cccccccs.c.",
    "c.c.cccccccs.c.",
    "ccc.cccccccs.cc",
    "...cccccccccs..",
    "....ccccccss...",
    ".....cccsss....",
    "......ccss.....",
    "......ccss.....",
    ".....ccccss....",
    "....cccccsss...",
    "...ddddddddd...",
    "...ddddddddd..." }
  o:rows(x, y, rows, { c = CHALK, s = CHALK_M, d = CHALK_D })
end

local function save(o, name) o:save(OUT .. name) end

-- 1) panel con 5 filas
local p = L.new(W, H); frame(p)
for k = 0, 4 do
  local y = 28 + 17 * k
  row(p, 8, y, ROW, ROW_HI, ROW_SH, BOARD)
  if k == 0 then p:rect(10, y + 1, 14, 14, "3e2731") end   -- celda de rango del 1.º: fondo oscuro para la corona
end
save(p, "panel-ranking.png")

-- 2) vacio / cargando: sin filas, copa de tiza y zona de mensaje
local v = L.new(W, H); frame(v)
trophy(v, 72, 36)
save(v, "ranking-vacio.png")

-- 3) fila resaltada "tu posicion" 144x16
local t = L.new(144, 16)
row(t, 0, 0, "fee761", "ead4aa", "feae34", "feae34")
save(t, "ranking-fila-tu.png")

-- 4) corona 13x9
local c = L.new(13, 9); crown(c, 0, 0)
save(c, "ranking-corona.png")

-- fuente .aseprite: una capa por pieza en una hoja
local spr = Sprite(330, 140, ColorMode.RGB)
local pal = spr.palettes[1]; pal:resize(#L.PAL)
for i, h in ipairs(L.PAL) do local cc = L.col(h); pal:setColor(i - 1, Color(app.pixelColor.rgbaR(cc), app.pixelColor.rgbaG(cc), app.pixelColor.rgbaB(cc))) end
local first = true
local function layer(name, o, x, y)
  local ly
  if first then ly = spr.layers[1]; first = false else ly = spr:newLayer() end
  ly.name = name
  spr:newCel(ly, 1, o.img, Point(x, y))
end
layer("panel-ranking", p, 0, 0)
layer("ranking-vacio", v, 165, 0)
layer("ranking-fila-tu", t, 0, 122 - 0)
layer("ranking-corona", c, 150, 122)
spr:saveAs(L.ROOT .. "assets-src/ranking.aseprite")
spr:close()
print("ranking OK")
