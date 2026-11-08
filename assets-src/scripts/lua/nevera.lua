local L=dofile("/home/adrianccrs/Documents/Dev/PHP/supermarket-simulator/assets-src/scripts/lua/lib.lua")
local K="181425"
local o=L.new(24,120)
local ox,oy=40,150
-- carcasa de la nevera y0..75
o:rect(0,0,24,76,K)
o:rect(1,1,22,74,"3a4466")
o:rect(1,1,1,74,"5a6988"); o:rect(22,1,1,74,"262b44")      -- luz izq / lateral liso derecho
o:rect(2,1,20,1,"5a6988")
o:rect(1,73,22,2,"262b44")
-- cristal
o:rect(2,3,19,70,"c0cbdc")
o:rect(3,4,17,68,"193c3e")
-- baldas con iconos (2 por balda, bebidas): derecho primero, izquierdo delante
local pairsL={
 {"bebidas/soda_coke","bebidas/soda_fanta"},
 {"bebidas/soda_pepsi","bebidas/soda_sprite"},
 {"bebidas/soymilk_choco","bebidas/soymilk_mango"},
 {"bebidas/soymilk_peach","bebidas/soymilk_match"}}
for k=0,3 do
  local top=4+17*k
  local yb=top+15
  -- ranura de la balda
  local function put(n,x)
    local cat,nm=n:match("([^/]+)/(.+)")
    local path=L.ROOT.."assets-src/iconos-pack/"..cat.."/"..nm..".png"
    local im=Image{fromFile=path}; local bx0,by0,bx1,by1=L.bbox(im)
    local ix,iy=x-bx0,yb-by1
    o:blit(ix,iy,path)
    table.insert(L.placed,{nm,ix+ox*0,iy,"nevera"})
  end
  put(pairsL[k+1][2],8); put(pairsL[k+1][1],3)
  o:rect(3,top+16,17,1,"5a6988")
end
-- marco fino del cristal
o:rect(2,3,19,1,"c0cbdc"); o:rect(2,3,1,70,"c0cbdc")
o:rect(20,4,1,69,"8b9bb4"); o:rect(2,72,19,1,"8b9bb4")
-- reflejo diagonal solo sobre cristal vacio
for i=0,47 do
  local x,y=4+math.floor(i*0.3),6+i
  local p=o.img:getPixel(x,y)
  if p==L.col("193c3e") then o:px(x,y,"2ce8f5") end
end
-- piloto de luz
o:rect(18,1,3,1,"2ce8f5")
-- ===== mesa gris y76..119
o:rect(0,76,24,44,K)
o:rect(1,77,22,42,"8b9bb4")
o:rect(1,77,22,17,"c0cbdc")
o:rect(1,77,22,1,"ffffff"); o:rect(1,77,1,17,"ffffff")
o:rect(1,93,22,1,"8b9bb4"); o:rect(1,94,22,1,"5a6988")
o:rect(1,95,1,23,"c0cbdc")
o:rect(22,77,1,42,"5a6988"); o:rect(2,117,20,2,"5a6988")
-- bandeja de madera
o:rows(3,79,{
"KKKKKKKKKKKKKKKK",
"Keeeeeeeeeeeeeek",
"KebbbbbbbbbbbbdK",
"KebbbbbbbbbbbbdK",
"KebbbbbbbbbbbbdK",
"KdddddddddddddddK"},{K=K,e="e4a672",b="b86f50",d="733e39",k="b86f50"})
-- pantallita negra con boton gris
o:rows(5,86,{
"KKKKKKKKKK",
"K33333333K",
"K3KKKKKK3K",
"K3K5KKKK3K",
"K3KKKKKK3K",
"K33333333K",
"KKKKKKKKKK"},{K=K,["3"]="3a4466",["5"]="5a6988"})
o:rect(16,89,3,3,K); o:rect(17,90,1,1,"8b9bb4")
-- rejilla de compresor (4 ranuras)
o:rect(3,102,18,16,"5a6988"); o:frame(3,102,18,16,K)
for k=0,3 do o:rect(5,105+k*3,14,1,K); o:rect(5,106+k*3,14,1,"3a4466") end
o:save(L.ROOT.."public/assets/img/tienda/nevera-barrera.png")
L.dumpPlaced("nevera_placed.txt")
print("ok")
