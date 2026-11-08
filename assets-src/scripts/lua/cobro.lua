local ROOT="/home/adrianccrs/Documents/Dev/PHP/supermarket-simulator/"
local OUT=ROOT.."public/assets/img/caja/"
local pc=app.pixelColor
local function C(h) return pc.rgba(tonumber(h:sub(1,2),16),tonumber(h:sub(3,4),16),tonumber(h:sub(5,6),16),255) end
local K=C("181425")
local function new(w,h) return Image(w,h) end
local function get(im,x,y) if x<0 or y<0 or x>=im.width or y>=im.height then return 0 end return im:getPixel(x,y) end
local function put(im,x,y,p) if x>=0 and y>=0 and x<im.width and y<im.height then im:drawPixel(x,y,p) end end
local function opaque(p) return pc.rgbaA(p)>0 end
local function R(im,x,y,w,h,c) for j=y,y+h-1 do for i=x,x+w-1 do put(im,i,j,c) end end end
local function clear(im,x,y) put(im,x,y,0) end
local function outline(im,o)
  o=o or {}; local add={}
  for y=0,im.height-1 do for x=0,im.width-1 do
    if not opaque(get(im,x,y)) then
      local hit=false
      if o.top~=false and opaque(get(im,x,y+1)) then hit=true end
      if opaque(get(im,x,y-1)) or opaque(get(im,x-1,y)) or opaque(get(im,x+1,y)) then hit=true end
      if hit then add[#add+1]={x,y} end
    end
  end end
  for _,p in ipairs(add) do put(im,p[1],p[2],K) end
end
local function savePNG(img,path) local s=Sprite(img.width,img.height); s.cels[1].image:drawImage(img,Point(0,0)); s:saveAs(path); s:close() end
local W,CW,L1,L2,KK=C("ffffff"),C("c0cbdc"),C("5a6988"),C("8b9bb4"),K

-- ===================== TICKET
local LINES={ {{11,5},{17,7}}, {{11,8},{20,4}}, {{11,4},{16,3},{20,4}}, {{11,10}}, {{11,6},{18,6}}, {{11,3},{15,5},{21,3}}, {{11,9},{22,2}}, {{11,5},{17,4}} }
-- dibuja un ticket en im: x0 = borde izq (outline), w = ancho total, top = y de arranque, L largo total, nlines, total(bool), topOutline
local function ticket(im,x0,top,w,L,nl,total,topO,shine,sway)
  local t=new(im.width,im.height)
  local xi0,xi1=x0+1,x0+w-2
  for x=xi0,xi1 do
    local yf=top+L-2-((((x-xi0)//2)%2))
    for y=top,yf do put(t,x,y,W) end
    put(t,x,yf,CW)
  end
  for y=top,top+L-3 do put(t,xi1,y,CW) end
  outline(t,{top=topO})
  -- rayitas
  local sc=(w-2)/16
  for k=1,nl do
    local y=top+3+4*(k-1)
    local pat=LINES[((k-1)%#LINES)+1]
    local col=(k%2==1) and L1 or L2
    for _,s in ipairs(pat) do
      local sx=x0+(s[1]-9)*1; local len=s[2]
      if w<18 then len=math.max(1,math.floor(len*(w-2)/16)); sx=x0+1+math.floor((s[1]-10)*(w-2)/16) end
      for i=0,len-1 do if sx+i<xi1 then put(t,sx+i,y,col) end end
    end
  end
  if total then
    local y=top+3+4*8-1+ (L>=44 and 0 or 0)
    y=top+3+4*8+1
    for i=0,7 do put(t,x0+9+i,y,L1); put(t,x0+9+i,y+1,L1) end
    for i=0,2 do put(t,x0+2+i,y,L1) end
  end
  if shine then put(t,xi1,top+8,W) end
  if sway then for y=top+18,top+L-4 do put(t,xi1-1,y,CW) end end
  im:drawImage(t,Point(0,0))
end

local LEN={0,8,16,24,32,40,43,46,46,46}
local imp=new(360,60)
local frames={}
for f=1,10 do
  local fr=new(36,60)
  if f>=2 then
    local L=LEN[f]
    local nl=({0,1,3,5,7,8,8,8,8,8})[f]
    local total=(f>=7)
    ticket(fr,9,0,18,L,nl,total,false,f==9,f==10)
  end
  frames[f]=fr
  imp:drawImage(fr,Point((f-1)*36,0))
end
savePNG(imp,OUT.."recibo-imprimir.png")

-- recibo-arrancar
local arr=new(144,60)
do
  local a1=frames[10]
  arr:drawImage(a1,Point(0,0))
  -- 2: inclinado 1px y separado 2px
  local f2=new(36,60)
  for y=0,59 do for x=0,35 do
    local p=get(a1,x,y)
    if opaque(p) then put(f2,x+((y>=22) and 1 or 0),y+2,p) end
  end end
  arr:drawImage(f2,Point(36,0))
  -- 3: mas pequeno, subido y 6 px a la derecha
  local f3=new(36,60)
  ticket(f3,15,0,14,34,6,true,true,false,false)
  arr:drawImage(f3,Point(72,0))
end
savePNG(arr,OUT.."recibo-arrancar.png")

-- ===================== BILLETES
local bills=new(192,14)
local BC={
 {base="8b9bb4",lt="c0cbdc",sh="5a6988"},
 {base="b86f50",lt="e4a672",sh="733e39"},
 {base="e43b44",lt="f6757a",sh="a22633"},
 {base="f77622",lt="feae34",sh="be4a2f"},
 {base="b55088",lt="f6757a",sh="68386c"},
 {base="3e8948",lt="63c74d",sh="265c42"}}
for i,c in ipairs(BC) do
  local b=new(32,14)
  local base,lt,sh=C(c.base),C(c.lt),C(c.sh)
  R(b,0,0,32,14,K); R(b,1,1,30,12,base)
  R(b,1,1,30,1,lt); R(b,1,1,1,12,lt)
  R(b,2,12,30,1,sh); R(b,30,2,1,10,sh)
  for _,p in ipairs{{0,0},{31,0},{0,13},{31,13}} do clear(b,p[1],p[2]) end
  -- marco de la zona de texto
  R(b,7,3,18,1,sh); R(b,7,10,18,1,sh); R(b,7,3,1,8,sh); R(b,24,3,1,8,sh)
  R(b,8,4,16,6,lt)
  -- circulo a la izquierda
  R(b,3,4,3,1,lt); R(b,2,5,5,3,lt); R(b,3,8,3,1,lt)
  R(b,5,8,1,1,sh); R(b,6,7,1,1,sh)
  -- rayitas a la derecha
  R(b,26,5,4,1,sh); R(b,26,8,4,1,sh)
  bills:drawImage(b,Point((i-1)*32,0))
end
savePNG(bills,OUT.."billetes.png")

-- ===================== BANDEJA 144x30
local ban=new(144,30)
do
  local b1,b2,b3=C("3a4466"),C("5a6988"),C("262b44")
  R(ban,0,0,144,30,K)
  R(ban,1,1,142,28,b1)
  R(ban,1,1,142,1,b2); R(ban,1,1,1,26,b2)
  R(ban,2,27,141,2,b3); R(ban,142,2,1,26,b3)
  for _,p in ipairs{{0,0},{143,0},{0,29},{143,29}} do clear(ban,p[1],p[2]) end
  for _,x in ipairs{4,52,100} do
    R(ban,x,4,40,22,K); R(ban,x+1,5,38,20,b3)
    R(ban,x+1,24,38,1,b1); R(ban,x+38,5,1,20,b1)
    R(ban,x+1,5,38,1,K); R(ban,x+1,6,38,1,C("181425"))
  end
  -- divisores con brillo
  for _,x in ipairs{44,92} do R(ban,x,4,8,22,b1); R(ban,x,4,8,1,b2); R(ban,x+1,4,1,22,b2) end
  -- tornillos
  for _,p in ipairs{{2,2},{141,2}} do put(ban,p[1],p[2],K) end
end
savePNG(ban,OUT.."bandeja-efectivo.png")

-- ===================== LIBRO 144x68
local bk=new(144,68)
do
  local g1,g2,g3=C("3e8948"),C("265c42"),C("193c3e")
  local cr,cs=C("ead4aa"),C("e4a672")
  R(bk,0,0,144,68,K); R(bk,1,1,142,66,g2)
  R(bk,1,1,142,2,g1); R(bk,1,1,2,66,g1)
  R(bk,3,65,140,2,g3); R(bk,141,3,2,62,g3)
  for _,p in ipairs{{0,0},{143,0},{0,67},{143,67}} do clear(bk,p[1],p[2]) end
  -- paginas (y4..62) izquierda x5..68, derecha x75..138
  for _,pg in ipairs{{5,64},{75,64}} do
    local x=pg[1]
    R(bk,x-1,3,pg[2]+2,61,K)
    R(bk,x,4,pg[2],59,cr)
    R(bk,x,4,pg[2],1,W); R(bk,x,4,1,59,W)
    R(bk,x,61,pg[2],2,cs)
  end
  R(bk,66,5,3,56,cs); R(bk,75,5,3,56,cs)
  -- renglones: separacion de 26 px (2 por pagina)
  for _,x in ipairs{7,77} do R(bk,x,32,59,1,cs) end
  -- espiral central x70..73
  R(bk,69,3,6,61,K); R(bk,70,4,4,59,g3)
  for y=6,58,6 do R(bk,69,y,6,1,K); R(bk,69,y+1,6,2,CW); R(bk,69,y+3,6,1,L2); R(bk,69,y+4,6,1,K) end
  -- marcapaginas rojo
  R(bk,128,52,5,14,K); R(bk,129,52,3,13,C("e43b44")); R(bk,129,52,1,13,C("f6757a")); R(bk,131,52,1,13,C("a22633"))
  put(bk,130,64,K); put(bk,129,65,K); put(bk,131,65,K); put(bk,130,65,0); put(bk,130,64,C("a22633"))
end
savePNG(bk,OUT.."libro.png")

-- ===================== fuente .aseprite
do
  local spr=Sprite(360,252)
  local pieces={{"recibo-imprimir",imp,0,0},{"recibo-arrancar",arr,0,64},{"billetes",bills,0,128},{"bandeja-efectivo",ban,0,146},{"libro",bk,0,180}}
  for i,p in ipairs(pieces) do
    local layer=(i==1) and spr.layers[1] or spr:newLayer()
    layer.name=p[1]
    spr:newCel(layer,1,p[2],Point(p[3],p[4]))
  end
  spr:saveAs(ROOT.."assets-src/cobro.aseprite")
end
print("ok")
