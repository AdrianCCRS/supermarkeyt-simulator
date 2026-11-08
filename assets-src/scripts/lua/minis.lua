local L=dofile("/home/adrianccrs/Documents/Dev/PHP/supermarket-simulator/assets-src/scripts/lua/lib.lua")
local K="181425"
local OUT=L.ROOT.."public/assets/img/tienda/"
-- ===== mini-escaner 48x28 (2 frames 24x28)
do
  local o=L.new(48,28)
  for f=0,1 do
    local x0=f*24
    o:rect(x0,0,24,28,K)
    o:rect(x0+1,1,22,26,"8b9bb4")
    o:rect(x0+1,1,22,2,"c0cbdc"); o:rect(x0+1,1,2,26,"c0cbdc")
    o:rect(x0+21,3,2,24,"5a6988"); o:rect(x0+3,25,19,2,"5a6988")
    for _,p in ipairs{{0,0},{23,0},{0,27},{23,27}} do o:px(x0+p[1],p[2],"") end
    o:rect(x0+4,4,16,18,K); o:rect(x0+5,5,14,16,"193c3e")      -- cristal
    o:rect(x0+5,5,14,1,"262b44")
    o:rect(x0+4,24,6,1,"262b44"); o:rect(x0+14,24,6,1,"262b44")   -- ranuras
    if f==1 then
      o:rect(x0+5,13,14,1,"e43b44")                              -- laser
      o:rect(x0+7,9,1,1,"2ce8f5"); o:rect(x0+8,8,2,1,"2ce8f5"); o:rect(x0+14,9,1,1,"2ce8f5"); o:rect(x0+15,8,2,1,"2ce8f5")
      o:px(x0+20,2,"63c74d")
    end
  end
  o:save(OUT.."mini-escaner.png")
end
-- ===== mini-balanza 20x18
do
  local o=L.new(20,18)
  o:rect(2,0,16,8,K); o:rect(3,1,14,6,"8b9bb4"); o:rect(3,1,14,1,"c0cbdc"); o:rect(3,1,1,6,"c0cbdc"); o:rect(16,2,1,5,"5a6988"); o:rect(4,6,13,1,"5a6988")
  o:rect(4,2,12,4,"193c3e")
  -- plato
  o:rect(3,8,14,8,K); o:rect(4,9,12,6,"8b9bb4"); o:rect(4,9,12,1,"c0cbdc"); o:rect(4,9,1,6,"c0cbdc")
  o:rect(15,10,1,5,"5a6988"); o:rect(5,14,10,1,"5a6988"); o:rect(6,11,5,1,"c0cbdc")
  o:rect(5,16,10,2,K); o:rect(6,16,8,1,"5a6988")
  for _,p in ipairs{{3,8},{16,8}} do o:px(p[1],p[2],"") end
  o:px(3,8,K); o:px(16,8,K)
  o:save(OUT.."mini-balanza.png")
end
-- ===== mini-caja 28x28
do
  local o=L.new(28,28)
  -- cartel rojo con pantalla
  o:rect(3,0,22,10,K); o:rect(4,1,20,8,"e43b44")
  o:rect(4,1,20,1,"f6757a"); o:rect(4,1,1,8,"f6757a"); o:rect(23,2,1,7,"a22633"); o:rect(5,8,18,1,"a22633")
  o:rect(7,2,14,5,"193c3e")
  -- cuello
  o:rect(12,10,4,2,K); o:rect(13,10,2,2,"8b9bb4")
  -- cuerpo crema
  o:rect(1,11,26,11,K); o:rect(2,12,24,9,"ead4aa")
  o:rect(2,12,24,1,"ffffff"); o:rect(2,12,1,9,"ffffff")
  o:rect(25,13,1,8,"e4a672"); o:rect(3,20,22,1,"e4a672")
  -- impresora gris a la izquierda
  o:rect(3,13,6,7,K); o:rect(4,14,4,5,"8b9bb4"); o:rect(4,14,4,1,"c0cbdc"); o:px(4,18,"63c74d"); o:px(6,18,"e43b44")
  o:rect(4,12,3,2,"ffffff")
  -- teclado
  o:rect(11,13,14,7,"b86f50"); o:frame(11,13,14,7,"733e39")
  for ky=0,1 do for kx=0,3 do o:rect(13+kx*3,14+ky*3,2,2,"e4a672") end end
  -- franja y cajon rojo
  o:rect(1,22,26,1,"be4a2f")
  o:rect(1,22,26,5,K); o:rect(2,23,24,3,"e43b44"); o:rect(2,23,24,1,"f6757a"); o:rect(2,25,24,1,"a22633")
  o:rect(11,24,6,1,K)                          -- ranura
  o:rect(12,25,4,2,"8b9bb4"); o:px(13,25,"c0cbdc")
  o:rect(3,27,4,1,K); o:rect(21,27,4,1,K)       -- patas
  o:save(OUT.."mini-caja.png")
end
-- ===== luz-carril 24x28
do
  local o=L.new(24,28)
  o:rect(9,0,6,1,K); o:rect(10,1,4,1,"8b9bb4")
  for y=1,3 do o:px(11,y,"c0cbdc"); o:px(12,y,"5a6988") end
  o:rect(3,4,18,16,K); o:rect(4,5,16,14,"0099db")
  o:rect(4,5,16,1,"2ce8f5"); o:rect(4,5,1,14,"2ce8f5")
  o:rect(19,6,1,13,"124e89"); o:rect(5,18,15,1,"124e89")
  o:rect(5,6,14,12,"193c3e")
  o:rect(10,20,4,2,K); o:rect(11,20,2,2,"0099db"); o:px(11,20,"2ce8f5")
  o:rows(6,22,{
   "..KKKKKKKK..",
   ".KhhbbbbbdK.",
   "KhbbbbbbbbdK",
   "KbbbbbbbbbdK",
   "KKKKKKKKKKKK"},{K=K,h="2ce8f5",b="0099db",d="124e89"})
  o:save(OUT.."luz-carril.png")
end
-- ===== cajero-izq 32x32: redibujado mirando a la izquierda (re-iluminado, sin brazo duplicado)
do
  local src=Image{fromFile=L.ROOT.."public/assets/img/characters/cajero.png"}
  local o=L.new(32,32)
  local function g(x,y) local p=src:getPixel(x,y); if app.pixelColor.rgbaA(p)==0 then return nil end
    return string.format("%02x%02x%02x",app.pixelColor.rgbaR(p),app.pixelColor.rgbaG(p),app.pixelColor.rgbaB(p)) end
  local swap={["63c74d"]="265c42",["265c42"]="63c74d",["5a6988"]="3a4466",["3a4466"]="5a6988",["e4a672"]="e4a672"}
  for y=0,31 do for x=0,31 do
    local c=g(x,y)
    -- quita la mano superior y el brazo extra (queda una mano sobre el mostrador)
    local drop=(x>=23 and y>=19 and y<=22 and not (y==22 and x<=27))
    if c and not drop then o:px(31-x,y,swap[c] or c) end
  end end
  -- re-ilumina la cara: sombra a la derecha, luz a la izquierda
  for y=5,15 do for x=9,22 do
    local p=o.img:getPixel(x,y)
    local hex=string.format("%02x%02x%02x",app.pixelColor.rgbaR(p),app.pixelColor.rgbaG(p),app.pixelColor.rgbaB(p))
    if app.pixelColor.rgbaA(p)>0 then
      if hex=="c28569" and x<=11 then o:px(x,y,"e8b796") end
      if hex=="e8b796" and x>=20 then o:px(x,y,"c28569") end
    end
  end end
  -- el pelo de atras pasa a la derecha: sombra
  o:save(OUT.."../characters/cajero-izq.png")
end
print("ok")
