-- Tendero "Tiendas D2": parte de assets-src/originales-cajero/cajero-izq.png (copia del original verde)
-- Ejecutar: aseprite -b --script assets-src/scripts/lua/cajero_d2.lua
local ROOT="/home/adrianccrs/Documents/Dev/PHP/supermarket-simulator/"
local pc=app.pixelColor
local function C(h) return pc.rgba(tonumber(h:sub(1,2),16),tonumber(h:sub(3,4),16),tonumber(h:sub(5,6),16),255) end
local function hex(p) return string.format("%02x%02x%02x",pc.rgbaR(p),pc.rgbaG(p),pc.rgbaB(p)) end
local K=C("181425")
local function get(im,x,y) if x<0 or y<0 or x>=im.width or y>=im.height then return 0 end return im:getPixel(x,y) end
local function put(im,x,y,p) if x>=0 and y>=0 and x<im.width and y<im.height then im:drawPixel(x,y,p) end end
local function opaque(p) return pc.rgbaA(p)>0 end
local function span(im,y,x0,x1,c) for x=x0,x1 do put(im,x,y,c) end end
local function ascii(im,x,y,rows,leg)
  for j,r in ipairs(rows) do for i=1,#r do local ch=r:sub(i,i); if ch~="." then put(im,x+i-1,y+j-1,leg[ch]) end end end
end
local function blit(dst,src,dy,y0,y1) for y=y0,y1 do for x=0,31 do local p=get(src,x,y); if opaque(p) then put(dst,x,y+dy,p) end end end end
local function copyimg(s) local d=Image(s.width,s.height); d:drawImage(s,Point(0,0)); return d end

local O=Image{fromFile=ROOT.."assets-src/originales-cajero/cajero-izq.png"}
local f=copyimg(O)

-- ===== cabeza: fuera gorra y visera, pelo con tupe
for y=0,8 do span(f,y,0,31,0) end
span(f,9,3,8,0)
local Hh,Hb,Hs=C("733e39"),C("3e2731"),C("262b44")
local rows={ -- y, x0,x1, x fin luz, x ini sombra
 {1,12,17,15,99},{2,10,20,14,19},{3,9,21,13,20},{4,9,22,11,20},
 {5,10,22,10,20},{6,10,22,10,20},{7,10,22,10,20},{8,10,22,10,20}}
for _,r in ipairs(rows) do
  local y,x0,x1,hl,sh=r[1],r[2],r[3],r[4],r[5]
  for x=x0,x1 do put(f,x,y,(x<=hl and y<=4) and Hh or ((x>=sh) and Hs or Hb)) end
end
-- flequillo sobre la frente (lado delantero)
span(f,9,10,12,Hb); put(f,10,9,Hh)
-- contorno de la zona de pelo (filas 0..8)
local add={}
for y=0,8 do for x=0,31 do
  if not opaque(get(f,x,y)) then
    if opaque(get(f,x,y+1)) or opaque(get(f,x,y-1)) or opaque(get(f,x-1,y)) or opaque(get(f,x+1,y)) then add[#add+1]={x,y} end
  end
end end
for _,p in ipairs(add) do put(f,p[1],p[2],K) end
-- pelo trasero (antes marron) -> oscuro
for y=9,15 do for x=19,22 do
  local h=hex(get(f,x,y))
  if h=="733e39" then put(f,x,y,Hb) elseif h=="3e2731" then put(f,x,y,Hs) end
end end
-- barba corta: mejillas, barbilla y mandibula
span(f,14,10,11,Hb); span(f,14,18,19,Hb)
span(f,15,9,20,Hb)
span(f,16,10,21,Hs)

-- ===== cuerpo y ropa (a partir de la fila 19, x>=4)
local MAP={["63c74d"]="f6757a",["3e8948"]="e43b44",["265c42"]="a22633",
 ["5a6988"]="3a4466",["3a4466"]="262b44",["8b9bb4"]="262b44"}
for y=19,37 do for x=4,31 do
  local p=get(f,x,y)
  if opaque(p) then
    local h=hex(p)
    if h=="ffffff" or h=="c0cbdc" then
      if y>=34 then put(f,x,y,C("3e2731"))
      else put(f,x,y,(x>=19) and C("a22633") or C("e43b44")) end
    elseif MAP[h] then put(f,x,y,C(MAP[h])) end
  end
end end
span(f,30,10,21,C("a22633"))            -- dobladillo
-- manga corta: antebrazo con piel, manga roja en x7-8
span(f,26,4,6,C("e8b796")); span(f,27,4,6,C("e8b796")); span(f,28,4,6,C("c28569"))
span(f,26,7,8,C("a22633")); span(f,27,7,8,C("e43b44")); span(f,28,7,8,C("e43b44"))
-- cordon amarillo y credencial (filas 19..25); fila 20 se descarta en la respiracion
local Y,W,L=C("fee761"),C("ffffff"),C("c0cbdc")
put(f,12,19,Y); put(f,16,19,Y); put(f,13,20,Y); put(f,15,20,Y); put(f,14,21,Y)
ascii(f,13,22,{"WWW","WWW","WWW","LLL"},{W=W,L=L})
-- logo D2 en el pecho (4x4)
ascii(f,17,21,{".WW.","WYBW","WWWW",".LL."},{W=W,L=L,Y=C("fee761"),B=C("124e89")})

-- ===== frames
local BILL={K=K,e=C("ead4aa"),g=C("63c74d")}
local BILLR={"KKKKKKKK","KgeeeegK","KgeeeegK","KKKKKKKK"}
local out=Image(128,38)
local f1=copyimg(f)
local f2=Image(32,38); blit(f2,f,1,0,19); blit(f2,f,0,21,37)
local sk1,sk2=C("e8b796"),C("c28569")
local f3=copyimg(f)
for y=22,30 do for x=0,3 do f3:drawPixel(x,y,0) end end
ascii(f3,0,24,{".KK.","KddK","KddK","KdhK","KdhK","KhhK","KKKK"},{K=K,d=sk1,h=sk2})
local f4=copyimg(f)
ascii(f4,0,22,BILLR,BILL)
local fr={f1,f2,f3,f4}
for i,im in ipairs(fr) do out:drawImage(im,Point((i-1)*32,0)) end

local function savePNG(img,path) local s=Sprite(img.width,img.height); s.cels[1].image:drawImage(img,Point(0,0)); s:saveAs(path); s:close() end
savePNG(f1,ROOT.."public/assets/img/characters/cajero-izq.png")
savePNG(out,ROOT.."public/assets/img/characters/cajero-anim.png")

-- fuente .aseprite: capa "tendero-d2", 4 frames, etiqueta cajero_anim
local spr=Sprite(32,38)
for i=2,4 do spr:newFrame(spr.frames[#spr.frames]) end
spr.layers[1].name="tendero-d2"
for _,c in ipairs(spr.cels) do spr:deleteCel(c) end
for i,im in ipairs(fr) do spr:newCel(spr.layers[1],i,copyimg(im),Point(0,0)); spr.frames[i].duration=0.2 end
local t=spr:newTag(1,4); t.name="cajero_anim"
spr:saveAs(ROOT.."assets-src/cajero-d2.aseprite")
print("ok")
