local L=dofile("/home/adrianccrs/Documents/Dev/PHP/supermarket-simulator/assets-src/scripts/lua/lib.lua")
local o=L.new(44,60)
local ox,oy=56,72
-- tapa superior (cara de arriba) y 0..9
o:rect(2,0,40,10,"181425")
o:rect(3,1,38,8,"e4a672")
o:rect(3,1,38,1,"fee761")           -- brillo arriba-izq
o:rect(3,1,1,8,"fee761")
o:rect(4,8,37,1,"b86f50")           -- borde frontal de la tapa
o:rect(40,2,1,7,"b86f50")
for x=9,38,10 do o:rect(x,2,1,6,"b86f50") end   -- juntas de tablas
o:px(2,0,""); o:px(41,0,"")
-- cartelito de oferta (lateral derecho de la tapa, sin texto)
o:rows(33,0,{
 "..KKKKKKKK.",
 ".KeeeeeeeeK",
 "KefeeeeeeeK",
 "KefeeYYeeeK",
 "KefeeYYeeeK",
 "KeeeeeeeeDK",
 ".KDDDDDDDK.",
 "..KKKKKKK..",
},{K="181425",e="e43b44",f="f6757a",D="a22633",Y="fee761"})
-- cara frontal y 10..59
o:rect(0,9,44,51,"181425")
o:rect(1,10,42,49,"3a4466")
o:rect(1,10,42,1,"e4a672"); o:rect(1,11,42,1,"b86f50")   -- riel superior
o:rect(1,12,1,47,"262b44")
local function board(yb) o:rect(1,yb,42,1,"e4a672"); o:rect(1,yb+1,42,1,"b86f50"); o:rect(1,yb+2,42,1,"733e39") end
board(25); board(41); board(57)
o:rect(0,59,44,1,"181425"); o:rect(1,58,42,1,"733e39")
local R={
 {"despensa/jam_strawberry","despensa/jam_blueberry","despensa/jam_grape"},
 {"despensa/jam_kiwi","despensa/jam_peach","lacteos-huevos/cheese_gouda"},
 {"lacteos-huevos/cheese_blue","frutas-verduras/fruit_lime","lacteos-huevos/eggs_softboiled"},
}
for k=1,3 do o:row(1,42,25+16*(k-1),R[k],"expo",ox,oy) end
o:save(L.ROOT.."public/assets/img/tienda/expositor.png")
L.dumpPlaced("expo_placed.txt")
print("ok")
