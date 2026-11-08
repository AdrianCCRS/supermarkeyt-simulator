local L=dofile("/home/adrianccrs/Documents/Dev/PHP/supermarket-simulator/assets-src/scripts/lua/lib.lua")
local o=L.new(160,64)
-- pared base
o:rect(0,0,160,64,"e8b796")
for x=7,159,16 do o:rect(x,4,1,54,"c28569") end   -- juntas de panel muy suaves
-- cenefa (toldo rojo/crema) filas 0..3
o:rect(0,0,160,4,"181425")
for x=0,159 do
  local red=(math.floor(x/5)%2==0)
  o:px(x,1,red and "e43b44" or "ead4aa")
  o:px(x,2,red and "be4a2f" or "e8b796")
end
-- modulos
local mods={{0,"M1"},{55,"M2"},{110,"M3"}}
for _,m in ipairs(mods) do
  local mx=m[1]
  o:rect(mx,3,50,55,"181425")           -- contorno
  o:rect(mx+1,4,48,53,"3a4466")         -- fondo
  o:rect(mx+1,4,48,1,"e4a672")          -- riel superior
  o:rect(mx+1,5,48,1,"b86f50")
  o:rect(mx+1,5,1,52,"262b44")          -- sombra lateral izq
  for k=0,2 do
    local yb=21+18*k
    if k<2 then
      o:rect(mx+1,yb+3,48,2,"262b44")   -- sombra bajo la balda
    end
  end
end
-- iconos (primero fondo, luego baldas y despues iconos para que apoyen)
local function board(mx,yb)
  o:rect(mx+1,yb,48,1,"e4a672"); o:rect(mx+1,yb+1,48,1,"b86f50"); o:rect(mx+1,yb+2,48,1,"733e39")
end
for _,m in ipairs(mods) do for k=0,2 do board(m[1],21+18*k) end end
local ROWS={
 {x=1,{"bebidas/soda_coke","bebidas/soda_fanta","bebidas/soda_pepsi","bebidas/soda_sprite"},
      {"bebidas/soymilk_almond","bebidas/soymilk_banana","bebidas/soymilk_choco","bebidas/soymilk_chocomint"},
      {"bebidas/soymilk_coffee","bebidas/soymilk_mango","bebidas/soymilk_match","bebidas/soymilk_peach"}},
 {x=56,{"frutas-verduras/fruit_apple","frutas-verduras/fruit_orange","frutas-verduras/fruit_banana"},
      {"frutas-verduras/fruit_strawberry","frutas-verduras/fruit_peach","frutas-verduras/fruit_watermelon"},
      {"frutas-verduras/vegetable_tomato","frutas-verduras/vegetable_carrot","frutas-verduras/vegetable_corn"}},
 {x=111,{"lacteos-huevos/eggs_white","lacteos-huevos/eggs_brown","bebidas/soymilk_soy","bebidas/soymilk_strawberry"},
      {"helados/icecream_1scoop","helados/icecream_2scoops","helados/icecream_3scoops","despensa/canned_soup"},
      {"panaderia-postres/pastry_croissant","panaderia-postres/cake_strawberry","panaderia-postres/pastry_baguette"}},
}
-- zocalo: filas 58..63
o:rect(0,57,160,1,"e4a672")
for x=0,159 do local m=false; for _,mm in ipairs(mods) do if x>=mm[1] and x<mm[1]+50 then m=true end end if not m then o:px(x,57,"c28569") end end
o:rect(0,58,160,1,"e4a672"); o:rect(0,59,160,3,"b86f50"); o:rect(0,62,160,1,"733e39"); o:rect(0,63,160,1,"181425")
for x=15,159,32 do o:rect(x,59,1,3,"733e39"); o:rect(x+1,59,1,3,"e4a672") end
for _,mod in ipairs(ROWS) do
  for k=1,3 do o:row(mod.x,mod.x+47,21+18*(k-1),mod[k],"pared") end
end
-- lamparas
local lamp={"..c..","..c..","..K..",".KRK.","KRDRK","KKKKK",".YWY.","..Y.."}
local lg={c="5a6988",K="181425",R="e43b44",D="a22633",Y="feae34",W="fee761"}
o:rows(50,4,lamp,lg); o:rows(105,4,lamp,lg)
o:save(L.ROOT.."public/assets/img/tienda/pared-estanterias.png")
L.dumpPlaced("pared_placed.txt")
print("ok",#L.placed)
