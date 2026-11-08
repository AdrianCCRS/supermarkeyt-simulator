-- Hoja de animaciones extra del tendero "Tiendas D2": 192x190 (6 col x 5 filas de 32x38)
-- Ejecutar: aseprite -b --script assets-src/scripts/lua/cajero_extra.lua
-- Parte de public/assets/img/characters/cajero-izq.png (solo lectura) y compone cada pose
-- con operaciones de fila/columna sobre el dibujo base + brazos dibujados a mano (ASCII).
local ROOT="/home/adrianccrs/Documents/Dev/PHP/supermarket-simulator/"
local pc=app.pixelColor
local function C(h) return pc.rgba(tonumber(h:sub(1,2),16),tonumber(h:sub(3,4),16),tonumber(h:sub(5,6),16),255) end
local LEG={K=C("181425"),s=C("e8b796"),t=C("c28569"),R=C("e43b44"),r=C("a22633"),p=C("f6757a"),
  W=C("ffffff"),d=C("3e2731"),h=C("733e39"),n=C("262b44"),b=C("3a4466")}
local function get(im,x,y) if x<0 or y<0 or x>=im.width or y>=im.height then return 0 end return im:getPixel(x,y) end
local function put(im,x,y,p) if x>=0 and y>=0 and x<im.width and y<im.height then im:drawPixel(x,y,p) end end
local function copyimg(s) local d=Image(s.width,s.height); d:drawImage(s,Point(0,0)); return d end
local function ch(im,x,y,c) put(im,x,y,(c=="_") and 0 or LEG[c]) end
-- ascii: '.' no toca, '_' borra
local function ascii(im,x,y,rows)
  for j,r in ipairs(rows) do for i=1,#r do local c=r:sub(i,i); if c~="." then ch(im,x+i-1,y+j-1,c) end end end
end
local function rowcopy(dst,src,ys,yd,x0,x1) for x=x0,x1 do put(dst,x,yd,get(src,x,ys)) end end
local function clear(im,x0,y0,x1,y1) for y=y0,y1 do for x=x0,x1 do put(im,x,y,0) end end end

local BASE=Image{fromFile=ROOT.."public/assets/img/characters/cajero-izq.png"}

-- ---------- cuerpo: base + opciones
-- o.b : respiracion (cabeza y hombros 1 px abajo; como cajero-anim frame 2)
-- o.sq: agachado (todo el torso+cabeza 1 px abajo, se pierde 1 fila de pantalon)
-- o.air: piernas recogidas n filas (pies a y=37-n)
-- o.dx: cabeza lateral (filas 0..16)
local function body(o)
  local f=copyimg(BASE)
  clear(f,0,25,8,30)                   -- fuera el brazo original (se redibuja)
  if o.b==1 then
    local g=copyimg(f); clear(f,0,0,31,19)
    for y=0,19 do for x=0,31 do local p=get(g,x,y); if p~=0 then put(f,x,y+1,p) end end end
    -- fila 20 queda con la fila 19 desplazada; la 21 es la original
  end
  if o.sq==1 then
    local g=copyimg(f); clear(f,0,0,31,31)
    for y=0,30 do for x=0,31 do local p=get(g,x,y); if p~=0 then put(f,x,y+1,p) end end end
    for y=32,37 do for x=0,31 do put(f,x,y,get(g,x,y)) end end
  end
  if o.air and o.air>0 then
    local n=o.air; local g=copyimg(f)
    clear(f,0,31,31,37)
    for y=31,33-n do for x=0,31 do put(f,x,y,get(g,x,31)) end end
    for k=0,3 do for x=0,31 do put(f,x,34-n+k,get(g,x,34+k)) end end
  end
  if o.dx and o.dx~=0 then
    local g=copyimg(f); clear(f,0,0,31,16)
    for y=0,16 do for x=0,31 do local p=get(g,x,y); if p~=0 then put(f,x+o.dx,y,p) end end end
  end
  return f
end

-- ---------- cara (coordenadas del reposo, + dy/dx)
local function face(f,o)
  local dx,dy=o.fdx or 0,o.fdy or 0
  local function P(x,y,c) ch(f,x+dx,y+dy,c) end
  if o.blink then
    for _,ex in ipairs({11,16}) do
      for y=11,13 do for x=ex,ex+1 do P(x,y,"s") end end
    end
    for _,ex in ipairs({10,16}) do for x=ex,ex+2 do P(x,12,"K") end end
    P(11,13,"K"); P(17,13,"K")
    P(10,12,"K")
  end
  if o.smile then P(13,14,"p"); P(14,14,"p"); P(15,14,"p"); P(16,14,"p") end
  if o.happy then                         -- ojos contentos + sonrisa grande abierta
    for _,ex in ipairs({11,16}) do for y=11,13 do for x=ex,ex+1 do P(x,y,"s") end end end
    P(10,12,"K"); P(11,11,"K"); P(12,12,"K")
    P(16,12,"K"); P(17,11,"K"); P(18,12,"K")
    for x=13,16 do P(x,14,"K") end
    P(14,15,"p"); P(15,15,"p")
  end
  if o.angry then
    -- cejas en V + boca recta
    P(11,10,"K"); P(12,10,"K"); P(13,11,"K")
    P(15,11,"K"); P(16,10,"K"); P(17,10,"K")
    P(14,14,"K"); P(15,14,"K")
  end
end

-- ---------- brazo adelantado en reposo/bajo: mano en x=ox, desplazado oy filas
local function arm(f,ox,oy)
  local y=25+oy
  -- contorno superior del antebrazo+manga
  for x=ox+4,8 do put(f,x,y,LEG.K) end
  for x=ox,ox+3 do put(f,x,y+1,LEG.K); put(f,x,y+5,LEG.K) end
  for j=2,4 do put(f,ox,y+j,LEG.K); put(f,ox+3,y+j,LEG.K); put(f,ox+1,y+j,LEG.t); put(f,ox+2,y+j,LEG.s) end
  for x=ox+4,6 do put(f,x,y+1,LEG.s); put(f,x,y+2,LEG.s); put(f,x,y+3,LEG.t); put(f,x,y+4,LEG.K) end
  for x=math.max(ox+4,7),8 do put(f,x,y+4,LEG.K) end
  put(f,7,y+1,LEG.r); put(f,8,y+1,LEG.r)
  for j=2,3 do put(f,7,y+j,LEG.R); put(f,8,y+j,LEG.R) end
  if ox+4>7 then end
  for x=ox+4,8 do put(f,x,y+4,LEG.K) end
end

-- ---------- brazo levantado (saludo/puno): mano con contorno en x=hO..hO+5
local function raised(f,hO,fist,top)
  top=top or 13
  local y=top
  for x=hO+1,hO+4 do put(f,x,y,LEG.K) end
  for j=1,4 do
    put(f,hO,y+j,LEG.K); put(f,hO+5,y+j,LEG.K)
    for i=1,4 do
      local c=LEG.s
      if (j>=3 and i>=3) or (j==4 and i>=2) or (i==4 and j>=2) then c=LEG.t end
      put(f,hO+i,y+j,c)
    end
  end
  if fist then for i=1,4 do put(f,hO+i,y+3,LEG.t) end; put(f,hO+2,y+2,LEG.t) end
  -- antebrazo (fijo, x2..6)
  for j=5,11 do
    put(f,2,y+j,LEG.K); put(f,6,y+j,LEG.K)
    put(f,3,y+j,LEG.s); put(f,4,y+j,LEG.s); put(f,5,y+j,LEG.t)
  end
  -- manga/brazo superior horizontal hacia el hombro
  local sy=y+12     -- 25
  for x=3,5 do put(f,x,sy-1+0,0) end
  for x=2,8 do put(f,x,sy+4,LEG.K) end
  put(f,2,sy,LEG.K)
  for j=0,3 do
    put(f,2,sy+j,LEG.K)
    for x=3,8 do
      local c=LEG.R; if j==3 or x==8 then c=LEG.r end
      put(f,x,sy+j,c)
    end
  end
  for x=6,8 do put(f,x,sy-1,LEG.K) end
  -- raya de union forearm/manga
  for x=3,5 do put(f,x,sy-1,LEG.s) end
  put(f,5,sy-1,LEG.t)
end

-- ---------- brazo lejano (derecha) levantado con puno (x22..30)
local function farArm(f,dy)
  dy=dy or 0
  ascii(f,22,10+dy,{
    "....KKKK.",
    "...KssssK",
    "...KssstK",
    "...KsttK.",  -- placeholder fila, se corrige abajo
  })
  ascii(f,22,10+dy,{
    "....KKKK.",
    "...KssssK",
    "...KsstsK",
    "...KsttsK",
    "...KttttK",
    "....KsstK",
    "....KsstK",
    "....KsstK",
    ".KKKKsstK",
    ".RRRRRrrK",
    ".RRRRRrrK",
    ".RRRRrrrK",
    ".rrrrrrrK",
    ".KKKKKKK.",
  })
end

-- ---------- brazo colgando con puno (molesto)
local function armDown2(f,dy)
  dy=dy or 0
  -- brazo recto abajo: manga x5-8, antebrazo piel y puno
  local rows={
    "..KKKK",   -- y=22
    ".KRRRr",
    ".KRRRr",
    ".KRRrr",
    ".KKKKK",
    ".KsssK",
    ".KsstK",
    ".KsttK",
    ".KsttK",
    ".KKKKK",
  }
  ascii(f,3,22+dy,rows)
end

-- ===================== frames
local FR={}   -- FR[fila]={imagenes}
local function add(r,im) FR[r]=FR[r] or {}; table.insert(FR[r],im) end

-- fila 0: reposo (6): neutro, neutro, resp, resp, neutro, parpadeo
do
  local function idle(b,blink)
    local f=body({b=b}); arm(f,0,0)
    face(f,{blink=blink,fdy=b})
    return f
  end
  add(1,idle(0)); add(1,idle(0)); add(1,idle(1)); add(1,idle(1)); add(1,idle(0)); add(1,idle(0,true))
end

-- fila 1: saludar (6): brazo medio, arriba izq, arriba der, izq, der, bajando
do
  local function mk(kind,hO)
    local f=body({})
    if kind=="half" then arm(f,0,-2)
    elseif kind=="half2" then arm(f,0,-1)
    else raised(f,hO,false) end
    face(f,{smile=true})
    return f
  end
  add(2,mk("half")); add(2,mk("up",0)); add(2,mk("up",2)); add(2,mk("up",0)); add(2,mk("up",2)); add(2,mk("half2"))
end

-- fila 2: teclear (4)
do
  local function mk(ox,oy)
    local f=body({}); arm(f,ox,oy); face(f,{}); return f
  end
  add(3,mk(1,-1)); add(3,mk(0,0)); add(3,mk(0,1)); add(3,mk(1,0))
end

-- fila 3: celebrar (6)
do
  local function mk(o)
    local f=body({sq=o.sq,air=o.air})
    local dy=o.sq==1 and 1 or 0
    if o.up then raised(f,o.hO or 1,true,13+dy); farArm(f,dy-0)
    else arm(f,0,o.oy or 0) end
    face(f,{happy=true,fdy=dy})
    return f
  end
  add(4,mk({sq=1,oy=1}))
  add(4,mk({air=1,up=true,hO=1}))
  add(4,mk({air=2,up=true,hO=1}))
  add(4,mk({air=1,up=true,hO=1}))
  add(4,mk({sq=1,oy=0,up=false}))
  add(4,mk({up=true,hO=1}))
end

-- fila 4: molesto (4)
do
  local function mk(dx,b)
    local f=body({dx=dx,b=b}); armDown2(f,0)
    face(f,{angry=true,fdx=dx,fdy=b})
    return f
  end
  add(5,mk(-1,0)); add(5,mk(0,1)); add(5,mk(1,0)); add(5,mk(0,1))
end

-- ===================== hoja
local sheet=Image(192,190)
for r=1,5 do for i,im in ipairs(FR[r]) do sheet:drawImage(im,Point((i-1)*32,(r-1)*38)) end end

local function savePNG(img,path) local s=Sprite(img.width,img.height); s.cels[1].image:drawImage(img,Point(0,0)); s:saveAs(path); s:close() end
savePNG(sheet,ROOT.."public/assets/img/characters/cajero-extra.png")

-- fuente .aseprite: un frame por pose, etiquetas por fila
local names={"reposo","saludar","teclear","celebrar","molesto"}
local total=0; for r=1,5 do total=total+#FR[r] end
local spr=Sprite(32,38)
for i=2,total do spr:newFrame(spr.frames[#spr.frames]) end
spr.layers[1].name="tendero-d2-extra"
for _,c in ipairs(spr.cels) do spr:deleteCel(c) end
local k=0
for r=1,5 do
  local a=k+1
  for _,im in ipairs(FR[r]) do k=k+1; spr:newCel(spr.layers[1],k,copyimg(im),Point(0,0)); spr.frames[k].duration=0.15 end
  local t=spr:newTag(a,k); t.name=names[r]
end
spr:saveAs(ROOT.."assets-src/cajero-extra.aseprite")
print("ok")
