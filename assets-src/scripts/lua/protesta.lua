-- Animacion de PROTESTA de los 4 clientes -> clientes-protesta.png (192x152, 6x4 de 32x38)
-- Parte de cliente-N.png (frame 0 neutral, frame 2 molesto). No modifica esos archivos.
local ROOT="/home/adrianccrs/Documents/Dev/PHP/supermarket-simulator/"
local CH=ROOT.."public/assets/img/characters/"
local pc=app.pixelColor
local function C(h) return pc.rgba(tonumber(h:sub(1,2),16),tonumber(h:sub(3,4),16),tonumber(h:sub(5,6),16),255) end
local K=C("181425"); local WH=C("ffffff"); local RD=C("a22633")
local function new(w,h) return Image(w or 32,h or 38) end
local function get(im,x,y) if x<0 or y<0 or x>=im.width or y>=im.height then return 0 end return im:getPixel(x,y) end
local function put(im,x,y,p) if x>=0 and y>=0 and x<im.width and y<im.height then im:drawPixel(x,y,p) end end
local function opaque(p) return pc.rgbaA(p)>0 end
local function blit(dst,src,dx,dy,x0,y0,x1,y1)
  for y=y0,y1 do for x=x0,x1 do local p=get(src,x,y); if opaque(p) then put(dst,x+dx,y+dy,p) end end end
end
local function blitrow(dst,src,sr,dr,x0,x1) for x=x0,x1 do local p=get(src,x,sr); if opaque(p) then put(dst,x,dr,p) end end end
local function savePNG(img,path)
  local s=Sprite(img.width,img.height); s.cels[1].image:drawImage(img,Point(0,0)); s:saveAs(path); s:close()
end
local function sheetFrame(sheet,i) local f=new(); blit(f,sheet,-32*i,0,32*i,0,32*i+31,37); return f end

local function legs(im,F,xa,xb,lift,b)
  local np=3-b-lift
  local y=31+b
  for i=0,np-1 do blitrow(im,F,31+math.min(i,2),y+i,xa,xb) end
  y=y+np
  for r=0,3 do blitrow(im,F,34+r,y+r,xa,xb) end
end
local function baseArm(im,F,xa,xb,b)
  for i,r in ipairs({20,21,22,23,24,25,26,27,28,29,30}) do blitrow(im,F,r,20+b+i-1,xa,xb) end
end

-- brazo doblado con puno arriba. side=-1 izquierdo, +1 derecho. fy = fila superior del puno.
local function bentArm(im,P,side,fy,ox,b)
  local sl,tl,h1,h2
  if side<0 then sl,tl,h1,h2=P.sL1,P.sL2,P.hL1,P.hL2 else sl,tl,h1,h2=P.sR1,P.sR2,P.hR1,P.hR2 end
  local function X(x) if side<0 then return x+ox else return 31-x-ox end end
  local function pt(x,y,c) put(im,X(x),y+b,c) end
  -- colores: izquierdo (outer luz), derecho espejado (outer sombra)
  local so,si,f3,f4,f5
  if side<0 then so,si=sl,tl; f3,f4,f5=h1,h1,h2 else so,si=tl,sl; f3,f4,f5=h2,h1,h1 end
  -- puno
  for x=3,5 do pt(x,fy-1,K) end
  for y=fy,fy+2 do pt(2,y,K); pt(6,y,K) end
  for y=fy,fy+1 do pt(3,y,f3); pt(4,y,f4); pt(5,y,f5) end
  local dk=(side<0) and h2 or h2
  pt(3,fy+2,dk); pt(4,fy+2,dk); pt(5,fy+2,dk)
  -- antebrazo
  pt(2,fy+3,K); pt(3,fy+3,K); pt(6,fy+3,K); pt(4,fy+3,so); pt(5,fy+3,si)
  for y=fy+4,20 do pt(3,y,K); pt(4,y,so); pt(5,y,si); pt(6,y,K) end
  -- codo / brazo superior (filas 21-22), contorno arriba en 20 (x7,8) y abajo en 23
  pt(7,20,K); pt(8,20,K)
  local top,bot
  if side<0 then top,bot=sl,tl else top,bot=sl,tl end
  pt(3,21,K); pt(3,22,K)
  for x=4,8 do pt(x,21,top); pt(x,22,bot) end
  for x=3,8 do pt(x,23,K) end
  -- si el antebrazo pasa por filas 21-22, ya esta cubierto por el codo
end

local function mouth(im,kind,b)
  local function p(x,y,c) put(im,x,y+b,c) end
  -- limpiar boca neutra (fila 15 x15-16) con el color de al lado
  local sk=get(im,14,15+b)
  if kind=="open" then
    for x=14,17 do p(x,14,K); p(x,16,K) end
    p(13,15,K); for x=14,17 do p(x,15,RD) end; p(18,15,K)
    p(15,15,C("e43b44")); p(16,15,C("e43b44"))
  else
    for x=14,17 do p(x,14,K); p(x,16,K) end
    p(13,15,K); for x=14,17 do p(x,15,WH) end; p(18,15,K)
  end
end

local MARK={"KK.KK","KrKrK",".KrK.","KrKrK","KK.KK"}
local function anger(im,x,y)
  local R=C("e43b44")
  for j,r in ipairs(MARK) do for i=1,#r do local c=r:sub(i,i)
    if c=="K" then put(im,x+i-1,y+j-1,K) elseif c=="r" then put(im,x+i-1,y+j-1,R) end end end
end

-- o: b, lL, lR, tilt, head("n"/"a"), mouth(nil/"open"/"grit"), fy (nil=brazos base), mark
local function build(n,F,A,P,ox,o)
  local im=new(); local b=o.b or 0
  legs(im,F,9,15,o.lL or 0,b); legs(im,F,16,22,o.lR or 0,b)
  blit(im,F,0,b,8,19,23,19); blit(im,F,0,b,9,20,22,30)
  if o.fy then
    bentArm(im,P,-1,o.fy,ox,b); bentArm(im,P,1,o.fy,ox,b)
  else
    baseArm(im,F,0,8,b); baseArm(im,F,23,31,b)
  end
  local H=(o.head=="a") and A or F
  local t=o.tilt or 0
  -- cabeza: filas 0-9 desplazadas t (inclinacion), resto fijo
  local hd=new()
  blit(hd,H,t,0,0,0,31,9); blit(hd,H,0,0,0,10,31,18)
  blit(im,hd,0,b,0,0,31,18)
  if o.mouth then mouth(im,o.mouth,b) end
  if o.mark then anger(im,0,0) end
  return im
end

local OX={0,0,0,1}
-- 6 frames: 1 neutra, 2-5 protesta, 6 vuelta
local SEQ={
 {b=0,lL=0,lR=0,tilt=0,head="n"},
 {b=0,lL=1,lR=0,tilt=-1,head="a",mouth="open",fy=12,mark=true},
 {b=1,lL=0,lR=0,tilt=-1,head="a",mouth="grit",fy=15,mark=true},
 {b=0,lL=0,lR=1,tilt=1,head="a",mouth="open",fy=12,mark=true},
 {b=1,lL=0,lR=0,tilt=1,head="a",mouth="grit",fy=15,mark=true},
 {b=0,lL=0,lR=0,tilt=0,head="a",mouth="grit",fy=17},
}
local out=new(192,152)
local frames={}
for n=1,4 do
  local sheet=Image{fromFile=CH.."cliente-"..n..".png"}
  local F=sheetFrame(sheet,0); local A=sheetFrame(sheet,2)
  local function p(x,y) return get(F,x,y) end
  local P={sL1=p(7,22),sL2=p(8,22),hL1=p(7,28),hL2=p(8,28),sR1=p(23,22),sR2=p(24,22),hR1=p(23,28),hR2=p(24,28)}
  frames[n]={}
  for i=1,6 do
    local f=build(n,F,A,P,OX[n],SEQ[i])
    out:drawImage(f,Point((i-1)*32,(n-1)*38))
    frames[n][i]=f
  end
end
savePNG(out,CH.."clientes-protesta.png")

-- fuente .aseprite: 24 frames, 1 capa, 4 etiquetas
local spr=Sprite(32,38)
app.transaction(function()
  spr.layers[1].name="clientes-protesta"
  for k=2,24 do spr:newFrame(spr.frames[#spr.frames]) end
end)
for _,cel in ipairs(spr.cels) do spr:deleteCel(cel) end
local k=0
for n=1,4 do for i=1,6 do k=k+1
  local im=new(); im:drawImage(frames[n][i],Point(0,0))
  spr:newCel(spr.layers[1],k,im,Point(0,0))
end end
for n=1,4 do local t=spr:newTag((n-1)*6+1,n*6); t.name="cliente-"..n end
for _,fr in ipairs(spr.frames) do fr.duration=0.12 end
spr:saveAs(ROOT.."assets-src/clientes-protesta.aseprite")
print("ok")
